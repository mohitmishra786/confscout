import type { Conference } from '@/types/conference';

/**
 * Validate that an object is a valid Conference
 * Prevents prototype pollution and ensures data integrity
 */
export function isValidConference(conf: unknown): conf is Conference {
  if (!conf || typeof conf !== 'object' || Array.isArray(conf)) {
    return false;
  }

  const c = conf as Record<string, unknown>;

  // Ensure all required fields are present and of correct type
  // FieldDescriptor definition: { name: string; type: string; optional?: boolean; nullable?: boolean }
  const requiredFields: Array<{ name: string; type: string; optional?: boolean; nullable?: boolean }> = [
    { name: 'id', type: 'string', optional: false, nullable: false },
    { name: 'name', type: 'string', optional: false, nullable: false },
    { name: 'url', type: 'string', optional: false, nullable: false },
    { name: 'startDate', type: 'string', optional: false, nullable: true },
    { name: 'endDate', type: 'string', optional: false, nullable: true },
    { name: 'location', type: 'object', optional: false, nullable: false },
    { name: 'online', type: 'boolean', optional: false, nullable: false },
    { name: 'domain', type: 'string', optional: false, nullable: false },
    { name: 'source', type: 'string', optional: false, nullable: false },
    { name: 'cfp', type: 'object', optional: false, nullable: true },
  ];

  for (const field of requiredFields) {
    const value = c[field.name];
    
    // 1. Reject missing keys when optional is false
    if (!field.optional && value === undefined) return false;
    
    // 2. Only allow null when descriptor.nullable is true
    if (value === null) {
      if (!field.nullable) return false;
      continue; // null is valid for this field
    }
    
    // 3. Check typeof against field.type when value is not null/undefined
    if (value !== undefined && typeof value !== field.type) return false;
  }

  // Validate nested objects
  if (c.location && typeof c.location === 'object') {
    const loc = c.location as Record<string, unknown>;
    if (typeof loc.city !== 'string' && loc.city !== null) return false;
    if (typeof loc.country !== 'string' && loc.country !== null) return false;
  }

  if (c.cfp && typeof c.cfp === 'object') {
    const cfp = c.cfp as Record<string, unknown>;
    if (cfp.url !== undefined && typeof cfp.url !== 'string' && cfp.url !== null) return false;
    if (cfp.endDate !== undefined && typeof cfp.endDate !== 'string' && cfp.endDate !== null) return false;
  }

  // Prevent prototype pollution
  // Check if the object contains dangerous keys
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  
  // Check own properties
  if (Object.keys(c).some(key => dangerousKeys.includes(key))) {
    return false;
  }

  // Check if it's a plain object (no custom prototype)
  const proto = Object.getPrototypeOf(c);
  if (proto !== null && proto !== Object.prototype) {
    return false;
  }

  return true;
}

/**
 * Sanitize text to prevent XSS in HTML attributes or other contexts
 * This is a defense-in-depth measure
 */
export function sanitizeXSS(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;') // SECURITY FIX: Escape ampersands first to prevent entity-decode bypass
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\0/g, ''); // SECURITY FIX: Strip null bytes
}

/**
 * Sanitize string values to prevent XSS in JSON-LD
 * Comprehensive sanitization to remove scripts, event handlers, and dangerous content
 */
export function sanitizeJsonLdValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove all event handlers (onerror, onload, onclick, etc.) - only in HTML-tag-like context
      .replace(/(<[^>]*)\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]*)/gi, '$1')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove all data: URLs that could execute scripts or contain malicious content
      .replace(/data:[^\s;,]*/gi, '')
      // Strip null bytes
      .replace(/\0/g, '');
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeJsonLdValue);
  }

  if (value !== null && typeof value === 'object') {
    // SECURITY: Use Object.create(null) to prevent prototype pollution
    const sanitized: Record<string, unknown> = Object.create(null);
    for (const [key, val] of Object.entries(value)) {
      // Skip prototype keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      sanitized[key] = sanitizeJsonLdValue(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Safely serialize JSON-LD data
 * Uses HTML escaping in the JSON string to prevent breaking out of the script tag
 */
export function serializeSafeJsonLd(data: Record<string, unknown>): string {
  const sanitizedData = sanitizeJsonLdValue(data);
  return JSON.stringify(sanitizedData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}
