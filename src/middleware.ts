import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, CSRF_COOKIE } from '@/lib/csrf';
import { applyCSP } from '@/lib/csp';
import {
  rateLimitMiddlewareAsync,
  rateLimitConfigs,
  getRateLimitHeaders,
  cleanupRateLimitStore,
  type RateLimitConfig
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

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  let response: NextResponse;
  
  // Rate limiting for API routes
  if (path.startsWith('/api/') && !path.startsWith('/api/cron/')) {
    // Choose rate limit config based on path
    let config: RateLimitConfig = rateLimitConfigs.api;
    
    if (path.startsWith('/api/auth/')) {
      config = rateLimitConfigs.auth;
    } else if (path.includes('/public/') || path === '/api/conferences/static') {
      config = rateLimitConfigs.public;
    }
    
    // Apply rate limiting
    const { allowed, result, response: rlResponse } = await rateLimitMiddlewareAsync(request, config);
    
    if (!allowed && rlResponse) {
      response = rlResponse;
    } else {
      // Continue with request but add rate limit headers
      response = NextResponse.next();
      if (result) {
        const headers = getRateLimitHeaders(result);
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
    }
    
    // Periodic cleanup of rate limit store
    requestCount++;
    if (requestCount % CLEANUP_INTERVAL === 0) {
      cleanupRateLimitStore();
    }
  } else if (!path.startsWith('/api/')) {
    // Only run intl middleware for non-API routes
    response = intlMiddleware(request);

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
  } else {
    response = NextResponse.next();
  }

  // Apply Security Headers (CSP)
  applyCSP(request, response.headers);

  return response;
}
 
export const config = {
  // Narrowed matcher so middleware NEVER runs on:
  //   • _next/static  — immutable JS/CSS chunks
  //   • _next/image   — image optimisation responses
  //   • /monitoring   — Sentry tunnel route (set in next.config tunnelRoute)
  //   • favicon.ico, robots.txt, sitemap.xml, manifest.json
  //   • Any file with a known static extension
  //
  // Previously the '/(en|es|fr|de)/:path*' pattern also ran on every image
  // and font request inside those locale paths. The negative look-ahead below
  // is the standard Next.js recommendation and shaves ~1–3 ms per request
  // that would otherwise execute CSRF + CSP logic for static assets.
  matcher: [
    '/((?!_next/static|_next/image|monitoring|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};