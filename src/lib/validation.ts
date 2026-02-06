import { Conference } from '@/types/conference';

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
  const requiredFields: Array<{ name: string; type: string; optional?: boolean }> = [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'url', type: 'string' },
    { name: 'startDate', type: 'string', optional: true },
    { name: 'endDate', type: 'string', optional: true },
    { name: 'location', type: 'object' },
    { name: 'online', type: 'boolean' },
    { name: 'domain', type: 'string' },
    { name: 'source', type: 'string' },
  ];

  for (const field of requiredFields) {
    const value = c[field.name];
    if (!field.optional && value === undefined) return false;
    if (value !== undefined && typeof value !== field.type && value !== null) return false;
  }

  // Validate nested objects
  if (c.location && typeof c.location === 'object') {
    const loc = c.location as Record<string, unknown>;
    if (typeof loc.city !== 'string' && loc.city !== null) return false;
    if (typeof loc.country !== 'string' && loc.country !== null) return false;
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
      // Remove all event handlers (onerror, onload, onclick, etc.) - handles various formats
      .replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]*)?/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove data: URLs that could execute scripts
      .replace(/data:text\/html[^,]*/gi, '')
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
