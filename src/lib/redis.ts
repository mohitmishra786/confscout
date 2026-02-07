import { Redis } from '@upstash/redis';
import { cacheLogger } from '@/lib/logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redis) return redis;
  
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = Redis.fromEnv();
      cacheLogger.info('Redis client initialized');
      return redis;
    }
    cacheLogger.warn('Upstash Redis environment variables missing');
    return null;
  } catch (error: unknown) {
    cacheLogger.error('Failed to initialize Redis client', error);
    return null;
  }
}
