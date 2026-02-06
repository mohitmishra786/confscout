import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, CSRF_COOKIE } from '@/lib/csrf';

const intlMiddleware = createMiddleware({
  locales: ['en'],
  defaultLocale: 'en'
});

// Simple in-memory rate limit for the edge (this resets on every function cold start but is a basic protection)
const rateLimitMap = new Map<string, { count: number, reset: number }>();

export default function middleware(request: NextRequest) {
  // Use a trusted source for IP (platform-provided header or request.ip)
  // Vercel and most providers provide x-real-ip or request.ip
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const now = Date.now();
  
  // Basic rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/api/auth/')) {
    const limit = rateLimitMap.get(ip);
    if (limit && now < limit.reset) {
      if (limit.count > 100) { // 100 requests per minute
        return new NextResponse('Too Many Requests', { status: 429 });
      }
      limit.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, reset: now + 60000 });
    }
  }

  // Cleanup old rate limit entries occasionally
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.reset) rateLimitMap.delete(key);
    }
  }

  // Only run intl middleware for non-API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    const response = intlMiddleware(request);

    // Set CSRF token cookie if not present
    if (!request.cookies.has(CSRF_COOKIE)) {
      const token = generateCsrfToken();
      response.cookies.set(CSRF_COOKIE, token, {
        httpOnly: false, // Client needs to read this to send X-CSRF-Token header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
    }

    return response;
  }

  return NextResponse.next();
}
 
export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'] // Removed (?!api) to allow rate limiting API routes
};