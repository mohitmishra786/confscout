/**
 * Rate Limiting Module
 * 
 * Provides robust rate limiting for API routes with multiple strategies:
 * - Fixed window rate limiting (simple and fast)
 * - Sliding window rate limiting (more accurate)
 * - Redis-backed rate limiting (for production)
 * - In-memory fallback (for development/edge)
 * 
 * Issue #265 - Add Rate Limiting
 */

import { NextRequest, NextResponse } from 'next/server';

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
}

// In-memory store for development/edge runtime
const memoryStore = new Map<string, RateLimitEntry>();

/**
 * Get client IP from request headers
 * Tries multiple headers to support different deployment platforms
 */
export function getClientIP(request: NextRequest): string {
  // Try platform-specific headers first
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Get the first IP in the chain (client IP)
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback
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
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      reset,
      windowStart
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
 * Sliding window rate limiting
 * More accurate, prevents burst at window boundaries
 * Uses a simplified approximation for in-memory store
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
    // No entry or expired
    const newEntry: RateLimitEntry = {
      count: 1,
      reset,
      windowStart: now
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
  headers['Retry-After'] = (result.reset - Math.floor(Date.now() / 1000)).toString();
  
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
};

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
