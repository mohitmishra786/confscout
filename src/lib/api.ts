/**
 * Secure API fetching utility
 * Automatically adds CSRF token to requests
 * Handles timeouts, retries, and rate limiting (external)
 */

import { CSRF_HEADER, CSRF_COOKIE } from '@/lib/csrf-constants';

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper to get cookie value
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

interface SecureFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Fetch wrapper that automatically injects a CSRF token
 * header for state-changing HTTP methods.
 * Now includes timeout and retry logic for reliability.
 */
export async function secureFetch(
  url: string, 
  options: SecureFetchOptions = {}
): Promise<Response> {
  const { 
    timeout = DEFAULT_TIMEOUT, 
    retries = MAX_RETRIES, 
    retryDelay = INITIAL_RETRY_DELAY,
    ...fetchOptions 
  } = options;

  const headers = new Headers(fetchOptions.headers || {});
  
  // Add CSRF token for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((fetchOptions.method || 'GET').toUpperCase())) {
    const token = getCookie(CSRF_COOKIE);
    if (token) {
      headers.set(CSRF_HEADER, token);
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(id);

      // Handle rate limiting (429) and server errors (503) with retries
      if ([429, 503].includes(response.status) && attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error: unknown) {
      clearTimeout(id);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries && (lastError.name === 'AbortError' || lastError.name === 'TypeError')) {
        // Retry on timeout or network errors
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw lastError;
    }
  }

  throw lastError || new Error('Fetch failed after multiple attempts');
}
