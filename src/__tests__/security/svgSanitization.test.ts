/**
 * Security Tests for SVG Sanitization
 *
 * Tests for SVG sanitization utilities to prevent XSS through SVG files.
 */

import {
  sanitizeSvg,
  isValidSvg,
  containsDangerousSvgContent,
  validateSvgUpload,
} from '@/lib/svgSanitizer';

describe('SVG Sanitization Security Tests', () => {
  describe('sanitizeSvg', () => {
    it('should remove script tags from SVG', () => {
      const maliciousSvg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <script>alert('XSS')</script>
          <rect width="100" height="100"/>
        </svg>
      `;

      const sanitized = sanitizeSvg(maliciousSvg);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('<svg');
      expect(sanitized).toContain('<rect');
    });

    it('should remove event handlers from SVG elements', () => {
      const maliciousSvg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" onload="alert('XSS')"/>
          <circle cx="50" cy="50" r="40" onclick="stealCookies()"/>
        </svg>
      `;

      const sanitized = sanitizeSvg(maliciousSvg);

      expect(sanitized).not.toContain('onload');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('<rect');
      expect(sanitized).toContain('<circle');
    });

    it('should remove javascript: protocol from href attributes', () => {
      const maliciousSvg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <a href="javascript:alert('XSS')">
            <rect width="100" height="100"/>
          </a>
        </svg>
      `;

      const sanitized = sanitizeSvg(maliciousSvg);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('<a');
      expect(sanitized).toContain('<rect');
    });

    it('should remove javascript: from xlink:href attributes', () => {
      const maliciousSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <use xlink:href="javascript:alert('XSS')"/>
        </svg>
      `;

      const sanitized = sanitizeSvg(maliciousSvg);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('<use');
    });

    it('should remove foreignObject elements', () => {
      const maliciousSvg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <foreignObject width="100" height="100">
            <body xmlns="http://www.w3.org/1999/xhtml">
              <script>alert('XSS')</script>
            </body>
          </foreignObject>
        </svg>
      `;

      const sanitized = sanitizeSvg(maliciousSvg);

      expect(sanitized).not.toContain('<foreignObject');
      expect(sanitized).not.toContain('</foreignObject>');
      expect(sanitized).toContain('<svg');
    });

    it('should handle SVG with multiple script tags', () => {
      const maliciousSvg = `
        <svg>
          <script>alert(1)</script>
          <rect width="10" height="10"/>
          <script>alert(2)</script>
        </svg>
      `;

      const sanitized = sanitizeSvg(maliciousSvg);

      expect(sanitized).not.toContain('<script');
    });

    it('should remove self-closing script tags', () => {
      const maliciousSvg = '<svg><script src="https://evil.com/xss.js"/><rect/></svg>';
      const sanitized = sanitizeSvg(maliciousSvg);
      expect(sanitized).not.toContain('<script');
    });

    it('should remove animate and set elements', () => {
      const maliciousSvg = `
        <svg>
          <rect width="100" height="100">
            <animate attributeName="onmouseover" to="alert(1)"/>
            <set attributeName="onmouseover" to="alert(1)"/>
          </rect>
        </svg>
      `;
      const sanitized = sanitizeSvg(maliciousSvg);
      expect(sanitized).not.toContain('<animate');
      expect(sanitized).not.toContain('<set');
    });

    it('should remove script tags with whitespace in closing tag', () => {
      const maliciousSvg = '<svg><script>alert(1)</script ></svg>';
      const sanitized = sanitizeSvg(maliciousSvg);
      expect(sanitized).not.toContain('<script');
    });

    it('should remove script tags with multiple whitespaces or newlines in closing tag', () => {
      const maliciousSvg = '<svg><script>alert(1)</script\n\r\t ></svg>';
      const sanitized = sanitizeSvg(maliciousSvg);
      expect(sanitized).not.toContain('<script');
    });

    it('should handle case-mixed or whitespace-injected tags', () => {
      const maliciousSvg = '<svg><ScRiPt \n>alert(1)</sCrIpT><rect/></svg>';
      const sanitized = sanitizeSvg(maliciousSvg);
      expect(sanitized.toLowerCase()).not.toContain('<script');
    });

    it('should remove data: URLs from style attributes', () => {
      const maliciousSvg = '<svg><rect style="background: url(\'data:text/html,<script>alert(1)</script>\')"/></svg>';
      const sanitized = sanitizeSvg(maliciousSvg);
      expect(sanitized).not.toContain('data:');
    });

    it('should handle empty SVG content', () => {
      expect(sanitizeSvg('')).toBe('');
      expect(sanitizeSvg(null as unknown as string)).toBe('');
      expect(sanitizeSvg(undefined as unknown as string)).toBe('');
    });

    it('should preserve safe SVG content', () => {
      const safeSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
          <rect x="10" y="10" width="80" height="80" fill="blue"/>
          <circle cx="50" cy="50" r="30" fill="red"/>
          <text x="50" y="50" text-anchor="middle">Safe SVG</text>
        </svg>
      `;

      const sanitized = sanitizeSvg(safeSvg);

      expect(sanitized).toContain('<svg');
      expect(sanitized).toContain('<rect');
      expect(sanitized).toContain('<circle');
      expect(sanitized).toContain('<text');
      expect(sanitized).toContain('Safe SVG');
    });

    it('should remove data: URLs from href attributes', () => {
      const maliciousSvg = `
        <svg>
          <a href="data:text/html,<script>alert('XSS')</script>">
            <rect width="100" height="100"/>
          </a>
        </svg>
      `;

      const sanitized = sanitizeSvg(maliciousSvg);

      expect(sanitized).not.toContain('data:text/html');
    });
  });

  describe('isValidSvg', () => {
    it('should validate correct SVG content', () => {
      const validSvg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      expect(isValidSvg(validSvg)).toBe(true);
    });

    it('should reject HTML content', () => {
      const html = '<!DOCTYPE html><html><body>Test</body></html>';
      expect(isValidSvg(html)).toBe(false);
    });

    it('should reject binary image data', () => {
      const pngSignature = '\x89PNG\r\n\x1a\n';
      expect(isValidSvg(pngSignature)).toBe(false);

      const jpegSignature = '\xff\xd8\xff';
      expect(isValidSvg(jpegSignature)).toBe(false);

      const gifSignature = 'GIF89a';
      expect(isValidSvg(gifSignature)).toBe(false);
    });

    it('should reject empty content', () => {
      expect(isValidSvg('')).toBe(false);
      expect(isValidSvg(null as unknown as string)).toBe(false);
      expect(isValidSvg(undefined as unknown as string)).toBe(false);
    });

    it('should reject plain text', () => {
      expect(isValidSvg('This is not an SVG')).toBe(false);
    });

    it('should accept SVG with whitespace', () => {
      const svgWithWhitespace = '  <svg><rect/></svg>  ';
      expect(isValidSvg(svgWithWhitespace)).toBe(true);
    });
  });

  describe('containsDangerousSvgContent', () => {
    it('should detect script tags', () => {
      const svg = '<svg><script>alert(1)</script></svg>';
      expect(containsDangerousSvgContent(svg)).toBe(true);
    });

    it('should detect event handlers', () => {
      const svg = '<svg><rect onload="alert(1)"/></svg>';
      expect(containsDangerousSvgContent(svg)).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      const svg = '<svg><a href="javascript:alert(1)"><rect/></a></svg>';
      expect(containsDangerousSvgContent(svg)).toBe(true);
    });

    it('should detect foreignObject elements', () => {
      const svg = '<svg><foreignObject>HTML content</foreignObject></svg>';
      expect(containsDangerousSvgContent(svg)).toBe(true);
    });

    it('should return false for safe SVGs', () => {
      const safeSvg = '<svg><rect width="100" height="100"/></svg>';
      expect(containsDangerousSvgContent(safeSvg)).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(containsDangerousSvgContent('')).toBe(false);
    });
  });

  describe('validateSvgUpload', () => {
    it('should accept valid and safe SVGs', () => {
      const safeSvg = '<svg><rect width="100" height="100"/></svg>';
      const result = validateSvgUpload(safeSvg);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(safeSvg);
      expect(result.error).toBeUndefined();
    });

    it('should reject oversized files', () => {
      const largeSvg = '<svg>' + 'x'.repeat(1024 * 1024 + 1) + '</svg>';
      const result = validateSvgUpload(largeSvg);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('size');
    });

    it('should reject invalid SVG format', () => {
      const notSvg = 'This is not an SVG file';
      const result = validateSvgUpload(notSvg);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid SVG');
    });

    it('should sanitize dangerous SVGs and mark as valid', () => {
      const dangerousSvg = '<svg><script>alert(1)</script><rect/></svg>';
      const result = validateSvgUpload(dangerousSvg);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.error).toBeUndefined();
    });

    it('should accept custom max size', () => {
      const smallSvg = '<svg><rect/></svg>';
      const result = validateSvgUpload(smallSvg, 100);

      expect(result.isValid).toBe(true);
    });

    it('should reject files exceeding custom max size', () => {
      const svg = '<svg>' + 'x'.repeat(101) + '</svg>';
      const result = validateSvgUpload(svg, 100);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Real-world XSS Attack Vectors via SVG', () => {
    const attackVectors = [
      {
        name: 'Script tag injection',
        svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>',
      },
      {
        name: 'onload event handler',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(\'XSS\')"><rect/></svg>',
      },
      {
        name: 'javascript: in href',
        svg: '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(\'XSS\')"><rect/></a></svg>',
      },
      {
        name: 'foreignObject with HTML',
        svg: '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe src="javascript:alert(\'XSS\')"></iframe></foreignObject></svg>',
      },
      {
        name: 'onerror with image',
        svg: '<svg xmlns="http://www.w3.org/2000/svg"><image href="x" onerror="alert(\'XSS\')"/></svg>',
      },
      {
        name: 'Encoded script tag',
        svg: '<svg xmlns="http://www.w3.org/2000/svg">&lt;script&gt;alert(1)&lt;/script&gt;</svg>',
      },
      {
        name: 'Unquoted javascript: href',
        svg: '<svg xmlns="http://www.w3.org/2000/svg"><a href=javascript:alert(1)><rect/></a></svg>',
      },
    ];

    attackVectors.forEach(({ name, svg }) => {
      it(`should sanitize: ${name}`, () => {
        const result = validateSvgUpload(svg);

        expect(result.isValid).toBe(true);
        expect(result.sanitized).not.toMatch(/<script/i);
        expect(result.sanitized).not.toMatch(/\son\w+\s*=/i);
        expect(result.sanitized).not.toContain('javascript:');
        expect(result.sanitized).not.toContain('<foreignObject');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle SVG with comments', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <!-- This is a comment -->
          <rect width="100" height="100"/>
        </svg>
      `;

      const sanitized = sanitizeSvg(svg);
      expect(sanitized).toContain('<!--');
      expect(sanitized).toContain('-->');
      expect(sanitized).toContain('<rect');
    });

    it('should handle SVG with namespaces', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg"
             xmlns:xlink="http://www.w3.org/1999/xlink">
          <use xlink:href="#icon"/>
        </svg>
      `;

      const sanitized = sanitizeSvg(svg);
      expect(sanitized).toContain('xmlns=');
      expect(sanitized).toContain('<use');
    });

    it('should handle SVG with inline styles', () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <rect style="fill: blue; stroke: red;" width="100" height="100"/>
        </svg>
      `;

      const sanitized = sanitizeSvg(svg);
      expect(sanitized).toContain('style=');
      expect(sanitized).toContain('fill: blue');
    });

    it('should handle very long SVG content', () => {
      const longSvg = '<svg>' + '<rect/>'.repeat(1000) + '</svg>';
      const sanitized = sanitizeSvg(longSvg);

      expect(sanitized).toContain('<svg>');
      expect(sanitized).toContain('</svg>');
    });

    it('should handle SVG with special characters', () => {
      const svg = `<svg><text>Special: &lt;&gt;&amp;&quot;</text></svg>`;
      const sanitized = sanitizeSvg(svg);

      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
      expect(sanitized).toContain('&amp;');
    });
  });
});
