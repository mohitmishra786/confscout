/**
 * SafeHighlightedText Component
 *
 * A secure alternative to dangerouslySetInnerHTML for highlighting search terms.
 * Uses React's safe rendering to prevent XSS attacks.
 *
 * Issue #94: avoid building a RegExp on every render for the common case.
 * Case-insensitive indexOf scanning is faster and ReDoS-safe for plain terms.
 */

import React, { useMemo } from 'react';

interface SafeHighlightedTextProps {
  text: string;
  searchTerm: string;
  className?: string;
}

interface HighlightPart {
  key: string;
  value: string;
  match: boolean;
}

/**
 * Split `text` into alternating non-match / match segments without RegExp.
 */
function splitHighlight(text: string, term: string): HighlightPart[] {
  if (!term || !text) {
    return [{ key: 'full', value: text, match: false }];
  }

  const safeTerm = term.slice(0, 100);
  const lowerText = text.toLowerCase();
  const lowerTerm = safeTerm.toLowerCase();
  if (!lowerTerm) {
    return [{ key: 'full', value: text, match: false }];
  }

  const parts: HighlightPart[] = [];
  let start = 0;
  let idx = lowerText.indexOf(lowerTerm, start);
  let n = 0;

  while (idx !== -1) {
    if (idx > start) {
      parts.push({
        key: `t-${n++}`,
        value: text.slice(start, idx),
        match: false,
      });
    }
    parts.push({
      key: `m-${n++}`,
      value: text.slice(idx, idx + safeTerm.length),
      match: true,
    });
    start = idx + safeTerm.length;
    idx = lowerText.indexOf(lowerTerm, start);
  }

  if (start < text.length) {
    parts.push({
      key: `t-${n++}`,
      value: text.slice(start),
      match: false,
    });
  }

  return parts.length > 0 ? parts : [{ key: 'full', value: text, match: false }];
}

/**
 * Safely highlight search terms in text without using dangerouslySetInnerHTML.
 */
export function SafeHighlightedText({
  text,
  searchTerm,
  className = '',
}: SafeHighlightedTextProps) {
  const parts = useMemo(
    () => splitHighlight(text, searchTerm),
    [text, searchTerm]
  );

  if (!searchTerm || !text) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part) =>
        part.match ? (
          <mark
            key={part.key}
            className="bg-blue-500/30 text-blue-300 rounded px-0.5"
          >
            {part.value}
          </mark>
        ) : (
          <span key={part.key}>{part.value}</span>
        )
      )}
    </span>
  );
}

export default SafeHighlightedText;
