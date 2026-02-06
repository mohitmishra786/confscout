/**
 * URL Validation Utilities
 *
 * Provides secure URL validation to prevent open redirect vulnerabilities.
 * All redirect URLs should be validated before use.
 */

/**
 * Validates that a redirect URL is safe to use.
 * Prevents open redirect attacks by ensuring URLs only point to trusted domains.
 *
 * @param url - The URL to validate
 * @param allowedHosts - Array of allowed hostnames (defaults to current app hosts)
 * @returns boolean - True if the URL is safe for redirect
 */
export function isSafeRedirectUrl(
  url: string,
  allowedHosts: string[] = ['confscout.site', 'localhost', '127.0.0.1', '']
): boolean {
  if (!url) return false;

  // Reject null bytes which can be used to bypass filters
  if (url.includes('\x00') || url.includes('\u0000')) {
    return false;
  }

  // Check for dangerous protocols before parsing
  if (containsDangerousProtocol(url)) {
    return false;
  }

  // Reject protocol-relative URLs
  if (url.trim().startsWith('//')) {
    return false;
  }

  // Reject URLs that look like protocol confusion attempts
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) && !url.startsWith('http:') && !url.startsWith('https:')) {
    return false;
  }

  try {
    // Try to parse as absolute URL first
    let parsedUrl: URL;
    let isAbsolute = false;

    try {
      parsedUrl = new URL(url);
      isAbsolute = true;
    } catch {
      // If absolute parsing fails, treat as relative
      parsedUrl = new URL(url, 'http://localhost');
    }

    // Reject URLs with credentials
    if (parsedUrl.username || parsedUrl.password) {
      return false;
    }

    // For absolute URLs, check against allowed hosts
    if (isAbsolute) {
      // Reject non-HTTP(S) protocols
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return false;
      }

      const hostname = parsedUrl.hostname.toLowerCase();

      // Check against allowed hosts
      const isAllowed = allowedHosts.some(host => {
        if (!host) return false;
        // Exact match
        if (hostname === host.toLowerCase()) return true;
        // Subdomain match (e.g., www.example.com matches example.com)
        if (hostname.endsWith(`.${host.toLowerCase()}`)) return true;
        return false;
      });

      return isAllowed;
    }

    // For relative URLs, ensure they don't contain encoded protocol markers
    const decodedUrl = decodeURIComponent(url);
    if (containsDangerousProtocol(decodedUrl)) {
      return false;
    }

    // Reject path traversal attempts
    if (decodedUrl.includes('..')) {
      // Allow safe relative paths but block traversal outside root
      const normalizedPath = decodedUrl.replace(/\/+/g, '/');
      if (normalizedPath.includes('../') || normalizedPath.startsWith('..')) {
        // Check if it's actually trying to escape
        const segments = normalizedPath.split('/');
        let depth = 0;
        for (const segment of segments) {
          if (segment === '..') {
            depth--;
          } else if (segment && segment !== '.') {
            depth++;
          }
          if (depth < 0) {
            return false;
          }
        }
      }
    }

    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Sanitizes a redirect URL by ensuring it's safe or returning a default.
 *
 * @param url - The URL to sanitize
 * @param defaultUrl - The default URL to return if unsafe (defaults to '/')
 * @param allowedHosts - Array of allowed hostnames
 * @returns string - The sanitized URL
 */
export function sanitizeRedirectUrl(
  url: string | null | undefined,
  defaultUrl: string = '/',
  allowedHosts?: string[]
): string {
  if (!url) return defaultUrl;

  // Decode the URL in case it's encoded
  const decodedUrl = decodeURIComponent(url);

  if (isSafeRedirectUrl(decodedUrl, allowedHosts)) {
    return decodedUrl;
  }

  return defaultUrl;
}

/**
 * Validates that a callback URL is safe for authentication flows.
 * Stricter validation for OAuth callbacks.
 *
 * @param callbackUrl - The callback URL to validate
 * @returns boolean - True if the callback URL is safe
 */
export function isSafeCallbackUrl(callbackUrl: string): boolean {
  if (!callbackUrl) return false;

  // Only allow relative URLs for callbacks to prevent external redirects
  if (callbackUrl.startsWith('/')) {
    // Prevent protocol-relative URLs
    if (callbackUrl.startsWith('//')) {
      return false;
    }

    // Prevent JavaScript URLs
    if (callbackUrl.toLowerCase().startsWith('/javascript:')) {
      return false;
    }

    // Prevent data URLs
    if (callbackUrl.toLowerCase().startsWith('/data:')) {
      return false;
    }

    return true;
  }

  return false;
}

/**
 * List of dangerous protocols that should never be allowed in redirects
 */
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'about:',
  'chrome:',
  'chrome-extension:',
  'moz-extension:',
];

/**
 * Checks if a URL contains any dangerous protocols
 *
 * @param url - The URL to check
 * @returns boolean - True if the URL contains a dangerous protocol
 */
export function containsDangerousProtocol(url: string): boolean {
  const lowerUrl = url.toLowerCase().trim();

  return DANGEROUS_PROTOCOLS.some(protocol =>
    lowerUrl.startsWith(protocol) ||
    lowerUrl.includes(`:${protocol}`) ||
    lowerUrl.includes(`/${protocol}`)
  );
}

/**
 * Validates a URL for use in external links.
 * Allows external URLs but blocks dangerous protocols.
 *
 * @param url - The URL to validate
 * @returns boolean - True if the URL is safe for external use
 */
export function isSafeExternalUrl(url: string): boolean {
  if (!url) return false;

  // Check for dangerous protocols
  if (containsDangerousProtocol(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Reject URLs with credentials
    if (parsed.username || parsed.password) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
