/**
 * SafeJsonLd Component
 *
 * Safely serializes JSON-LD structured data for SEO.
 * Prevents XSS through HTML injection in JSON content.
 */

import React from 'react';
import { serializeSafeJsonLd } from '@/lib/validation';

interface SafeJsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Safely serialize JSON-LD structured data for SEO.
 * Prevents XSS through HTML injection in JSON content.
 */
export function SafeJsonLd({ data }: SafeJsonLdProps) {
  const jsonString = serializeSafeJsonLd(data);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}

export default SafeJsonLd;
