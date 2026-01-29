import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ConferenceData } from '@/types/conference';

const CACHE_KEY = 'conferences';
const CACHE_TTL = 3600; // 1 hour

// Initialize Redis client lazily to prevent build-time errors if env vars are missing
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;
  
  try {
    // Check if env vars are present before trying to initialize
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = Redis.fromEnv();
      return redis;
    }
    console.warn('Upstash Redis environment variables missing. Cache will default to filesystem.');
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

export async function getCachedConferences(): Promise<ConferenceData> {
  const redisClient = getRedisClient();
  
  try {
    if (redisClient) {
      const cached = await redisClient.get<CachedData>(CACHE_KEY);
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
        return cached.data;
      }
    }
    
    // Cache miss, expired, or no Redis: load from file
    const filePath = join(process.cwd(), 'public/data/conferences.json');
    const fileData = readFileSync(filePath, 'utf8');
    const conferences = JSON.parse(fileData);
    
    // Update cache if Redis is available
    if (redisClient) {
      await redisClient.set(CACHE_KEY, {
        data: conferences,
        timestamp: Date.now()
      }, { ex: CACHE_TTL });
    }
    
    return conferences;
  } catch (error) {
    console.error('Cache error, falling back to file:', error);
    
    // Fallback to file system
    try {
      const filePath = join(process.cwd(), 'public/data/conferences.json');
      const fileData = readFileSync(filePath, 'utf8');
      return JSON.parse(fileData);
    } catch (fileError) {
      console.error('Failed to load conferences from file:', fileError);
      throw fileError;
    }
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