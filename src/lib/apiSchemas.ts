/**
 * Centralized API Validation Schemas
 * 
 * This module contains all Zod validation schemas used across API routes.
 * Centralizing schemas ensures consistency and makes maintenance easier.
 */

import { z } from 'zod';

/**
 * Common validation patterns
 */
export const patterns = {
  // UUID v4 pattern
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Safe string pattern (no dangerous characters or javascript protocol)
  // Allows: single quotes, ampersands, parentheses - blocks: < > " ` and javascript: / on* handlers
  safeString: /^(?!javascript:)(?!on\w+=)[^<>\"`]*$/i,
  
  // Conference ID pattern (alphanumeric with hyphens)
  conferenceId: /^[a-zA-Z0-9-_]+$/,
  
  // Token pattern (hex string)
  hexToken: /^[a-f0-9]+$/i,
  
  // Date pattern (YYYY-MM-DD)
  date: /^\d{4}-\d{2}-\d{2}$/,
  
  // Domain pattern
  domain: /^[a-zA-Z][a-zA-Z0-9-_]*$/,
};

/**
 * Query parameter validators for GET requests
 */
export const querySchemas = {
  /**
   * Conference list query parameters
   */
  conferences: z.object({
    domain: z.union([
      z.string().regex(patterns.domain, 'Invalid domain format').max(50, 'Domain too long'),
      z.literal('all'),
    ]).optional(),
    cfpOpen: z.enum(['true', 'false']).optional(),
    search: z.string()
      .max(200, 'Search query too long')
      .regex(patterns.safeString, 'Invalid characters in search')
      .optional(),
    page: z.preprocess((val) => (val === null ? undefined : val), z.coerce.number().int().positive().default(1)),
    limit: z.preprocess((val) => (val === null ? undefined : val), z.coerce.number().int().positive().max(100).default(50)),
  }),

  /**
   * Calendar export query parameters
   */
  calendar: z.object({
    ids: z.string()
      .max(2000, 'Too many conference IDs')
      .regex(/^[a-zA-Z0-9-_:,]*$/, 'Invalid conference IDs format')
      .optional(),
  }),

  /**
   * Unsubscribe query parameters
   */
  unsubscribe: z.object({
    token: z.string()
      .regex(patterns.hexToken, 'Invalid token format')
      .length(64, 'Invalid token length'),
  }),

  /**
   * API v1 conference list query parameters
   */
  v1Conferences: z.object({
    domain: z.union([
      z.string().regex(patterns.domain, 'Invalid domain format').max(50, 'Domain too long'),
      z.literal('all'),
    ]).optional(),
    cfp_open: z.enum(['true', 'false']).optional(),
    format: z.enum(['json', 'csv']).default('json'),
  }),

  /**
   * Bookmark operations query parameters
   */
  bookmarks: z.object({
    conferenceId: z.string()
      .regex(patterns.conferenceId, 'Invalid conference ID')
      .max(100, 'Conference ID too long'),
  }),
};

/**
 * Body validators for POST/PATCH requests
 */
export const bodySchemas = {
  /**
   * Subscription request body
   */
  subscribe: z.object({
    email: z.string()
      .email('Invalid email format')
      .max(254, 'Email too long')
      .toLowerCase(),
    preferences: z.record(z.string(), z.any())
      .optional(),
    frequency: z.enum(['daily', 'weekly'])
      .default('weekly'),
  }),

  /**
   * Conference submission body
   */
  conferenceSubmission: z.object({
    name: z.string()
      .min(2, 'Conference name must be at least 2 characters')
      .max(200, 'Conference name too long')
      .regex(patterns.safeString, 'Invalid characters in name'),
    url: z.string()
      .url('Invalid URL format')
      .max(500, 'URL too long'),
    startDate: z.string()
      .regex(patterns.date, 'Invalid date format (YYYY-MM-DD)'),
    endDate: z.string()
      .regex(patterns.date, 'Invalid date format (YYYY-MM-DD)')
      .optional(),
    city: z.string()
      .min(1, 'City is required')
      .max(100, 'City name too long')
      .regex(patterns.safeString, 'Invalid characters in city'),
    country: z.string()
      .min(1, 'Country is required')
      .max(100, 'Country name too long')
      .regex(patterns.safeString, 'Invalid characters in country'),
    online: z.boolean().default(false),
    domain: z.string()
      .min(1, 'Domain is required')
      .max(50, 'Domain too long')
      .regex(patterns.domain, 'Invalid domain format'),
    cfpUrl: z.string()
      .url('Invalid CFP URL')
      .max(500, 'CFP URL too long')
      .optional(),
    cfpEndDate: z.string()
      .regex(patterns.date, 'Invalid CFP date format')
      .optional(),
    hasFinancialAid: z.boolean().default(false),
    financialAidTypes: z.array(z.string().max(50)).max(10).optional(),
    description: z.string()
      .max(500, 'Description must be less than 500 characters')
      .regex(patterns.safeString, 'Invalid characters in description')
      .optional(),
    tags: z.array(z.string().max(30)).max(20).optional(),
    organizerName: z.string()
      .min(2, 'Organizer name is required')
      .max(100, 'Organizer name too long')
      .regex(patterns.safeString, 'Invalid characters in organizer name'),
    organizerEmail: z.string()
      .email('Invalid email format')
      .max(254, 'Email too long')
      .toLowerCase(),
    submissionType: z.enum(['update', 'new']).default('new'),
    additionalNotes: z.string()
      .max(1000, 'Notes must be less than 1000 characters')
      .regex(patterns.safeString, 'Invalid characters in notes')
      .optional(),
  }),

  /**
   * User registration body
   */
  register: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name too long')
      .regex(patterns.safeString, 'Invalid characters in name'),
    email: z.string()
      .email('Invalid email address')
      .max(254, 'Email too long')
      .toLowerCase(),
    password: z.string()
      .min(10, 'Password must be at least 10 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  }),

  /**
   * Attendance toggle body
   */
  attendance: z.object({
    conferenceId: z.string()
      .regex(patterns.conferenceId, 'Invalid conference ID')
      .max(100, 'Conference ID too long'),
  }),

  /**
   * Bookmark creation body
   */
  bookmark: z.object({
    conferenceId: z.string()
      .regex(patterns.conferenceId, 'Invalid conference ID')
      .max(100, 'Conference ID too long'),
  }),

  /**
   * Bookmark status update body
   */
  bookmarkStatus: z.object({
    bookmarkId: z.string()
      .regex(patterns.conferenceId, 'Invalid bookmark ID')
      .max(100, 'Bookmark ID too long'),
    status: z.enum(['saved', 'applied', 'accepted', 'rejected']),
  }),

  /**
   * AI recommendations request body
   */
  recommendations: z.object({
    interests: z.string()
      .max(500, 'Interests too long')
      .regex(patterns.safeString, 'Invalid characters')
      .optional(),
    bio: z.string()
      .max(1000, 'Bio too long')
      .regex(patterns.safeString, 'Invalid characters')
      .optional(),
    location: z.string()
      .max(100, 'Location too long')
      .regex(patterns.safeString, 'Invalid characters')
      .optional(),
  }).refine(
    data => data.interests || data.bio,
    { message: 'Either interests or bio must be provided', path: ['interests'] }
  ),
};

/**
 * Type exports for TypeScript
 */
export type SubscribeInput = z.infer<typeof bodySchemas.subscribe>;
export type ConferenceSubmissionInput = z.infer<typeof bodySchemas.conferenceSubmission>;
export type RegisterInput = z.infer<typeof bodySchemas.register>;
export type AttendanceInput = z.infer<typeof bodySchemas.attendance>;
export type BookmarkInput = z.infer<typeof bodySchemas.bookmark>;
export type BookmarkStatusInput = z.infer<typeof bodySchemas.bookmarkStatus>;
export type RecommendationsInput = z.infer<typeof bodySchemas.recommendations>;
export type ConferencesQuery = z.infer<typeof querySchemas.conferences>;
export type CalendarQuery = z.infer<typeof querySchemas.calendar>;
export type UnsubscribeQuery = z.infer<typeof querySchemas.unsubscribe>;
export type V1ConferencesQuery = z.infer<typeof querySchemas.v1Conferences>;
