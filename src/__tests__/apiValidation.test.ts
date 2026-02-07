/**
 * API Validation Schema Tests
 * 
 * Comprehensive tests for all Zod validation schemas used in API routes.
 * Tests cover valid inputs, invalid inputs, edge cases, and security concerns.
 */

import {
  querySchemas,
  bodySchemas,
  patterns,
} from '@/lib/apiSchemas';

describe('Validation Patterns', () => {
  describe('uuid pattern', () => {
    it('should match valid UUID v4', () => {
      expect(patterns.uuid.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(patterns.uuid.test('12345678-1234-4123-8123-123456789012')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(patterns.uuid.test('not-a-uuid')).toBe(false);
      expect(patterns.uuid.test('550e8400-e29b-41d4-a716')).toBe(false);
      expect(patterns.uuid.test('')).toBe(false);
    });
  });

  describe('safeString pattern', () => {
    it('should match safe strings', () => {
      expect(patterns.safeString.test('Hello World')).toBe(true);
      expect(patterns.safeString.test('test123')).toBe(true);
      expect(patterns.safeString.test('hello-world_test')).toBe(true);
    });

    it('should reject strings with dangerous characters', () => {
      expect(patterns.safeString.test('<script>')).toBe(false);
      expect(patterns.safeString.test('"quoted"')).toBe(false);
      expect(patterns.safeString.test("'single'")).toBe(true);
    });
  });

  describe('querySchemas.bookmarks', () => {
    it('should validate valid bookmark query', () => {
      const result = querySchemas.bookmarks.safeParse({
        conferenceId: 'conf-123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid bookmark query', () => {
      const result = querySchemas.bookmarks.safeParse({
        conferenceId: '<script>',
      });
      expect(result.success).toBe(false);
    });

    it('should reject overly long conferenceId', () => {
      const result = querySchemas.bookmarks.safeParse({
        conferenceId: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('conferenceId pattern', () => {
    it('should match valid conference IDs', () => {
      expect(patterns.conferenceId.test('conf-2024')).toBe(true);
      expect(patterns.conferenceId.test('abc123')).toBe(true);
      expect(patterns.conferenceId.test('test_conference')).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(patterns.conferenceId.test('<script>')).toBe(false);
      expect(patterns.conferenceId.test('id with spaces')).toBe(false);
    });
  });

  describe('hexToken pattern', () => {
    it('should match valid hex tokens', () => {
      expect(patterns.hexToken.test('abcdef123456')).toBe(true);
      expect(patterns.hexToken.test('ABCDEF')).toBe(true);
      expect(patterns.hexToken.test('1234567890')).toBe(true);
    });

    it('should reject non-hex tokens', () => {
      expect(patterns.hexToken.test('ghijkl')).toBe(false);
      expect(patterns.hexToken.test('test token')).toBe(false);
    });
  });

  describe('date pattern', () => {
    it('should match valid dates', () => {
      expect(patterns.date.test('2024-01-15')).toBe(true);
      expect(patterns.date.test('1999-12-31')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(patterns.date.test('01-15-2024')).toBe(false);
      expect(patterns.date.test('2024/01/15')).toBe(false);
      expect(patterns.date.test('invalid')).toBe(false);
    });
  });

  describe('domain pattern', () => {
    it('should match valid domains', () => {
      expect(patterns.domain.test('ai')).toBe(true);
      expect(patterns.domain.test('machine-learning')).toBe(true);
      expect(patterns.domain.test('web_dev')).toBe(true);
    });

    it('should reject invalid domains', () => {
      expect(patterns.domain.test('123domain')).toBe(false);
      expect(patterns.domain.test('-invalid')).toBe(false);
      expect(patterns.domain.test('')).toBe(false);
    });
  });
});

describe('Query Schema Validation', () => {
  describe('conferences query', () => {
    it('should validate valid query parameters', () => {
      const result = querySchemas.conferences.safeParse({
        domain: 'ai',
        cfpOpen: 'true',
        search: 'machine learning',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty query', () => {
      const result = querySchemas.conferences.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject domain with special characters', () => {
      const result = querySchemas.conferences.safeParse({
        domain: 'ai<script>',
      });
      expect(result.success).toBe(false);
    });

    it('should reject overly long search query', () => {
      const result = querySchemas.conferences.safeParse({
        search: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should reject search with dangerous characters', () => {
      const result = querySchemas.conferences.safeParse({
        search: '<script>alert(1)</script>',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('calendar query', () => {
    it('should validate valid conference IDs', () => {
      const result = querySchemas.calendar.safeParse({
        ids: 'conf1,conf2,conf3',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty query', () => {
      const result = querySchemas.calendar.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject overly long ID list', () => {
      const result = querySchemas.calendar.safeParse({
        ids: 'a,'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject IDs with dangerous characters', () => {
      const result = querySchemas.calendar.safeParse({
        ids: 'conf1<script>',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('unsubscribe query', () => {
    it('should validate valid token', () => {
      const validToken = 'a'.repeat(64);
      const result = querySchemas.unsubscribe.safeParse({ token: validToken });
      expect(result.success).toBe(true);
    });

    it('should reject short token', () => {
      const result = querySchemas.unsubscribe.safeParse({
        token: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-hex token', () => {
      const result = querySchemas.unsubscribe.safeParse({
        token: 'g'.repeat(64),
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing token', () => {
      const result = querySchemas.unsubscribe.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('v1 conferences query', () => {
    it('should validate valid query', () => {
      const result = querySchemas.v1Conferences.safeParse({
        domain: 'ai',
        cfp_open: 'true',
        format: 'json',
      });
      expect(result.success).toBe(true);
    });

    it('should default format to json', () => {
      const result = querySchemas.v1Conferences.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe('json');
      }
    });

    it('should accept csv format', () => {
      const result = querySchemas.v1Conferences.safeParse({
        format: 'csv',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid format', () => {
      const result = querySchemas.v1Conferences.safeParse({
        format: 'xml',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Body Schema Validation', () => {
  describe('subscribe body', () => {
    it('should validate valid subscription', () => {
      const result = bodySchemas.subscribe.safeParse({
        email: 'user@example.com',
        frequency: 'weekly',
      });
      expect(result.success).toBe(true);
    });

    it('should normalize email to lowercase', () => {
      const result = bodySchemas.subscribe.safeParse({
        email: 'USER@EXAMPLE.COM',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('should reject invalid email', () => {
      const result = bodySchemas.subscribe.safeParse({
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('should default frequency to weekly', () => {
      const result = bodySchemas.subscribe.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.frequency).toBe('weekly');
      }
    });
  });

  describe('conference submission body', () => {
    const validSubmission = {
      name: 'AI Conference 2024',
      url: 'https://example.com/conf',
      startDate: '2024-06-15',
      city: 'San Francisco',
      country: 'USA',
      domain: 'ai',
      online: false,
      organizerName: 'John Doe',
      organizerEmail: 'organizer@example.com',
    };

    it('should validate valid submission', () => {
      const result = bodySchemas.conferenceSubmission.safeParse(validSubmission);
      expect(result.success).toBe(true);
    });

    it('should reject XSS in name', () => {
      const result = bodySchemas.conferenceSubmission.safeParse({
        ...validSubmission,
        name: '<script>alert(1)</script>',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL', () => {
      const result = bodySchemas.conferenceSubmission.safeParse({
        ...validSubmission,
        url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = bodySchemas.conferenceSubmission.safeParse({
        ...validSubmission,
        startDate: '06-15-2024',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const result = bodySchemas.conferenceSubmission.safeParse({
        ...validSubmission,
        endDate: '2024-06-17',
        cfpUrl: 'https://example.com/cfp',
        cfpEndDate: '2024-05-01',
        description: 'A great conference',
        tags: ['ai', 'ml'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject overly long description', () => {
      const result = bodySchemas.conferenceSubmission.safeParse({
        ...validSubmission,
        description: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject too many tags', () => {
      const result = bodySchemas.conferenceSubmission.safeParse({
        ...validSubmission,
        tags: Array(21).fill('tag'),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('register body', () => {
    it('should validate valid registration', () => {
      const result = bodySchemas.register.safeParse({
        name: 'John Doe',
        email: 'user@example.com',
        password: 'SecurePass123!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject weak password', () => {
      const result = bodySchemas.register.safeParse({
        name: 'John Doe',
        email: 'user@example.com',
        password: 'weak',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = bodySchemas.register.safeParse({
        name: 'John Doe',
        email: 'user@example.com',
        password: 'securepass123!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = bodySchemas.register.safeParse({
        name: 'John Doe',
        email: 'user@example.com',
        password: 'SecurePass!!!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = bodySchemas.register.safeParse({
        name: 'John Doe',
        email: 'user@example.com',
        password: 'SecurePass123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('attendance body', () => {
    it('should validate valid attendance request', () => {
      const result = bodySchemas.attendance.safeParse({
        conferenceId: 'conf-123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid conference ID', () => {
      const result = bodySchemas.attendance.safeParse({
        conferenceId: '<script>',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('bookmark body', () => {
    it('should validate valid bookmark request', () => {
      const result = bodySchemas.bookmark.safeParse({
        conferenceId: 'conf-123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid conference ID', () => {
      const result = bodySchemas.bookmark.safeParse({
        conferenceId: '../../etc/passwd',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('bookmark status body', () => {
    it('should validate valid status update', () => {
      const result = bodySchemas.bookmarkStatus.safeParse({
        bookmarkId: 'bookmark-123',
        status: 'applied',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = bodySchemas.bookmarkStatus.safeParse({
        bookmarkId: 'bookmark-123',
        status: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('recommendations body', () => {
    it('should validate with interests', () => {
      const result = bodySchemas.recommendations.safeParse({
        interests: 'machine learning, ai',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with bio', () => {
      const result = bodySchemas.recommendations.safeParse({
        bio: 'I am a software engineer interested in AI.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject when both interests and bio are empty', () => {
      const result = bodySchemas.recommendations.safeParse({
        location: 'San Francisco',
      });
      expect(result.success).toBe(false);
    });

    it('should reject XSS in interests', () => {
      const result = bodySchemas.recommendations.safeParse({
        interests: '<script>alert(1)</script>',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Security Validation Tests', () => {
  describe('XSS prevention', () => {
    const xssPayloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      'onload=alert(1)',
      '<iframe src=javascript:alert(1)>',
    ];

    it.each(xssPayloads)('should reject XSS in conference name: %s', (payload) => {
      const result = bodySchemas.conferenceSubmission.safeParse({
        name: payload,
        url: 'https://example.com',
        startDate: '2024-06-15',
        city: 'City',
        country: 'Country',
        domain: 'test',
        online: false,
        organizerName: 'Name',
        organizerEmail: 'test@example.com',
      });
      expect(result.success).toBe(false);
    });

    it.each(xssPayloads)('should reject XSS in description: %s', (payload) => {
      const result = bodySchemas.conferenceSubmission.safeParse({
        name: 'Valid Name',
        url: 'https://example.com',
        startDate: '2024-06-15',
        city: 'City',
        country: 'Country',
        domain: 'test',
        online: false,
        organizerName: 'Name',
        organizerEmail: 'test@example.com',
        description: payload,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('injection prevention', () => {
    it('should reject path traversal in IDs', () => {
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '%2e%2e%2f',
        '..%2f..%2f..%2fetc%2fpasswd',
      ];

      traversalPayloads.forEach(payload => {
        const result = bodySchemas.attendance.safeParse({
          conferenceId: payload,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should reject NoSQL injection attempts', () => {
      const nosqlPayloads = [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$regex": ".*"}',
      ];

      nosqlPayloads.forEach(payload => {
        const result = bodySchemas.bookmark.safeParse({
          conferenceId: payload,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('oversized input prevention', () => {
    it('should reject oversized emails', () => {
      const longLocalPart = 'a'.repeat(250);
      const result = bodySchemas.subscribe.safeParse({
        email: `${longLocalPart}@example.com`,
      });
      expect(result.success).toBe(false);
    });

    it('should reject oversized passwords', () => {
      const result = bodySchemas.register.safeParse({
        name: 'User',
        email: 'user@example.com',
        password: 'A1!' + 'a'.repeat(130),
      });
      expect(result.success).toBe(false);
    });

    it('should reject oversized search queries', () => {
      const result = querySchemas.conferences.safeParse({
        search: 'a'.repeat(300),
      });
      expect(result.success).toBe(false);
    });
  });
});
