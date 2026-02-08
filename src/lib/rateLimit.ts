/**
 * Rate Limiting Module
 *
 * Provides robust rate limiting for API routes with multiple strategies:
 * - Fixed window rate limiting (simple and fast)
 * - Sliding window rate limiting (more accurate)
 * - In-memory store (for development/edge environments)
 *
 * TODO: Add Redis-backed rate limiting for production use at scale
 *       See: https://github.com/anomalyco/confscout/issues/XXX
 *
 * Issue #265 - Add Rate Limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { securityLogger } from '@/lib/logger';

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Optional key prefix for namespacing */
  keyPrefix?: string;
  /** Skip rate limiting for certain conditions */
  skip?: (req: NextRequest) => boolean;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp when the limit resets */
  reset: number;
  /** Total limit for the window */
  limit: number;
}

interface RateLimitEntry {
  count: number;
  reset: number;
  windowStart: number;
  lastAccessed: number;
}

const MAX_STORE_SIZE = 10000;

// LRU-style in-memory store for development/edge runtime
const memoryStore = new Map<string, RateLimitEntry>();

function evictOldestEntry(): void {
  const firstKey = memoryStore.keys().next().value;
  if (firstKey) {
    memoryStore.delete(firstKey);
  }
}

/**
 * Validate and sanitize an IP address string
 * Returns null if invalid, otherwise returns the trimmed, validated IP
 */
function validateIP(ip: string): string | null {
  const trimmed = ip.trim();

  if (trimmed.length === 0 || trimmed.length > 45) {
    return null;
  }

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (ipv4Pattern.test(trimmed)) {
    const parts = trimmed.split('.');
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (num < 0 || num > 255) {
        return null;
      }
    }
    return trimmed;
  }

  if (ipv6Pattern.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Get client IP from request headers
 * Tries multiple headers to support different deployment platforms
 * Validates and sanitizes IP addresses to prevent header spoofing
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim());
    const firstIP = ips[0];
    const validated = validateIP(firstIP);
    if (validated) {
      return validated;
    }
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    const validated = validateIP(realIP);
    if (validated) {
      return validated;
    }
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    const validated = validateIP(cfConnectingIP);
    if (validated) {
      return validated;
    }
  }

  return '127.0.0.1';
}

/**
 * Create a rate limit key based on request characteristics
 */
export function createRateLimitKey(
  request: NextRequest,
  identifier?: string
): string {
  const ip = getClientIP(request);
  const path = request.nextUrl.pathname;
  
  // Use identifier if provided, otherwise use IP + path
  if (identifier) {
    return `${ip}:${identifier}`;
  }
  
  return `${ip}:${path}`;
}

/**
 * Fixed window rate limiting
 * Simple and fast, but can allow burst at window boundaries
 */
export function fixedWindow(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const reset = windowStart + windowMs;
  
  const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
  const entry = memoryStore.get(fullKey);
  
  if (!entry || entry.windowStart !== windowStart) {
    // Enforce store capacity limit
    if (memoryStore.size >= MAX_STORE_SIZE) {
      evictOldestEntry();
    }

    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      reset,
      windowStart,
      lastAccessed: Date.now()
    };
    memoryStore.set(fullKey, newEntry);
    
    return {
      success: true,
      remaining: config.maxRequests - 1,
      reset: Math.ceil(reset / 1000),
      limit: config.maxRequests
    };
  }
  
  // Existing window
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil(entry.reset / 1000),
      limit: config.maxRequests
    };
  }
  
  entry.count++;
  memoryStore.set(fullKey, entry);
  
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    reset: Math.ceil(entry.reset / 1000),
    limit: config.maxRequests
  };
}

/**
 * Rolling window rate limiting (simplified sliding window approximation)
 *
 * NOTE: This is a simplified approximation of a sliding window algorithm.
 * It functions as a fixed window that starts on the first request rather than
 * on a clock-aligned boundary. For true sliding window behavior with smooth
 * rate limiting at boundaries, consider implementing weighted interpolation
 * between current and previous windows, or use a per-request timestamp queue.
 *
 * This implementation is suitable for most use cases but may allow bursts
 * at window boundaries under high load.
 */
