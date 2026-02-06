/**
 * SafeJsonLd Component
 *
 * Safely serializes JSON-LD structured data for SEO.
 * Prevents XSS through HTML injection in JSON content.
 */

import React from 'react';

interface SafeJsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Sanitize string values to prevent XSS in JSON-LD
 */
function sanitizeJsonLdValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove script tags and event handlers
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '');
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonLdValue);
  }
  
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
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
export function SafeJsonLd({ data }: SafeJsonLdProps) {
  // Sanitize the data first
  const sanitizedData = sanitizeJsonLdValue(data);
  
  // Serialize with HTML escaping
  // This prevents </script> injection attacks
  const jsonString = JSON.stringify(sanitizedData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}

export default SafeJsonLd;
