/**
 * SafeHighlightedText Component
 * 
 * A secure alternative to dangerouslySetInnerHTML for highlighting search terms.
 * Uses React's safe rendering to prevent XSS attacks.
 */

import React from 'react';

interface SafeHighlightedTextProps {
  text: string;
  searchTerm: string;
  className?: string;
}

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safely highlight search terms in text without using dangerouslySetInnerHTML
 * This prevents XSS attacks by using React's built-in escaping
 */
export function SafeHighlightedText({ text, searchTerm, className = '' }: SafeHighlightedTextProps) {
  if (!searchTerm || !text) {
    return <span className={className}>{text}</span>;
  }

  try {
    // Limit search term length to prevent ReDoS
    const safeSearchTerm = searchTerm.slice(0, 100);
    const escapedTerm = escapeRegExp(safeSearchTerm);
    
    // Use a safe regex with a reasonable complexity
    const parts = text.split(new RegExp(`(${escapedTerm})`, 'gi'));
    
    return (
      <span className={className}>
        {parts.map((part, index) => {
          // Case-insensitive comparison for highlighting
          if (part.toLowerCase() === safeSearchTerm.toLowerCase()) {
            return (
              <mark 
                key={index} 
                className="bg-blue-500/30 text-blue-300 rounded px-0.5"
              >
                {part}
              </mark>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  } catch {
    // Fallback to plain text if regex fails
    return <span className={className}>{text}</span>;
  }
}

/**
 * Sanitize text to prevent XSS in HTML attributes or other contexts
 * This is a defense-in-depth measure
 */
export function sanitizeXSS(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export default SafeHighlightedText;