export function slidingWindow(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const reset = now + windowMs;
  
  const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
  const entry = memoryStore.get(fullKey);
  
  if (!entry || now > entry.reset) {
    // Enforce store capacity limit
    if (memoryStore.size >= MAX_STORE_SIZE) {
      evictOldestEntry();
    }

    // No entry or expired
    const newEntry: RateLimitEntry = {
      count: 1,
      reset,
      windowStart: now,
      lastAccessed: Date.now()
    };
    memoryStore.set(fullKey, newEntry);
    
    return {
      success: true,
      remaining: config.maxRequests - 1,
      reset: Math.ceil(reset / 1000),
      limit: config.maxRequests
    };
  }
  
  // Check if we're over the limit
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil(entry.reset / 1000),
      limit: config.maxRequests
    };
  }
  
  entry.count++;
  memoryStore.set(fullKey, entry);
  
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    reset: Math.ceil(entry.reset / 1000),
    limit: config.maxRequests
  };
}

/**
 * Cleanup old entries to prevent memory leaks
 */
export function cleanupRateLimitStore(maxAgeMs: number = 3600000): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.reset + maxAgeMs) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Clear all rate limit entries - useful for testing
 */
export function clearRateLimitStore(): void {
  memoryStore.clear();
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

/**
 * Create a rate limit response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message?: string
): NextResponse {
  const headers = getRateLimitHeaders(result);
  headers['Retry-After'] = Math.max(0, result.reset - Math.floor(Date.now() / 1000)).toString();
  
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: message || 'Rate limit exceeded. Please try again later.',
      reset: new Date(result.reset * 1000).toISOString()
    },
    {
      status: 429,
      headers
    }
  );
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  /** Strict limit for authentication endpoints */
  auth: {
    maxRequests: 5,
    windowSeconds: 60,
    keyPrefix: 'auth'
  },
  
  /** Standard limit for API endpoints */
  api: {
    maxRequests: 100,
    windowSeconds: 60,
    keyPrefix: 'api'
  },
  
  /** Lenient limit for public data endpoints */
  public: {
    maxRequests: 1000,
    windowSeconds: 60,
    keyPrefix: 'public'
  },
  
  /** Very strict limit for sensitive operations */
  strict: {
    maxRequests: 3,
    windowSeconds: 60,
    keyPrefix: 'strict'
  }
} as const;

/**
 * Redis-backed rate limiting (Sliding window)
 * Suitable for production at scale.
 */
export async function redisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    // Fallback to in-memory if Redis is not available
    return slidingWindow(key, config);
  }

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const fullKey = config.keyPrefix ? `ratelimit:${config.keyPrefix}:${key}` : `ratelimit:${key}`;
  
  try {
    // Use Redis sorted set to implement a true sliding window
    const multi = redis.pipeline();
    
    // Remove old entries
    multi.zremrangebyscore(fullKey, 0, now - windowMs);
    // Add current entry
    multi.zadd(fullKey, { score: now, member: `${now}-${Math.random()}` });
    // Count entries in current window
    multi.zcard(fullKey);
    // Set expiry for the whole set
    multi.expire(fullKey, config.windowSeconds);
    
    const results = await multi.exec();
    const count = results[2] as number;
    
    const success = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);
    const reset = Math.ceil((now + windowMs) / 1000);

    return {
      success,
      remaining,
      reset,
      limit: config.maxRequests
    };
  } catch (error: unknown) {
    securityLogger.error('Redis rate limit error', error);
    // Fallback to in-memory on error
    return slidingWindow(key, config);
  }
}

/**
 * Middleware-compatible rate limiter
 * Can be used in Next.js middleware
 */
export async function rateLimitMiddlewareAsync(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; result?: RateLimitResult; response?: NextResponse }> {
  // Skip if configured to skip
  if (config.skip && config.skip(request)) {
    return { allowed: true };
  }
  
  const key = createRateLimitKey(request);
  
  // Use Redis if available, otherwise sliding window
  const result = await redisRateLimit(key, config);
  
  if (!result.success) {
    return {
      allowed: false,
      result,
      response: createRateLimitResponse(result)
    };
  }
  
  return { allowed: true, result };
}

/**
 * Middleware-compatible rate limiter
 * Can be used in Next.js middleware
 */
export function rateLimitMiddleware(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; result?: RateLimitResult; response?: NextResponse } {
  // Skip if configured to skip
  if (config.skip && config.skip(request)) {
    return { allowed: true };
  }
  
  const key = createRateLimitKey(request);
  const result = slidingWindow(key, config);
  
  if (!result.success) {
    return {
      allowed: false,
      result,
      response: createRateLimitResponse(result)
    };
  }
  
  return { allowed: true, result };
}
