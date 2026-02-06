/**
 * SVG Sanitization Utilities
 *
 * Provides functions to sanitize SVG content and prevent XSS attacks.
 * SVG files can contain JavaScript that executes when the SVG is rendered,
 * making them a potential XSS vector if user-uploaded SVGs are not sanitized.
 */

/**
 * Sanitizes SVG content by removing dangerous elements and attributes.
 * This prevents XSS attacks through SVG files.
 *
 * @param svgContent - The SVG content to sanitize
 * @returns string - The sanitized SVG content
 */
export function sanitizeSvg(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') {
    return '';
  }

  let sanitized = svgContent;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onload, onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]*)?/gi, '');

  // Remove javascript: protocol in href/xlink:href attributes
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  sanitized = sanitized.replace(/xlink:href\s*=\s*["']javascript:[^"']*["']/gi, '');

  // Remove data: URLs that could contain JavaScript
  sanitized = sanitized.replace(/href\s*=\s*["']data:text\/html[^"']*["']/gi, '');

  // Remove foreignObject elements (can contain HTML)
  sanitized = sanitized.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');

  return sanitized;
}

/**
 * Validates if a string appears to be a valid SVG.
 * Basic check to ensure the content starts with SVG-related tags.
 *
 * @param content - The content to validate
 * @returns boolean - True if the content appears to be an SVG
 */
export function isValidSvg(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const trimmed = content.trim().toLowerCase();

  // Check for SVG tag
  if (!trimmed.includes('<svg')) {
    return false;
  }

  // Check for obvious non-SVG content
  if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
    return false;
  }

  // Check for image file signatures (indicating binary image data, not SVG)
  const binarySignatures = [
    '\x89PNG',     // PNG
    '\xff\xd8\xff', // JPEG
    'GIF87a',      // GIF
    'GIF89a',      // GIF
    'RIFF',        // WebP (RIFF container)
  ];

  for (const signature of binarySignatures) {
    if (content.startsWith(signature)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if an SVG contains potentially dangerous content.
 * This is a preliminary check before sanitization.
 *
 * @param svgContent - The SVG content to check
 * @returns boolean - True if the SVG contains dangerous content
 */
export function containsDangerousSvgContent(svgContent: string): boolean {
  if (!svgContent) return false;

  const dangerousPatterns = [
    /<script\b/i,
    /\s*on\w+\s*=/i,
    /href\s*=\s*["']javascript:/i,
    /xlink:href\s*=\s*["']javascript:/i,
    /<foreignObject\b/i,
  ];

  return dangerousPatterns.some(pattern => pattern.test(svgContent));
}

/**
 * Validates an SVG file upload.
 * Combines validation and sanitization for a complete security check.
 *
 * @param fileContent - The uploaded file content
 * @param maxSizeBytes - Maximum allowed file size (default: 1MB)
 * @returns { isValid: boolean; sanitized?: string; error?: string }
 */
export function validateSvgUpload(
  fileContent: string,
  maxSizeBytes: number = 1024 * 1024
): { isValid: boolean; sanitized?: string; error?: string } {
  // Check file size
  if (fileContent.length > maxSizeBytes) {
    return { isValid: false, error: 'File size exceeds maximum allowed' };
  }

  // Check if it's a valid SVG
  if (!isValidSvg(fileContent)) {
    return { isValid: false, error: 'Invalid SVG format' };
  }

  // Check for dangerous content
  if (containsDangerousSvgContent(fileContent)) {
    // Sanitize and continue
    const sanitized = sanitizeSvg(fileContent);
    return { isValid: true, sanitized };
  }

  return { isValid: true, sanitized: fileContent };
}

/**
 * List of dangerous SVG elements that should be removed during sanitization
 */
export const DANGEROUS_SVG_ELEMENTS = [
  'script',
  'foreignObject',
  'animate',
  'set',
];

/**
 * List of dangerous SVG attributes that should be removed during sanitization
 */
export const DANGEROUS_SVG_ATTRIBUTES = [
  'onload',
  'onclick',
  'onerror',
  'onmouseover',
  'onmouseout',
  'onfocus',
  'onblur',
  'onchange',
  'onsubmit',
  'onreset',
  'onselect',
  'onkeydown',
  'onkeypress',
  'onkeyup',
];
