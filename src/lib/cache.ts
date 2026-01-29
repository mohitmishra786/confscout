import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Conference, ConferenceData } from '@/types/conference';
import { prisma } from '@/lib/prisma';

const CACHE_KEY = 'conferences';
const CACHE_TTL = 3600; // 1 hour

// Initialize Redis client lazily
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = Redis.fromEnv();
      return redis;
    }
    console.warn('Upstash Redis environment variables missing.');
    return null;
  } catch (error) {
    console.warn('Failed to initialize Redis client:', error);
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
    // 1. Try Redis
    if (redisClient) {
      const cached = await redisClient.get<CachedData>(CACHE_KEY);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
        return cached.data;
      }
    }
    
    // 2. Try Database
    let conferences: Conference[] = [];
    try {
      // Cast the prisma result to Conference[] because the DB types might be slightly strict/loose
      // compared to the frontend interface (e.g. JSON fields). 
      // In a real scenario, we might need a mapper. 
      // For now, assume schema matches closely enough or use 'any'.
      const dbConfs = await prisma.conference.findMany();
      if (dbConfs.length > 0) {
        console.log(`[Cache] Fetched ${dbConfs.length} conferences from Database.`);
        conferences = dbConfs.map(c => ({
          ...c,
          startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : null,
          endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : null,
          location: {
            city: c.city || '',
            country: c.country || '',
            raw: c.locationRaw || '',
            lat: c.lat || undefined,
            lng: c.lng || undefined
          },
          cfp: {
            url: c.cfpUrl || '',
            endDate: c.cfpEndDate ? c.cfpEndDate.toISOString().split('T')[0] : null,
            status: c.cfpStatus as 'open' | 'closed' | undefined
          },
          financialAid: c.financialAid ? JSON.parse(JSON.stringify(c.financialAid)) : undefined
        })) as Conference[];
      }
    } catch (dbError) {
      console.error('Database fetch failed, falling back to file:', dbError);
    }

    // 3. Fallback to File if DB failed or empty
    if (conferences.length === 0) {
      const filePath = join(process.cwd(), 'public/data/conferences.json');
      const fileData = readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileData);
      // Handle legacy structure
      if (jsonData.months) {
        conferences = Object.values(jsonData.months).flat() as Conference[];
      } else {
        conferences = jsonData.conferences;
      }
    }

    const formattedData = formatConferenceData(conferences);
    
    // 4. Update Redis
    if (redisClient) {
      await redisClient.set(CACHE_KEY, {
        data: formattedData,
        timestamp: Date.now()
      }, { ex: CACHE_TTL });
    }
    
    return formattedData;
  } catch (error) {
    console.error('Critical cache error:', error);
    // Ultimate fallback
    const filePath = join(process.cwd(), 'public/data/conferences.json');
    const fileData = readFileSync(filePath, 'utf8');
    return JSON.parse(fileData);
  }
}

export async function invalidateCache(): Promise<void> {
  const redisClient = getRedisClient();
  if (!redisClient) return;

  try {
    await redisClient.del(CACHE_KEY);
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
  }
}

export async function warmCache(): Promise<void> {
  try {
    await getCachedConferences();
  } catch (error) {
    console.error('Failed to warm cache:', error);
  }
}