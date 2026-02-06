/**
 * SVG Sanitization Utilities
 *
 * Provides functions to sanitize SVG content and prevent XSS attacks.
 * SVG files can contain JavaScript that executes when the SVG is rendered,
 * making them a potential XSS vector if user-uploaded SVGs are not sanitized.
 */

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

  // Remove dangerous elements (handles normal, self-closing, and whitespace in closing tags)
  // SECURITY: Use non-backtracking lazy match to prevent ReDoS. 
  // Tags come from trusted constants, but we use [\s\S]*? for safety.
  for (const element of DANGEROUS_SVG_ELEMENTS) {
    const elementRegex = new RegExp(`<${element}\\b[\\s\\S]*?<\\/${element}\\s*>`, 'gi');
    const selfClosingRegex = new RegExp(`<${element}\\b[^>]*\\/>`, 'gi');
    sanitized = sanitized.replace(elementRegex, '').replace(selfClosingRegex, '');
  }

  // Remove dangerous attributes
  for (const attr of DANGEROUS_SVG_ATTRIBUTES) {
    const attrRegex = new RegExp(`\\s*${attr}\\s*=\\s*(?:"[^"]*"|'[^']*'|\\\`[^\\\`]*\\\`|[^\\s>]*)?`, 'gi');
    sanitized = sanitized.replace(attrRegex, '');
  }

  // Remove javascript: and data: protocols in href/xlink:href (handles unquoted attributes)
  // Matches href=javascript:... href="javascript:..." href='javascript:...'
  sanitized = sanitized.replace(/href\s*=\s*(?:["']?)\s*javascript:[^\s"'>]*/gi, '');
  sanitized = sanitized.replace(/xlink:href\s*=\s*(?:["']?)\s*javascript:[^\s"'>]*/gi, '');
  sanitized = sanitized.replace(/href\s*=\s*(?:["']?)\s*data:[^\s"'>]*/gi, '');
  sanitized = sanitized.replace(/xlink:href\s*=\s*(?:["']?)\s*data:[^\s"'>]*/gi, '');
  
  // Remove dangerous style attribute data URLs
  sanitized = sanitized.replace(/style\s*=\s*(?:["']?)[^"'>]*\burl\s*\(\s*(?:["']?)\s*data:[^\s"'>]*\s*(?:["']?)\s*\)[^"'>]*/gi, '');

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

  // Check for dangerous elements
  for (const element of DANGEROUS_SVG_ELEMENTS) {
    const elementRegex = new RegExp(`<${element}\\b`, 'i');
    if (elementRegex.test(svgContent)) return true;
  }

  // Check for dangerous attributes
  for (const attr of DANGEROUS_SVG_ATTRIBUTES) {
    const attrRegex = new RegExp(`\\s*${attr}\\s*=`, 'i');
    if (attrRegex.test(svgContent)) return true;
  }

  const dangerousPatterns = [
    /href\s*=\s*["']\s*javascript:/i,
    /xlink:href\s*=\s*["']\s*javascript:/i,
    /href\s*=\s*["']\s*data:/i,
    /xlink:href\s*=\s*["']\s*data:/i,
    /\burl\s*\(\s*["']?\s*data:/i,
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
  // Check file size using accurate byte length
  const byteLength = typeof Buffer !== 'undefined' 
    ? Buffer.byteLength(fileContent, 'utf8') 
    : new TextEncoder().encode(fileContent).length;

  if (byteLength > maxSizeBytes) {
    return { isValid: false, error: 'File size exceeds maximum allowed' };
  }

  // Check if it's a valid SVG (on raw content first)
  if (!isValidSvg(fileContent)) {
    return { isValid: false, error: 'Invalid SVG format' };
  }

  // Always sanitize to be safe, handling potential entity-encoded bypasses
  // We sanitize the raw content first
  const sanitized = sanitizeSvg(fileContent);
  
  // Also check if the decoded version contains dangerous content
  const decodedContent = decodeHtmlEntities(fileContent);
  if (containsDangerousSvgContent(decodedContent)) {
    // If the decoded version is dangerous, we use the doubly sanitized version
    // but we return it as is, which is now safe from the perspective of SVG structure
    // Callers should be aware that the output contains raw < > characters.
    const doublySanitized = sanitizeSvg(decodedContent);
    return { isValid: true, sanitized: doublySanitized };
  }

  return { isValid: true, sanitized };
}

/**
 * Basic HTML entity decoder
 */
function decodeHtmlEntities(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/gi, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}
