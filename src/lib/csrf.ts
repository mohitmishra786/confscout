import { cookies } from 'next/headers';
import { CSRF_HEADER, CSRF_COOKIE } from './csrf-constants';

export { CSRF_HEADER, CSRF_COOKIE };

/**
 * Generates a random CSRF token (Edge compatible)
 */
export function generateCsrfToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  // Fallback for older environments
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Validates the CSRF token from the request against the cookie
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get(CSRF_COOKIE)?.value;
  
  const requestHeaders = new Headers(request.headers);
  const receivedToken = requestHeaders.get(CSRF_HEADER);

  if (!storedToken || !receivedToken) {
    return false;
  }

  return storedToken === receivedToken;
}
