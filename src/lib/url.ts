/**
 * URL Validation and Sanitization Utility
 */

/**
 * Validates if a string is a valid URL
 * Prevents javascript: protocols and ensures absolute URLs
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitizes a URL to prevent common injection attacks
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const sanitized = url.trim();

  if (!isValidUrl(sanitized)) {
    return '';
  }
  
  return sanitized;
}

/**
 * Normalizes a URL (e.g., removes trailing slashes, ensures lowercase host)
 */
export function normalizeUrl(url: string): string {
  if (!isValidUrl(url)) return url;
  
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    if (parsed.pathname === '') parsed.pathname = '/';
    return parsed.toString();
  } catch {
    return url;
  }
}
