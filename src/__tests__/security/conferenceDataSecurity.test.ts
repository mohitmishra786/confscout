
import { serializeSafeJsonLd } from '@/lib/validation';

describe('Conference Data Security', () => {
  describe('JSON-LD Sanitization', () => {
    it('should sanitize conference name in JSON-LD', () => {
      const nameWithTags = 'Conf <b>Bold</b>';
      const data = {
        '@type': 'Event',
        name: nameWithTags,
        description: 'Normal description'
      };

      const serialized = serializeSafeJsonLd(data);
      
      // Should escape HTML brackets (JSON-LD safety)
      expect(serialized).toContain('\\u003c'); // <
      expect(serialized).toContain('\\u003e'); // >
      expect(serialized).toContain('b'); 
      expect(serialized).not.toContain('<b>'); // Should be escaped
    });

    it('should sanitize conference description in JSON-LD', () => {
      const maliciousDesc = 'Description with <img src=x onerror=alert(1)>';
      const data = {
        name: 'Safe Conf',
        description: maliciousDesc
      };

      const serialized = serializeSafeJsonLd(data);

      expect(serialized).not.toContain('onerror');
      expect(serialized).not.toContain('<img'); // sanitizeJsonLdValue removes event handlers? 
      // Actually sanitizeJsonLdValue removes event handlers but leaves tags?
      // "Remove all event handlers ... only in HTML-tag-like context"
      
      // Let's verify the output is safe for JSON context
      expect(serialized).not.toMatch(/<[^>]*onerror/);
    });
  });
});
