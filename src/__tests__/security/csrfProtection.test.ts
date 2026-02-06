/**
 * Security Tests for CSRF Protection
 *
 * Verifies the CSRF token generation, validation, and secure fetch logic.
 */

import { generateCsrfToken, validateCsrfToken, CSRF_COOKIE, CSRF_HEADER } from '@/lib/csrf';
import { secureFetch } from '@/lib/api';

// Mock cookies and headers
const mockCookies = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockHeaders = {
  get: jest.fn(),
  set: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: () => Promise.resolve(mockCookies),
  headers: () => mockHeaders,
}));

// Mock global fetch
global.fetch = jest.fn();

// Setup document mock for Node environment
if (typeof document === 'undefined') {
  Object.defineProperty(global, 'document', {
    value: {
      cookie: '',
    },
    writable: true,
  });
}

describe('CSRF Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = '';
  });

  describe('Token Generation', () => {
    it('should generate a non-empty string token', () => {
      const token = generateCsrfToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('Token Validation', () => {
    it('should return false if cookie is missing', async () => {
      mockCookies.get.mockReturnValue(undefined);
      
      const request = new Request('http://localhost', {
        headers: { [CSRF_HEADER]: 'some-token' }
      });

      const isValid = await validateCsrfToken(request);
      expect(isValid).toBe(false);
    });

    it('should return false if header is missing', async () => {
      mockCookies.get.mockReturnValue({ value: 'some-token' });
      
      const request = new Request('http://localhost');

      const isValid = await validateCsrfToken(request);
      expect(isValid).toBe(false);
    });

    it('should return false if tokens do not match', async () => {
      mockCookies.get.mockReturnValue({ value: 'token-a' });
      
      const request = new Request('http://localhost', {
        headers: { [CSRF_HEADER]: 'token-b' }
      });

      const isValid = await validateCsrfToken(request);
      expect(isValid).toBe(false);
    });

    it('should return true if tokens match', async () => {
      const token = 'valid-token-123';
      mockCookies.get.mockReturnValue({ value: token });
      
      const request = new Request('http://localhost', {
        headers: { [CSRF_HEADER]: token }
      });

      const isValid = await validateCsrfToken(request);
      expect(isValid).toBe(true);
    });
  });

  describe('Client-side Secure Fetch', () => {
    it('should attach CSRF header to POST requests', async () => {
      const token = 'test-csrf-token';
      document.cookie = `${CSRF_COOKIE}=${token}`;

      await secureFetch('/api/test', { method: 'POST' });

      expect(fetch).toHaveBeenCalled();
      const call = (fetch as jest.Mock).mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get(CSRF_HEADER)).toBe(token);
    });

    it('should attach CSRF header to PUT/PATCH/DELETE requests', async () => {
      const token = 'test-csrf-token';
      document.cookie = `${CSRF_COOKIE}=${token}`;

      await secureFetch('/api/test', { method: 'DELETE' });

      expect(fetch).toHaveBeenCalled();
      const call = (fetch as jest.Mock).mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get(CSRF_HEADER)).toBe(token);
    });

    it('should NOT attach CSRF header to GET requests by default', async () => {
      const token = 'test-csrf-token';
      document.cookie = `${CSRF_COOKIE}=${token}`;

      await secureFetch('/api/test'); // Default GET

      // Headers might be Headers object or simple object. 
      // secureFetch creates Headers object.
      // fetch mock receives what secureFetch passes.
      const calls = (fetch as jest.Mock).mock.calls;
      const options = calls[0][1];
      const headers = options.headers as Headers;
      
      // Headers object check
      expect(headers.get(CSRF_HEADER)).toBeNull();
    });

    it('should handle missing cookie gracefully', async () => {
      document.cookie = ''; // No token

      await secureFetch('/api/test', { method: 'POST' });

      const calls = (fetch as jest.Mock).mock.calls;
      const headers = calls[0][1].headers as Headers;
      
      expect(headers.get(CSRF_HEADER)).toBeNull();
    });
  });
});
