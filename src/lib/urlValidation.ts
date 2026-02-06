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
  allowedHosts: string[] = ['confscout.site', 'localhost', '127.0.0.1']
): boolean {
  if (!url) return false;

  const trimmedUrl = url.trim();

  // Reject null bytes which can be used to bypass filters
  if (trimmedUrl.includes('\x00') || trimmedUrl.includes('\u0000')) {
    return false;
  }

  // Reject protocol-relative URLs
  if (trimmedUrl.startsWith('//')) {
    return false;
  }

  // Check for dangerous protocols before parsing
  if (containsDangerousProtocol(trimmedUrl)) {
    return false;
  }

  // Reject URLs that look like protocol confusion attempts or malformed absolute URLs
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmedUrl)) {
    if (!trimmedUrl.startsWith('http:') && !trimmedUrl.startsWith('https:')) {
      return false;
    }
    // If it starts with http: or https:, it must be a valid absolute URL
    try {
      new URL(trimmedUrl);
    } catch {
      return false;
    }
  }

  try {
    // Single decode-and-validate to prevent double-encoding bypass
    const decodedUrl = decodeURIComponent(trimmedUrl);
    
    // Re-check for protocol-relative redirects after decoding
    if (decodedUrl.startsWith('//') || /^\/{2,}/.test(decodedUrl)) {
      return false;
    }

    if (containsDangerousProtocol(decodedUrl)) {
      return false;
    }

    // Try to parse both raw and decoded URLs
    const urlsToTest = [trimmedUrl, decodedUrl];
    
    for (const testUrl of urlsToTest) {
      let parsedUrl: URL | null = null;
      try {
        parsedUrl = new URL(testUrl);
      } catch {
        // Not an absolute URL, fine
      }

      if (parsedUrl) {
        // If it's an absolute URL, it MUST be allowed
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          return false;
        }

        const hostname = parsedUrl.hostname.toLowerCase();
        const isAllowed = allowedHosts.some(host => {
          if (!host) return false;
          if (hostname === host.toLowerCase()) return true;
          if (hostname.endsWith(`.${host.toLowerCase()}`)) return true;
          return false;
        });

        if (!isAllowed) return false;
        
        // Also check for credentials in absolute URLs
        if (parsedUrl.username || parsedUrl.password) {
          return false;
        }
      }
    }

    // If it reaches here, it's either a safe absolute URL or a relative URL
    // Reject path traversal attempts in the decoded version
    if (decodedUrl.includes('..')) {
      const normalizedPath = decodedUrl.replace(/\/+/g, '/');
      if (normalizedPath.includes('../') || normalizedPath.startsWith('..')) {
        const segments = normalizedPath.split('/');
        let depth = 0;
        for (const segment of segments) {
          if (segment === '..') {
            depth--;
          } else if (segment && segment !== '.') {
            depth++;
          }
          if (depth < 0) return false;
        }
      }
    }

    return true;
  } catch {
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

  try {
    const trimmedUrl = url.trim();
    // Pass raw input to isSafeRedirectUrl which handles decoding safely
    if (isSafeRedirectUrl(trimmedUrl, allowedHosts)) {
      // Return decoded version for consistency with expectations and clarity
      return decodeURIComponent(trimmedUrl);
    }
  } catch {
    // Fall through to default
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
