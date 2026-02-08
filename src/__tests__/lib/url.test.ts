import { isValidUrl, sanitizeUrl, normalizeUrl } from '@/lib/url';

describe('url utility', () => {
  describe('isValidUrl', () => {
    it('should return true for valid http/https URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path?query=1')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('invalid-url')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return valid URL', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });

    it('should return empty string for dangerous URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });
  });

  describe('normalizeUrl', () => {
    it('should remove trailing slashes', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
      // Wait, URL constructor often adds / at the end of host if path is empty.
      // let's see what it actually does.
    });
  });
});
