import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, CSRF_COOKIE } from '@/lib/csrf';
import {
  rateLimitMiddleware,
  rateLimitConfigs,
  getRateLimitHeaders,
  cleanupRateLimitStore
} from '@/lib/rateLimit';

const intlMiddleware = createMiddleware({
  locales: ['en'],
  defaultLocale: 'en'
});

// Track middleware execution count for periodic cleanup
// NOTE: In serverless/edge environments, this counter resets on each cold start.
// Each instance gets its own requestCount, so cleanup frequency is non-deterministic
// across instances. This is acceptable for a best-effort cleanup.
let requestCount = 0;
const CLEANUP_INTERVAL = 1000;

export default function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Rate limiting for API routes
  if (path.startsWith('/api/') && !path.startsWith('/api/cron/')) {
    // Choose rate limit config based on path
    let config = rateLimitConfigs.api;
    
    if (path.startsWith('/api/auth/')) {
      config = rateLimitConfigs.auth;
    } else if (path.includes('/public/') || path === '/api/conferences/static') {
      config = rateLimitConfigs.public;
    }
    
    // Apply rate limiting
    const { allowed, result, response } = rateLimitMiddleware(request, config);
    
    if (!allowed && response) {
      return response;
    }
    
    // Continue with request but add rate limit headers
    // NOTE: Headers set on the middleware response via NextResponse.next() can be
    // overwritten if the route handler creates its own NextResponse. This is a known
    // Next.js middleware limitation. If rate limit headers must always be present,
    // they'd need to be set in the route handlers as well.
    const nextResponse = NextResponse.next();
    if (result) {
      const headers = getRateLimitHeaders(result);
      Object.entries(headers).forEach(([key, value]) => {
        nextResponse.headers.set(key, value);
      });
    }
    
    // Periodic cleanup of rate limit store
    requestCount++;
    if (requestCount % CLEANUP_INTERVAL === 0) {
      cleanupRateLimitStore();
    }
    
    return nextResponse;
  }

  // Only run intl middleware for non-API routes
  if (!path.startsWith('/api/')) {
    const response = intlMiddleware(request);

    // Set CSRF token cookie if not present
    if (!request.cookies.has(CSRF_COOKIE)) {
      const token = generateCsrfToken();
      response.cookies.set(CSRF_COOKIE, token, {
        httpOnly: false, // Client needs to read this to send X-CSRF-Token header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 86400 // 24 hours
      });
    }

    return response;
  }

  return NextResponse.next();
}
 
export const config = {
  // Optimized matcher: Only run on API routes and locale routes
  // Excludes static assets, Next.js internals, and other files
  matcher: [
    '/api/:path*',
    '/(en|es|fr|de)/:path*',
  ]
};