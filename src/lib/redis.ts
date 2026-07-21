import { Redis } from '@upstash/redis';
import { cacheLogger } from '@/lib/logger';
import { env } from '@/lib/env';

let redis: Redis | null = null;

/**
 * Shared Upstash Redis client for Node and Edge.
 *
 * Construct with explicit url/token (not Redis.fromEnv()) so the same code
 * works when webpack aliases `@upstash/redis` → the Cloudflare/Edge entry
 * (see next.config.ts). The nodejs entry reads process.version for telemetry
 * and triggers an Edge Runtime build warning if pulled into middleware.
 */
export function getRedisClient(): Redis | null {
  if (redis) return redis;

  try {
    const url = env.UPSTASH_REDIS_REST_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      redis = new Redis({ url, token });
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
