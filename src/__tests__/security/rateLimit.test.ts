/**
 * Rate Limiting Tests
 * 
 * Comprehensive tests for rate limiting functionality.
 * Issue #265 - Add Rate Limiting
 */

import { NextRequest } from 'next/server';
import {
  getClientIP,
  createRateLimitKey,
  fixedWindow,
  slidingWindow,
  cleanupRateLimitStore,
  getRateLimitHeaders,
  createRateLimitResponse,
  rateLimitConfigs,
  rateLimitMiddleware,
} from '@/lib/rateLimit';

describe('Rate Limiting (Issue #265)', () => {
  // Mock cleanup before each test
  beforeEach(() => {
    cleanupRateLimitStore(0);
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        }
      });
      
      expect(getClientIP(request)).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-real-ip': '192.168.1.2'
        }
      });
      
      expect(getClientIP(request)).toBe('192.168.1.2');
    });

    it('should extract IP from cf-connecting-ip header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'cf-connecting-ip': '192.168.1.3'
        }
      });
      
      expect(getClientIP(request)).toBe('192.168.1.3');
    });

    it('should fallback to 127.0.0.1 when no headers present', () => {
      const request = new NextRequest('http://localhost/api/test');
      
      expect(getClientIP(request)).toBe('127.0.0.1');
    });

    it('should handle IPv6 addresses', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '2001:db8::1'
        }
      });
      
      expect(getClientIP(request)).toBe('2001:db8::1');
    });
  });

  describe('createRateLimitKey', () => {
    it('should create key with IP and path', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });
      
      const key = createRateLimitKey(request);
      expect(key).toBe('192.168.1.1:/api/test');
    });

    it('should create key with custom identifier', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });
      
      const key = createRateLimitKey(request, 'custom-id');
      expect(key).toBe('192.168.1.1:custom-id');
    });
  });

  describe('fixedWindow', () => {
    it('should allow requests within limit', () => {
      const config = {
        maxRequests: 5,
        windowSeconds: 60
      };
      
      const result = fixedWindow('test-key', config);
      
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it('should block requests over limit', () => {
      const config = {
        maxRequests: 2,
        windowSeconds: 60
      };
      
      // Make 2 requests
      fixedWindow('test-key', config);
      fixedWindow('test-key', config);
      
      // Third request should be blocked
      const result = fixedWindow('test-key', config);
      
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset counter after window expires', () => {
      jest.useFakeTimers();
      const config = {
        maxRequests: 2,
        windowSeconds: 60
      };
      
      // Max out the limit
      fixedWindow('test-key', config);
      fixedWindow('test-key', config);
      
      // Advance time past the window
      jest.advanceTimersByTime(61000);
      
      // Should be allowed again
      const result = fixedWindow('test-key', config);
      expect(result.success).toBe(true);
      
      jest.useRealTimers();
    });

    it('should use key prefix when provided', () => {
      const config = {
        maxRequests: 5,
        windowSeconds: 60,
        keyPrefix: 'auth'
      };
      
      const result = fixedWindow('test-key', config);
      expect(result.success).toBe(true);
    });
  });

  describe('slidingWindow', () => {
    it('should allow requests within limit', () => {
      const config = {
        maxRequests: 5,
        windowSeconds: 60
      };
      
      const result = slidingWindow('slide-key', config);
      
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should block requests over limit', () => {
      const config = {
        maxRequests: 2,
        windowSeconds: 60
      };
      
      slidingWindow('slide-key', config);
      slidingWindow('slide-key', config);
      
      const result = slidingWindow('slide-key', config);
      
      expect(result.success).toBe(false);
    });

    it('should provide reset timestamp', () => {
      const config = {
        maxRequests: 5,
        windowSeconds: 60
      };
      
      const before = Math.floor(Date.now() / 1000);
      const result = slidingWindow('slide-key', config);
      const after = Math.floor(Date.now() / 1000) + 65; // Add buffer for test execution time
      
      expect(result.reset).toBeGreaterThanOrEqual(before);
      expect(result.reset).toBeLessThanOrEqual(after);
    });
  });

  describe('cleanupRateLimitStore', () => {
    it('should remove expired entries', () => {
      jest.useFakeTimers();
      
      const config = {
        maxRequests: 5,
        windowSeconds: 1
      };
      
      // Create some entries
      slidingWindow('key1', config);
      slidingWindow('key2', config);
      
      // Advance time
      jest.advanceTimersByTime(2000);
      
      // Cleanup should remove expired entries
      cleanupRateLimitStore(0);
      
      // New requests should succeed (old entries removed)
      const result1 = slidingWindow('key1', config);
      expect(result1.success).toBe(true);
      
      jest.useRealTimers();
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return correct headers', () => {
      const result = {
        success: true,
        remaining: 42,
        reset: 1234567890,
        limit: 100
      };
      
      const headers = getRateLimitHeaders(result);
      
      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('42');
      expect(headers['X-RateLimit-Reset']).toBe('1234567890');
    });
  });

  describe('createRateLimitResponse', () => {
    it('should create 429 response with headers', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = {
        success: false,
        remaining: 0,
        reset: now + 60,
        limit: 100
      };
      
      const response = createRateLimitResponse(result);
      
      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('should include custom message', async () => {
      const result = {
        success: false,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + 60,
        limit: 100
      };
      
      const response = createRateLimitResponse(result, 'Custom rate limit message');
      const body = await response.json();
      
      expect(body.message).toBe('Custom rate limit message');
    });
  });

  describe('rateLimitConfigs', () => {
    it('should have auth config with strict limits', () => {
      expect(rateLimitConfigs.auth.maxRequests).toBe(5);
      expect(rateLimitConfigs.auth.windowSeconds).toBe(60);
      expect(rateLimitConfigs.auth.keyPrefix).toBe('auth');
    });

    it('should have api config with standard limits', () => {
      expect(rateLimitConfigs.api.maxRequests).toBe(100);
      expect(rateLimitConfigs.api.windowSeconds).toBe(60);
      expect(rateLimitConfigs.api.keyPrefix).toBe('api');
    });

    it('should have public config with lenient limits', () => {
      expect(rateLimitConfigs.public.maxRequests).toBe(1000);
      expect(rateLimitConfigs.public.windowSeconds).toBe(60);
      expect(rateLimitConfigs.public.keyPrefix).toBe('public');
    });

    it('should have strict config for sensitive operations', () => {
      expect(rateLimitConfigs.strict.maxRequests).toBe(3);
      expect(rateLimitConfigs.strict.windowSeconds).toBe(60);
      expect(rateLimitConfigs.strict.keyPrefix).toBe('strict');
    });
  });

  describe('rateLimitMiddleware', () => {
    it('should allow requests within limit', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      });
      
      const config = {
        maxRequests: 5,
        windowSeconds: 60
      };
      
      const result = rateLimitMiddleware(request, config);
      
      expect(result.allowed).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('should block requests over limit', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.2'
        }
      });
      
      const config = {
        maxRequests: 1,
        windowSeconds: 60
      };
      
      // First request allowed
      rateLimitMiddleware(request, config);
      
      // Second request blocked
      const result = rateLimitMiddleware(request, config);
      
      expect(result.allowed).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should skip when skip function returns true', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.3'
        }
      });
      
      const config = {
        maxRequests: 1,
        windowSeconds: 60,
        skip: () => true
      };
      
      // Should skip rate limiting
      const result = rateLimitMiddleware(request, config);
      
      expect(result.allowed).toBe(true);
      expect(result.result).toBeUndefined();
    });
  });

  describe('Rate Limit Headers in Response', () => {
    it('should include rate limit headers when request allowed', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.4'
        }
      });
      
      const config = {
        maxRequests: 10,
        windowSeconds: 60
      };
      
      const { allowed, result } = rateLimitMiddleware(request, config);
      
      expect(allowed).toBe(true);
      expect(result?.remaining).toBeLessThan(10);
    });
  });
});
