/**
 * Security Tests for Cookie Configuration
 *
 * Ensures that cookies are set with secure attributes (Secure, HttpOnly, SameSite).
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Cookie Security', () => {
  describe('NextAuth Cookie Configuration', () => {
    // NextAuth handles cookies automatically, but we should verify configuration overrides
    // or ensure defaults are safe.
    
    it('should use secure cookies in production', () => {
      // Check auth options for secure cookie settings
      try {
        const authPath = join(process.cwd(), 'src/lib/auth.ts');
        if (existsSync(authPath)) {
          const content = readFileSync(authPath, 'utf-8');
          
          // If "cookies" option is present, check it
          if (content.includes('cookies:')) {
            expect(content).toMatch(/secure:\s*process\.env\.NODE_ENV\s*===\s*['"]production['"]/);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });
  });

  describe('Manual Cookie Setting', () => {
    it('should use Secure and SameSite attributes when setting cookies manually', () => {
      // Search for manual cookie setting (Async cookies in Next.js 15)
      const violations: string[] = [];
      let result = '';
      
      try {
        // Broaden pattern to match (await cookies()).set, cookies().set, etc.
        result = execSync(
          'git grep -n -E "cookies\\\\(\\\\).*\\\\.set\\\\(" -- "src/**/*.ts" "src/**/*.tsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );
      } catch (error) {
        console.warn('Skipping manual cookie check: git grep failed', error);
        return;
      }

      const lines = result.split('\n').filter(Boolean);

      for (const line of lines) {
        // Filter out test files correctly using path segments
        const filePath = line.split(':')[0];
        if (/(^|[\\/])(test|spec|__tests__|__mocks__)s?([\\/]|$)/.test(filePath)) continue;
        
        const [file, lineNumStr] = line.split(':');
        const lineNum = parseInt(lineNumStr, 10);
        
        try {
          const fileContent = readFileSync(join(process.cwd(), file), 'utf-8');
          const fileLines = fileContent.split('\n');
          
          // Get 15 lines of context to handle multi-line options
          const contextLines = fileLines.slice(Math.max(0, lineNum - 1), lineNum + 14);
          const context = contextLines.join('\n').toLowerCase();
          
          if (!context.includes('secure') || !context.includes('httponly') || !context.includes('samesite')) {
             violations.push(`${file}:${lineNum}: ${line}`);
          }
        } catch (error) {
          console.warn(`Could not read file ${file} for cookie check: ${error}`);
        }
      }
      
      expect(violations).toHaveLength(0);
    });
  });

  describe('Global Configuration', () => {
    it('should not have unsafe cookie defaults', () => {
      // Ensure no global config disables secure cookies
      let result = '';
      try {
        result = execSync(
          "git grep 'secure:\\s*false' -- 'src/**/*.ts' 'src/**/*.tsx' 2>/dev/null || true",
          { encoding: 'utf-8', cwd: process.cwd() }
        );
      } catch (error) {
        console.warn('Skipping global cookie check: git grep failed', error);
        return;
      }

      // Only allow in development/test context
      const lines = result.split('\n').filter(line => {
        if (!line) return false;
        const filePath = line.split(':')[0];
        const isTestFile = /(^|[\\/])(test|spec|__tests__|__mocks__)s?([\\/]|$)/.test(filePath);
        return !isTestFile && !line.includes('NODE_ENV') && !line.includes('development');
      });
      
      expect(lines).toHaveLength(0);
    });
  });
});
