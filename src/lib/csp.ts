/**
 * Content Security Policy (CSP) Generator
 * 
 * Provides a robust CSP policy with nonce support for Next.js 15.
 * Uses strict-dynamic for modern browser security while maintaining fallbacks.
 */

import { NextRequest } from 'next/server';

/**
 * Generate a cryptographically strong random nonce
 */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

/**
 * Get the CSP policy string
 * @param nonce Optional nonce for inline scripts
 */
export function getCSP(nonce?: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Script sources
  const scriptSrc = [
    "'self'",
    nonce ? `'nonce-${nonce}'` : '',
    "'strict-dynamic'",
    // Fallbacks for browsers that don't support strict-dynamic/nonces
    'https:',
    isDev ? "'unsafe-eval'" : '',
    '*.sentry.io',
  ].filter(Boolean).join(' ');

  // Style sources
  const styleSrc = [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind/Next.js
    '*.googleapis.com',
  ].filter(Boolean).join(' ');

  // Image sources
  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'avatars.githubusercontent.com',
    'lh3.googleusercontent.com',
    'res.cloudinary.com',
    '*.tile.openstreetmap.org',
    '*.basemaps.cartocdn.com',
  ].filter(Boolean).join(' ');

  // Font sources
  const fontSrc = [
    "'self'",
    'data:',
    '*.gstatic.com',
  ].filter(Boolean).join(' ');

  // Connection sources
  const connectSrc = [
    "'self'",
    '*.sentry.io',
    '*.google-analytics.com',
    '*.analytics.google.com',
    '*.googletagmanager.com',
  ].filter(Boolean).join(' ');

  const policy = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    `font-src ${fontSrc}`,
    `connect-src ${connectSrc}`,
    `media-src 'self'`,
    `frame-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    isDev ? '' : `upgrade-insecure-requests`,
  ].filter(Boolean).join('; ');

  return policy;
}

/**
 * Apply CSP headers to a response
 */
export function applyCSP(request: NextRequest, response: Headers): void {
  const nonce = generateNonce();
  const csp = getCSP(nonce);
  
  // Set the CSP header
  // Note: We use Content-Security-Policy-Report-Only in some cases if we wanted to test,
  // but for P0 we want enforcement.
  response.set('Content-Security-Policy', csp);
  
  // Set the nonce on the request so it can be picked up by the App Router
  // This is a common pattern for passing the nonce to components
  request.headers.set('x-nonce', nonce);
}
