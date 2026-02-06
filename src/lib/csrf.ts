import { cookies } from 'next/headers';
import { CSRF_HEADER, CSRF_COOKIE } from '@/lib/csrf-constants';

export { CSRF_HEADER, CSRF_COOKIE };

/**
 * Generates a random CSRF token (Edge compatible and cryptographically secure)
 */
export function generateCsrfToken(): string {
  if (typeof crypto !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cryptoObj = crypto as any;
    if (cryptoObj.randomUUID) {
      return cryptoObj.randomUUID().replace(/-/g, '');
    }
    const bytes = new Uint8Array(16);
    if (cryptoObj.getRandomValues) {
      cryptoObj.getRandomValues(bytes);
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }
  // Fallback for extremely restricted environments
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Validates the CSRF token from the request against the cookie
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get(CSRF_COOKIE)?.value;
  
  const receivedToken = request.headers.get(CSRF_HEADER);

  if (!storedToken || !receivedToken) {
    return false;
  }

  // Timing-safe comparison to prevent side-channel attacks
  try {
    const encoder = new TextEncoder();
    const a = encoder.encode(storedToken);
    const b = encoder.encode(receivedToken);
    
    if (a.byteLength !== b.byteLength) {
      return false;
    }

    // In a Server Component/Route context, we can use crypto.subtle or a manual constant-time check
    // Since we're in Next.js which might run on Edge or Node, let's use a robust constant-time comparison
    let result = 0;
    for (let i = 0; i < a.byteLength; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  } catch {
    return false; // SECURITY: Reject on any error to prevent timing attacks or bypasses
  }
}
