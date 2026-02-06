/**
 * SafeJsonLd Component
 *
 * Safely serializes JSON-LD structured data for SEO.
 * Prevents XSS through HTML injection in JSON content.
 */

import React from 'react';
import { sanitizeJsonLdValue } from '@/lib/validation';

interface SafeJsonLdProps {
  data: Record<string, unknown>;
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
