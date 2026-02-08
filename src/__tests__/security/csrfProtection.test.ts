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
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn();
});
afterAll(() => {
  global.fetch = originalFetch;
});

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
    (global.fetch as jest.Mock).mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
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
    const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    methods.forEach(method => {
      it(`should attach CSRF header to ${method} requests`, async () => {
        const token = 'test-csrf-token';
        document.cookie = `${CSRF_COOKIE}=${token}`;

        await secureFetch('/api/test', { method });

        expect(fetch).toHaveBeenCalled();
        const call = (fetch as jest.Mock).mock.calls[0];
        const headers = call[1].headers as Headers;
        expect(headers.get(CSRF_HEADER)).toBe(token);
        
        jest.clearAllMocks();
      });
    });

    it('should NOT attach CSRF header to GET requests by default', async () => {
      const token = 'test-csrf-token';
      document.cookie = `${CSRF_COOKIE}=${token}`;

      await secureFetch('/api/test'); // Default GET

      const call = (fetch as jest.Mock).mock.calls[0];
      const headers = call[1].headers as Headers;
      
      expect(headers.get(CSRF_HEADER)).toBeNull();
    });

    it('should handle missing cookie gracefully', async () => {
      document.cookie = ''; // No token

      await secureFetch('/api/test', { method: 'POST' });

      const call = (fetch as jest.Mock).mock.calls[0];
      const headers = call[1].headers as Headers;
      
      expect(headers.get(CSRF_HEADER)).toBeNull();
    });
  });
});
