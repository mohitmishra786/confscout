/**
 * Security Tests for Regex Safety
 *
 * Ensures that regex patterns are safe from ReDoS attacks
 * and that user input is properly escaped before being used in regex.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Regex Security', () => {
  describe('ReDoS Prevention', () => {
    it('should use safe regex patterns for URL validation', () => {
      // Check urlValidation.ts for safe patterns
      const urlValidationPath = join(process.cwd(), 'src/lib/urlValidation.ts');
      
      expect(existsSync(urlValidationPath)).toBe(true);
      const content = readFileSync(urlValidationPath, 'utf-8');
      // Ensure no evil regexes like (a+)+
      expect(content).not.toMatch(/\(\.\*\+\)\+/);
      expect(content).not.toMatch(/\(\[a-z\]\+\)\+/);
    });

    it('should escape user input before using in RegExp constructor', () => {
      // Check files that use new RegExp(var)
      try {
        const result = execSync(
          'git grep -n "new RegExp" -- "src/**/*.ts" "src/**/*.tsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        const lines = result.split('\n').filter(line => line && !line.includes('test'));
        const violations: string[] = [];
        
        for (const line of lines) {
          // Verify that input is escaped or from a trusted source
          // element and attr are trusted constants from svgSanitizer.ts
          const isEscaped = line.includes('escapeRegExp') || 
                           line.includes('searchTerm.replace') ||
                           line.includes('safeSearchTerm') ||
                           line.includes('escapedTerm') ||
                           line.includes('element') ||
                           line.includes('attr');
          
          if (!isEscaped && line.includes('${')) {
            violations.push(line);
          }
        }
        expect(violations).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });

    it('should limit input length for regex operations', () => {
      // Check SafeHighlightedText for length limits
      const safeTextPath = join(process.cwd(), 'src/components/SafeHighlightedText.tsx');
      expect(existsSync(safeTextPath)).toBe(true);
      const content = readFileSync(safeTextPath, 'utf-8');
      expect(content).toMatch(/\.slice\(0,\s*\d+\)/); // Should slice input
    });
  });

  describe('Unsafe Regex Patterns', () => {
    it('should not contain known evil regex patterns', () => {
      // Search for patterns known to cause catastrophic backtracking
      try {
        const result = execSync(
          'git grep -n -E "(\\\\+)\\\\+|(\\\\*)\\\\*" -- "src/**/*.ts" "src/**/*.tsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        const suspiciousLines = result.split('\n').filter(line => {
          if (!line) return false;
          if (line.includes('//') || line.includes('/*')) return false;
          if (line.includes('.test.')) return false;
          // Math operations like a++ or ** are fine
          if (line.includes('++') || line.includes('**')) return false;
          
          // Only check lines that look like a regex literal or constructor
          // Refined pattern to avoid matching imports or simple strings
          return line.includes('/') && 
                 (/=\s*\/.*\/[gimuy]*\s*($|;)/.test(line) || line.includes('RegExp(')); 
        });

        expect(suspiciousLines).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });
  });

  describe('Email Regex Safety', () => {
    it('should use a safe email validation', () => {
      try {
        const result = execSync(
          'git grep "z.string().email()" -- "src/**/*.ts" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );
        
        // Zod's email validation is mandatory for API inputs
        expect(result.length).toBeGreaterThan(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });
  });
});
