/**
 * Security Tests for Compare Context Logic
 * 
 * Verifies that the validation logic for CompareContext safely handles data,
 * preventing prototype pollution and handling malformed data.
 */

import { isValidConference } from '@/lib/validation';

describe('CompareContext Security Logic', () => {
  describe('isValidConference', () => {
    it('should return true for valid conference objects', () => {
      const validConf = {
        id: '123',
        name: 'JSConf',
        url: 'https://jsconf.com',
        location: { city: 'Berlin', country: 'Germany' },
        online: false,
        domain: 'web',
        source: 'manual'
      };
      expect(isValidConference(validConf)).toBe(true);
    });

    it('should return false for objects missing required fields', () => {
      expect(isValidConference({ id: '123' })).toBe(false);
      expect(isValidConference({ name: 'JSConf' })).toBe(false);
      expect(isValidConference({})).toBe(false);
    });

    it('should return false for non-object inputs', () => {
      expect(isValidConference('not an object')).toBe(false);
      expect(isValidConference(null)).toBe(false);
      expect(isValidConference(123)).toBe(false);
      expect(isValidConference(undefined)).toBe(false);
    });

    it('should return false for objects with prototype pollution attempt', () => {
      // Direct property injection
      const polluted = {
        id: '123',
        name: 'JSConf',
        '__proto__': { admin: true }
      };
      expect(isValidConference(polluted)).toBe(false);

      // JSON.parse based pollution
      const parsedPolluted = JSON.parse('{"id": "123", "name": "JSConf", "__proto__": {"polluted": true}}');
      expect(isValidConference(parsedPolluted)).toBe(false);
    });

    it('should return false for objects with constructor or prototype property', () => {
      const pollutedConstructor = {
        id: '123',
        name: 'JSConf',
        'constructor': { prototype: { polluted: true } }
      };
      expect(isValidConference(pollutedConstructor)).toBe(false);

      const pollutedPrototype = {
        id: '123',
        name: 'JSConf',
        'prototype': { polluted: true }
      };
      expect(isValidConference(pollutedPrototype)).toBe(false);
    });
  });
});
