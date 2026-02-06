import { Conference } from '@/types/conference';

/**
 * Validate that an object is a valid Conference
 * Prevents prototype pollution and ensures data integrity
 */
export function isValidConference(conf: any): conf is Conference {
  if (!conf || typeof conf !== 'object' || Array.isArray(conf)) {
    return false;
  }

  // Ensure required fields are present and of correct type
  if (typeof conf.id !== 'string' || typeof conf.name !== 'string') {
    return false;
  }

  // Prevent prototype pollution
  // Check if the object contains dangerous keys
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  
  // Check own properties
  if (Object.keys(conf).some(key => dangerousKeys.includes(key))) {
    return false;
  }

  // Check if it's a plain object (no custom prototype)
  const proto = Object.getPrototypeOf(conf);
  if (proto !== null && proto !== Object.prototype) {
    return false;
  }

  return true;
}
