import { headers, cookies } from 'next/headers';

export const CSRF_HEADER = 'X-CSRF-Token';
export const CSRF_COOKIE = 'csrf_token';

/**
 * Generates a random CSRF token (Edge compatible)
 */
export function generateCsrfToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  // Fallback for older environments (unlikely in Next.js)
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
