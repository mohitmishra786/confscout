/**
 * Security Tests for Open Redirect Prevention
 *
 * Tests for URL validation utilities to prevent open redirect vulnerabilities.
 */

import {
  isSafeRedirectUrl,
  sanitizeRedirectUrl,
  isSafeCallbackUrl,
  containsDangerousProtocol,
  isSafeExternalUrl,
} from '@/lib/urlValidation';

describe('Open Redirect Prevention', () => {
  describe('isSafeRedirectUrl', () => {
    it('should allow safe relative URLs', () => {
      expect(isSafeRedirectUrl('/dashboard')).toBe(true);
      expect(isSafeRedirectUrl('/auth/signin')).toBe(true);
      expect(isSafeRedirectUrl('/conferences/123')).toBe(true);
    });

    it('should allow URLs with allowed hosts', () => {
      expect(isSafeRedirectUrl('https://confscout.site/dashboard')).toBe(true);
      expect(isSafeRedirectUrl('https://www.confscout.site/profile')).toBe(true);
    });

    it('should reject protocol-relative URLs', () => {
      expect(isSafeRedirectUrl('//evil.com')).toBe(false);
      expect(isSafeRedirectUrl('//evil.com/steal')).toBe(false);
    });

    it('should reject URLs with javascript: protocol', () => {
      expect(isSafeRedirectUrl('javascript:alert("XSS")')).toBe(false);
      expect(isSafeRedirectUrl('javascript://alert("XSS")')).toBe(false);
    });

    it('should reject URLs with data: protocol', () => {
      expect(isSafeRedirectUrl('data:text/html,<script>alert("XSS")</script>')).toBe(false);
    });

    it('should reject external URLs not in allowed list', () => {
      expect(isSafeRedirectUrl('https://evil.com/steal')).toBe(false);
      expect(isSafeRedirectUrl('https://attacker.com/phishing')).toBe(false);
    });

    it('should reject URLs with credentials', () => {
      expect(isSafeRedirectUrl('https://user:pass@confscout.site')).toBe(false);
    });

    it('should reject empty URLs', () => {
      expect(isSafeRedirectUrl('')).toBe(false);
      expect(isSafeRedirectUrl(null as unknown as string)).toBe(false);
      expect(isSafeRedirectUrl(undefined as unknown as string)).toBe(false);
    });

    it('should reject malformed absolute URLs', () => {
      // These are valid relative paths, but malformed absolute URLs
      expect(isSafeRedirectUrl('http://[invalid')).toBe(false);
    });

    it('should allow valid relative paths even if they look like text', () => {
      // These are valid relative paths that don't contain dangerous patterns
      expect(isSafeRedirectUrl('not a url')).toBe(true);
      expect(isSafeRedirectUrl('some random path')).toBe(true);
    });

    it('should reject file: protocol', () => {
      expect(isSafeRedirectUrl('file:///etc/passwd')).toBe(false);
    });

    it('should allow custom allowed hosts', () => {
      const customHosts = ['example.com', 'app.example.com'];
      expect(isSafeRedirectUrl('https://example.com/page', customHosts)).toBe(true);
      expect(isSafeRedirectUrl('https://sub.example.com/page', customHosts)).toBe(true);
      expect(isSafeRedirectUrl('https://evil.com/page', customHosts)).toBe(false);
    });

    it('should reject encoded protocol-relative URLs', () => {
      // /%2F%2Fe%76%69%6C%2E%63%6F%6D decodes to //evil.com
      expect(isSafeRedirectUrl('/%2F%2Fe%76%69%6C%2E%63%6F%6D')).toBe(false);
      expect(isSafeRedirectUrl('https://%65%76%69%6C%2E%63%6F%6D')).toBe(false); // External not allowed
    });

    it('should reject URLs with @ symbol in path (credential injection)', () => {
      expect(isSafeRedirectUrl('https://confscout.site@evil.com')).toBe(false);
    });
  });

  describe('sanitizeRedirectUrl', () => {
    it('should return safe URLs unchanged', () => {
      expect(sanitizeRedirectUrl('/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('/')).toBe('/');
    });

    it('should return default for unsafe URLs', () => {
      expect(sanitizeRedirectUrl('https://evil.com', '/home')).toBe('/home');
      expect(sanitizeRedirectUrl('javascript:alert(1)', '/')).toBe('/');
    });

    it('should return default for null/undefined', () => {
      expect(sanitizeRedirectUrl(null, '/default')).toBe('/default');
      expect(sanitizeRedirectUrl(undefined, '/default')).toBe('/default');
    });

    it('should decode URL-encoded strings', () => {
      const encoded = encodeURIComponent('/dashboard');
      expect(sanitizeRedirectUrl(encoded)).toBe('/dashboard');
    });

    it('should return default for decoded malicious URLs', () => {
      const malicious = encodeURIComponent('https://evil.com');
      expect(sanitizeRedirectUrl(malicious, '/safe')).toBe('/safe');
    });
  });

  describe('isSafeCallbackUrl', () => {
    it('should allow relative URLs', () => {
      expect(isSafeCallbackUrl('/dashboard')).toBe(true);
      expect(isSafeCallbackUrl('/auth/callback')).toBe(true);
      expect(isSafeCallbackUrl('/')).toBe(true);
    });

    it('should reject absolute URLs', () => {
      expect(isSafeCallbackUrl('https://confscout.site/dashboard')).toBe(false);
      expect(isSafeCallbackUrl('http://localhost:3000')).toBe(false);
    });

    it('should reject protocol-relative URLs', () => {
      expect(isSafeCallbackUrl('//evil.com')).toBe(false);
    });

    it('should reject JavaScript URLs', () => {
      expect(isSafeCallbackUrl('/javascript:alert(1)')).toBe(false);
      expect(isSafeCallbackUrl('/JavaScript:alert(1)')).toBe(false);
    });

    it('should reject data URLs', () => {
      expect(isSafeCallbackUrl('/data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should reject empty URLs', () => {
      expect(isSafeCallbackUrl('')).toBe(false);
    });
  });

  describe('containsDangerousProtocol', () => {
    it('should detect javascript: protocol', () => {
      expect(containsDangerousProtocol('javascript:alert(1)')).toBe(true);
      expect(containsDangerousProtocol('JAVASCRIPT:alert(1)')).toBe(true);
    });

    it('should detect data: protocol', () => {
      expect(containsDangerousProtocol('data:text/html,<script>')).toBe(true);
    });

    it('should detect vbscript: protocol', () => {
      expect(containsDangerousProtocol('vbscript:msgbox(1)')).toBe(true);
    });

    it('should detect file: protocol', () => {
      expect(containsDangerousProtocol('file:///etc/passwd')).toBe(true);
    });

    it('should return false for safe http/https URLs', () => {
      expect(containsDangerousProtocol('https://example.com')).toBe(false);
      expect(containsDangerousProtocol('http://localhost:3000')).toBe(false);
    });

    it('should return false for relative URLs', () => {
      expect(containsDangerousProtocol('/dashboard')).toBe(false);
      expect(containsDangerousProtocol('/path/to/page')).toBe(false);
    });

    it('should detect protocols in the middle of strings', () => {
      expect(containsDangerousProtocol('https://example.com/:javascript:alert(1)')).toBe(true);
    });
  });

  describe('isSafeExternalUrl', () => {
    it('should allow safe https URLs', () => {
      expect(isSafeExternalUrl('https://example.com')).toBe(true);
      expect(isSafeExternalUrl('https://github.com/user/repo')).toBe(true);
    });

    it('should allow safe http URLs', () => {
      expect(isSafeExternalUrl('http://example.com')).toBe(true);
    });

    it('should reject javascript: URLs', () => {
      expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject data: URLs', () => {
      expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should reject file: URLs', () => {
      expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false);
    });

    it('should reject URLs with credentials', () => {
      expect(isSafeExternalUrl('https://user:pass@example.com')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(isSafeExternalUrl('not a url')).toBe(false);
    });

    it('should reject empty URLs', () => {
      expect(isSafeExternalUrl('')).toBe(false);
    });
  });

  describe('Common Open Redirect Attack Vectors', () => {
    const attackVectors = [
      // Protocol-based attacks
      { url: 'javascript:alert(document.cookie)', description: 'JavaScript protocol' },
      { url: 'data:text/html,<script>alert(1)</script>', description: 'Data URI with script' },
      { url: 'vbscript:msgbox(1)', description: 'VBScript protocol' },
      { url: 'file:///etc/passwd', description: 'File protocol' },

      // URL encoding attacks (when decoded become dangerous)
      { url: 'https://example.com/redirect?to=%2F%2Fevil.com', description: 'Encoded slashes in query' },

      // Credential injection
      { url: 'https://user:pass@evil.com', description: 'URL with credentials' },

      // Protocol confusion
      { url: 'https:evil.com', description: 'Missing slashes' },
      { url: '//evil.com', description: 'Protocol-relative URL' },

      // Path-based attacks
      { url: '/..%2F..%2F..%2Fetc%2Fpasswd', description: 'Path traversal attack' },
    ];

    attackVectors.forEach(({ url, description }) => {
      it(`should block: ${description} - ${url.substring(0, 30)}...`, () => {
        expect(isSafeRedirectUrl(url)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with fragments', () => {
      expect(isSafeRedirectUrl('/dashboard#section')).toBe(true);
      expect(isSafeRedirectUrl('https://confscout.site/page#anchor')).toBe(true);
    });

    it('should handle URLs with query parameters', () => {
      expect(isSafeRedirectUrl('/search?q=test')).toBe(true);
      expect(isSafeRedirectUrl('https://confscout.site/page?id=123')).toBe(true);
    });

    it('should handle URLs with both query and fragment', () => {
      expect(isSafeRedirectUrl('/search?q=test#results')).toBe(true);
    });

    it('should handle unicode in URLs', () => {
      expect(isSafeRedirectUrl('/café')).toBe(true);
      expect(isSafeRedirectUrl('/用户')).toBe(true);
    });

    it('should handle very long URLs', () => {
      const longPath = '/path' + '/segment'.repeat(100);
      expect(isSafeRedirectUrl(longPath)).toBe(true);
    });

    it('should handle URLs with special characters in query', () => {
      expect(isSafeRedirectUrl('/search?q=<script>')).toBe(true);
      expect(isSafeRedirectUrl('/search?q="quoted"')).toBe(true);
    });

    it('should reject URLs with null bytes', () => {
      expect(isSafeRedirectUrl('/dashboard\x00evil.com')).toBe(false);
    });

    it('should handle whitespace in URLs', () => {
      expect(isSafeRedirectUrl('  /dashboard  ')).toBe(true);
    });
  });
});
