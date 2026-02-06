import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { generateCsrfToken, CSRF_COOKIE } from '@/lib/csrf';

const intlMiddleware = createMiddleware({
  locales: ['en'],
  defaultLocale: 'en'
});

export default function middleware(request: NextRequest) {
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
 
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};