import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Conference, ConferenceData } from '@/types/conference';
import { prisma } from '@/lib/prisma';
import { cacheLogger } from '@/lib/logger';

const CACHE_KEY = 'confscout:v1:conferences:en'; // Versioned and locale-specific cache key
const CACHE_TTL = 3600; // 1 hour

// Initialize Redis client lazily
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = Redis.fromEnv();
      cacheLogger.info('Redis client initialized');
      return redis;
    }
    cacheLogger.warn('Upstash Redis environment variables missing');
    return null;
  } catch (error) {
    cacheLogger.error('Failed to initialize Redis client', error);
    return null;
  }
}

export interface CachedData {
  data: ConferenceData;
  timestamp: number;
}

// Helper to transform flat array to monthly grouped data
function formatConferenceData(conferences: Conference[]): ConferenceData {
  const months: Record<string, Conference[]> = {};
  const byDomain: Record<string, number> = {};
  let withOpenCFP = 0;
  let withLocation = 0;

  for (const conf of conferences) {
    // Stats
    byDomain[conf.domain] = (byDomain[conf.domain] || 0) + 1;
    if (conf.cfp && conf.cfp.status === 'open') withOpenCFP++;
    if (conf.location && conf.location.lat) withLocation++;

    // Grouping
    const monthKey = conf.startDate
      ? new Date(conf.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'TBD';
    
    if (!months[monthKey]) months[monthKey] = [];
    months[monthKey].push(conf);
  }

  // Sort months logic if needed, but keys are string. Frontend usually iterates or sorts.
  // Actually the frontend sorts them.

  return {
    lastUpdated: new Date().toISOString(),
    stats: {
      total: conferences.length,
      withOpenCFP,
      withLocation,
      byDomain
    },
    months
  };
}

export async function getCachedConferences(): Promise<ConferenceData> {
  const redisClient = getRedisClient();
  
  try {
    cacheLogger.info('Starting getCachedConferences');
    
    // 1. Try Redis with Stale-While-Revalidate pattern
    if (redisClient) {
      cacheLogger.info('Checking Redis cache');
      const cached = await redisClient.get<CachedData>(CACHE_KEY);
      
      if (cached) {
        const age = Date.now() - cached.timestamp;
        const isStale = age > CACHE_TTL * 1000;
        
        if (!isStale) {
          // Fresh cache - return immediately
          cacheLogger.info('Returning fresh cached data from Redis', { 
            months: Object.keys(cached.data.months).length,
            total: cached.data.stats.total 
          });
          return cached.data;
        } else if (age < CACHE_TTL * 2000) {
          // Stale but acceptable - return cached data and revalidate in background
          cacheLogger.info('Returning stale cached data, revalidating in background');
          
          // Background revalidation (fire and forget)
          revalidateCache().catch((err: unknown) => 
            cacheLogger.error('Background revalidation failed', err)
          );
          
          return cached.data;
        }
      }
      cacheLogger.info('Redis cache miss or too stale');
    } else {
      cacheLogger.info('Redis not available, skipping');
    }
    
    // 2. Try Database with optimized query
    cacheLogger.info('Attempting database fetch');
    let conferences: Conference[] = [];
    try {
      cacheLogger.time('dbFetch');
      const dbConfs = await Promise.race([
        prisma.conference.findMany({
          select: {
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
            financialAid: true
          },
          orderBy: { startDate: 'asc' }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout after 10s')), 10000)
        )
      ]);
      cacheLogger.timeEnd('dbFetch');
      
      if (dbConfs.length > 0) {
        cacheLogger.info('Fetched conferences from database', { count: dbConfs.length });
        conferences = dbConfs.map((c) => ({
          id: c.id,
          name: c.name,
          url: c.url,
          startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : null,
          endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : null,
          location: {
            city: c.city || '',
            country: c.country || '',
            raw: c.locationRaw || '',
            lat: c.lat || undefined,
            lng: c.lng || undefined
          },
          online: c.online,
          cfp: {
            url: c.cfpUrl || '',
            endDate: c.cfpEndDate ? c.cfpEndDate.toISOString().split('T')[0] : null,
            status: (c.cfpStatus as 'open' | 'closed' | undefined)
          },
          domain: c.domain,
          description: c.description || undefined,
          source: c.source,
          tags: c.tags,
          financialAid: c.financialAid ? JSON.parse(JSON.stringify(c.financialAid)) : undefined
        })) as Conference[];
      }
    } catch (dbError) {
      cacheLogger.error('Database fetch failed, falling back to file', dbError);
      conferences = [];
    }

    // 3. Fallback to File if DB failed or empty
    if (conferences.length === 0) {
      cacheLogger.info('Using file fallback');
      const filePath = join(process.cwd(), 'public/data/conferences.json');
      const fileData = readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileData);
      // Handle legacy structure
      if (jsonData.months) {
        conferences = Object.values(jsonData.months).flat() as Conference[];
      } else {
        conferences = jsonData.conferences;
      }
      cacheLogger.info('Loaded conferences from file', { count: conferences.length });
    }

    const formattedData = formatConferenceData(conferences);
    
    // 4. Update Redis
    if (redisClient) {
      try {
        await redisClient.set(CACHE_KEY, {
          data: formattedData,
          timestamp: Date.now()
        }, { ex: CACHE_TTL });
        cacheLogger.info('Updated Redis cache');
      } catch (redisError) {
        cacheLogger.error('Failed to update Redis cache', redisError);
      }
    }
    
    cacheLogger.info('Returning formatted data', { 
      months: Object.keys(formattedData.months).length,
      total: formattedData.stats.total 
    });
    return formattedData;
  } catch (error) {
    cacheLogger.error('Critical cache error, using file fallback', error);
    // Ultimate fallback
    const filePath = join(process.cwd(), 'public/data/conferences.json');
    const fileData = readFileSync(filePath, 'utf8');
    return JSON.parse(fileData);
  }
}

export async function invalidateCache(): Promise<void> {
  const redisClient = getRedisClient();
  if (!redisClient) {
    cacheLogger.warn('Redis not available, cannot invalidate cache');
    return;
  }

  try {
    await redisClient.del(CACHE_KEY);
    cacheLogger.info('Cache invalidated');
  } catch (error) {
    cacheLogger.error('Failed to invalidate cache', error);
  }
}

export async function warmCache(): Promise<void> {
  try {
    cacheLogger.info('Warming cache...');
    await getCachedConferences();
    cacheLogger.info('Cache warmed successfully');
  } catch (error) {
    cacheLogger.error('Failed to warm cache', error);
  }
}

/**
 * Background revalidation for stale-while-revalidate pattern
 */
async function revalidateCache(): Promise<void> {
  const redisClient = getRedisClient();
  if (!redisClient) return;

  try {
    cacheLogger.info('Background revalidation started');
    const dbConfs = await prisma.conference.findMany({
      select: {
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
        financialAid: true
      },
      orderBy: { startDate: 'asc' }
    });

    const conferences = dbConfs.map((c) => ({
      id: c.id,
      name: c.name,
      url: c.url,
      startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : null,
      endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : null,
      location: {
        city: c.city || '',
        country: c.country || '',
        raw: c.locationRaw || '',
        lat: c.lat || undefined,
        lng: c.lng || undefined
      },
      online: c.online,
      cfp: {
        url: c.cfpUrl || '',
        endDate: c.cfpEndDate ? c.cfpEndDate.toISOString().split('T')[0] : null,
        status: (c.cfpStatus as 'open' | 'closed' | undefined)
      },
      domain: c.domain,
      description: c.description || undefined,
      source: c.source,
      tags: c.tags,
      financialAid: c.financialAid ? JSON.parse(JSON.stringify(c.financialAid)) : undefined
    })) as Conference[];

    const formattedData = formatConferenceData(conferences);
    
    await redisClient.set(CACHE_KEY, {
      data: formattedData,
      timestamp: Date.now()
    }, { ex: CACHE_TTL });
    
    cacheLogger.info('Background revalidation completed');
  } catch (error) {
    cacheLogger.error('Background revalidation error', error);
  }
}