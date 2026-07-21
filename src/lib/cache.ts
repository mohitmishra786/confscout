import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Conference, ConferenceData } from '@/types/conference';
import { prisma } from '@/lib/prisma';
import { cacheLogger } from '@/lib/logger';
import { getRedisClient } from '@/lib/redis';

const CACHE_KEY = 'confscout:v1:conferences:en'; // Versioned and locale-specific cache key

// 24-hour TTL.  The data-ingestion workflow runs daily and calls
// POST /api/cache/invalidate immediately after writing new data, so in
// practice the cache is replaced well before expiry.  The 24 h TTL is a
// safety-net: if a workflow run is skipped or fails, Redis still flushes the
// entry eventually so stale data never lives longer than one day.
const CACHE_TTL = 24 * 60 * 60; // seconds (used for Redis `ex` option)

// Within the TTL window all data is considered fresh — the workflow is the
// sole authority on when data becomes stale, not a time-based threshold.
// We keep STALE_MAX_AGE equal to the TTL so any cached entry is served
// without background revalidation; revalidation only fires when the
// entry is truly near-expiry (age > TTL).
const STALE_MAX_AGE = CACHE_TTL * 2 * 1000; // ms — 48 h, beyond TTL as fallback

export interface CachedData {
  data: ConferenceData;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// In-process request deduplication
// ---------------------------------------------------------------------------
// On a Vercel warm instance multiple concurrent requests can all miss Redis
// simultaneously and each kick off a DB query (thundering-herd on cold-start).
// We gate the DB fetch behind a single shared promise so only one query runs
// per instance at a time.
let inflightRevalidation: Promise<ConferenceData> | null = null;

// ---------------------------------------------------------------------------
// Shared DB → Conference mapper (single source of truth, no duplication)
// ---------------------------------------------------------------------------
type DbConference = {
  id: string;
  name: string;
  url: string;
  startDate: Date | null;
  endDate: Date | null;
  city: string | null;
  country: string | null;
  locationRaw: string | null;
  lat: number | null;
  lng: number | null;
  online: boolean;
  cfpUrl: string | null;
  cfpEndDate: Date | null;
  cfpStatus: string | null;
  domain: string;
  description: string | null;
  source: string;
  tags: string[];
  financialAid: unknown;
};

function mapDbConference(c: DbConference): Conference {
  return {
    id: c.id,
    name: c.name,
    url: c.url,
    startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : null,
    endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : null,
    location: {
      city: c.city || '',
      country: c.country || '',
      raw: c.locationRaw || '',
      lat: c.lat ?? undefined,
      lng: c.lng ?? undefined,
    },
    online: c.online,
    cfp: {
      url: c.cfpUrl || '',
      endDate: c.cfpEndDate ? c.cfpEndDate.toISOString().split('T')[0] : null,
      status: (c.cfpStatus as 'open' | 'closed' | undefined),
    },
    domain: c.domain,
    description: c.description ?? undefined,
    source: c.source,
    tags: c.tags,
    // Prisma Json fields are already plain JS values — the
    // JSON.parse(JSON.stringify()) deep clone was a no-op with real cost.
    financialAid: (c.financialAid ?? undefined) as Conference['financialAid'],
  };
}

// ---------------------------------------------------------------------------
// Prisma select — matches DbConference type exactly
// ---------------------------------------------------------------------------
const CONFERENCE_SELECT = {
  id: true,
  name: true,
  url: true,
  startDate: true,
  endDate: true,
  city: true,
  country: true,
  locationRaw: true,
  lat: true,
  lng: true,
  online: true,
  cfpUrl: true,
  cfpEndDate: true,
  cfpStatus: true,
  domain: true,
  description: true,
  source: true,
  tags: true,
  financialAid: true,
} as const;

// ---------------------------------------------------------------------------
// Helper: group flat array into ConferenceData shape
// ---------------------------------------------------------------------------
function formatConferenceData(conferences: Conference[]): ConferenceData {
  const months: Record<string, Conference[]> = {};
  const byDomain: Record<string, number> = {};
  let withOpenCFP = 0;
  let withLocation = 0;

  for (const conf of conferences) {
    byDomain[conf.domain] = (byDomain[conf.domain] || 0) + 1;
    if (conf.cfp && conf.cfp.status === 'open') withOpenCFP++;
    if (conf.location && conf.location.lat) withLocation++;

    const monthKey = conf.startDate
      ? new Date(conf.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'TBD';

    if (!months[monthKey]) months[monthKey] = [];
    months[monthKey].push(conf);
  }

  return {
    lastUpdated: new Date().toISOString(),
    stats: { total: conferences.length, withOpenCFP, withLocation, byDomain },
    months,
  };
}

// ---------------------------------------------------------------------------
// Core DB fetch (shared by getCachedConferences and revalidateCache)
// ---------------------------------------------------------------------------
async function fetchFromDb(): Promise<Conference[]> {
  cacheLogger.time('dbFetch');
  const dbConfs = await Promise.race([
    prisma.conference.findMany({
      select: CONFERENCE_SELECT,
      orderBy: { startDate: 'asc' },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout after 10s')), 10000)
    ),
  ]);
  cacheLogger.timeEnd('dbFetch');
  cacheLogger.info('Fetched conferences from database', { count: dbConfs.length });
  return dbConfs.map(mapDbConference);
}

// ---------------------------------------------------------------------------
// File fallback — async to avoid blocking the Node.js event loop
// ---------------------------------------------------------------------------
async function fetchFromFile(): Promise<Conference[]> {
  const filePath = join(process.cwd(), 'public/data/conferences.json');
  // Previously used synchronous readFileSync which blocks the event loop
  // for the full JSON parse duration (~10–50 ms on large files).
  // fs.promises.readFile is non-blocking.
  const fileData = await readFile(filePath, 'utf8');
  const jsonData = JSON.parse(fileData) as { months?: Record<string, Conference[]>; conferences?: Conference[] };
  if (jsonData.months) {
    return Object.values(jsonData.months).flat() as Conference[];
  }
  return (jsonData.conferences ?? []) as Conference[];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function getCachedConferences(): Promise<ConferenceData> {
  const redisClient = getRedisClient();

  try {
    cacheLogger.info('Starting getCachedConferences');

    // 1. Try Redis (stale-while-revalidate)
    if (redisClient) {
      cacheLogger.info('Checking Redis cache');
      const cached = await redisClient.get<CachedData>(CACHE_KEY);

      if (cached) {
        const age = Date.now() - cached.timestamp;
        const isStale = age > CACHE_TTL * 1000;

        if (!isStale) {
          // Fresh — return immediately, no DB touch
          cacheLogger.info('Returning fresh cached data from Redis', {
            months: Object.keys(cached.data.months).length,
            total: cached.data.stats.total,
          });
          return cached.data;
        }

        if (age < STALE_MAX_AGE) {
          // Stale-but-usable — serve immediately, revalidate in background.
          // Use the in-process deduplication guard so only one concurrent
          // revalidation runs per Vercel instance (prevents thundering herd).
          cacheLogger.info('Returning stale cached data, revalidating in background');
          if (!inflightRevalidation) {
            inflightRevalidation = revalidateCache()
              .catch((err: unknown) => {
                cacheLogger.error('Background revalidation failed', err);
                return cached.data; // type-safe fallback
              })
              .finally(() => {
                inflightRevalidation = null;
              });
          }
          return cached.data;
        }
      }

      cacheLogger.info('Redis cache miss or too stale — fetching fresh data');
    } else {
      cacheLogger.info('Redis not available, skipping');
    }

    // 2. If another request on this instance is already doing a DB fetch,
    //    wait for it instead of firing a second concurrent query.
    if (inflightRevalidation) {
      cacheLogger.info('Reusing in-flight DB fetch');
      return inflightRevalidation;
    }

    // 3. DB fetch (with in-process dedup)
    inflightRevalidation = (async () => {
      let conferences: Conference[] = [];

      try {
        conferences = await fetchFromDb();
      } catch (dbError: unknown) {
        cacheLogger.error('Database fetch failed, falling back to file', dbError);
      }

      // 4. File fallback if DB is empty or failed
      if (conferences.length === 0) {
        cacheLogger.info('Using file fallback');
        try {
          conferences = await fetchFromFile();
          cacheLogger.info('Loaded conferences from file', { count: conferences.length });
        } catch (fileError: unknown) {
          cacheLogger.error('File fallback also failed', fileError);
        }
      }

      const formattedData = formatConferenceData(conferences);

      // 5. Populate Redis for the next request
      if (redisClient) {
        redisClient
          .set(CACHE_KEY, { data: formattedData, timestamp: Date.now() }, { ex: CACHE_TTL })
          .then(() => cacheLogger.info('Updated Redis cache'))
          .catch((err: unknown) => cacheLogger.error('Failed to update Redis cache', err));
      }

      cacheLogger.info('Returning formatted data', {
        months: Object.keys(formattedData.months).length,
        total: formattedData.stats.total,
      });
      return formattedData;
    })().finally(() => {
      inflightRevalidation = null;
    });

    return inflightRevalidation;
  } catch (error: unknown) {
    cacheLogger.error('Critical cache error, using file fallback', error);
    // Async ultimate fallback
    try {
      const filePath = join(process.cwd(), 'public/data/conferences.json');
      const fileData = await readFile(filePath, 'utf8');
      return JSON.parse(fileData) as ConferenceData;
    } catch {
      // Return empty shell so the page renders rather than crashes
      return { lastUpdated: new Date().toISOString(), stats: { total: 0, withOpenCFP: 0, withLocation: 0, byDomain: {} }, months: {} };
    }
  }
}

// ---------------------------------------------------------------------------
// Cache management utilities
// ---------------------------------------------------------------------------
export async function invalidateCache(): Promise<void> {
  const redisClient = getRedisClient();
  if (!redisClient) {
    cacheLogger.warn('Redis not available, cannot invalidate cache');
    return;
  }
  try {
    await redisClient.del(CACHE_KEY);
    cacheLogger.info('Cache invalidated');
  } catch (error: unknown) {
    cacheLogger.error('Failed to invalidate cache', error);
  }
}

export async function warmCache(): Promise<void> {
  try {
    cacheLogger.info('Warming cache...');
    await getCachedConferences();
    cacheLogger.info('Cache warmed successfully');
  } catch (error: unknown) {
    cacheLogger.error('Failed to warm cache', error);
  }
}

/**
 * Background revalidation for stale-while-revalidate pattern.
 * Fetches fresh DB data and writes it to Redis.
 */
async function revalidateCache(): Promise<ConferenceData> {
  const redisClient = getRedisClient();

  cacheLogger.info('Background revalidation started');
  const conferences = await fetchFromDb();
  const formattedData = formatConferenceData(conferences);

  if (redisClient) {
    await redisClient.set(
      CACHE_KEY,
      { data: formattedData, timestamp: Date.now() },
      { ex: CACHE_TTL }
    );
  }

  cacheLogger.info('Background revalidation completed');
  return formattedData;
}
