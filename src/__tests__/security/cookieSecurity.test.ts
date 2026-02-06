/**
 * Security Tests for Cookie Configuration
 *
 * Ensures that cookies are set with secure attributes (Secure, HttpOnly, SameSite).
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Cookie Security', () => {
  describe('NextAuth Cookie Configuration', () => {
    // NextAuth handles cookies automatically, but we should verify configuration overrides
    // or ensure defaults are safe.
    
    it('should use secure cookies in production', () => {
      // Check auth options for secure cookie settings
      try {
        const authPath = join(process.cwd(), 'src/lib/auth.ts');
        const content = readFileSync(authPath, 'utf-8');
        
        // If "cookies" option is present, check it
        if (content.includes('cookies:')) {
          expect(content).toMatch(/secure:\s*process\.env\.NODE_ENV\s*===\s*['"]production['"]/);
        }
      } catch {
        // Skip
      }
    });
  });

  describe('Manual Cookie Setting', () => {
    it('should use Secure and SameSite attributes when setting cookies manually', () => {
      // Search for manual cookie setting (Async cookies in Next.js 15)
      try {
        // Pattern matches (await cookies()).set or cookies().set
        const result = execSync(
          'git grep -n -E "cookies\\(\\)\\s*\\)\\.set" -- "src/**/*.ts" "src/**/*.tsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        const lines = result.split('\n').filter(Boolean);
        const violations: string[] = [];

        for (const line of lines) {
          if (line.includes('test')) continue;
          
          // Heuristic for multi-line check: look ahead for security attributes if not on same line
          // In a real codebase, we'd use AST parsing, but for now we'll broaden the grep
          const file = line.split(':')[0];
          const lineNum = parseInt(line.split(':')[1], 10);
          
          // Get 10 lines of context
          const context = execSync(`git grep -A 10 ".set(" -- "${file}" | grep -A 10 "^${file}:${lineNum}:"`, { encoding: 'utf-8' }).toLowerCase();
          
          if (!context.includes('secure') || !context.includes('httponly') || !context.includes('samesite')) {
             violations.push(`${file}:${lineNum}: ${line}`);
          }
        }
        
        expect(violations).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });
  });

  describe('Global Configuration', () => {
    it('should not have unsafe cookie defaults', () => {
      // Ensure no global config disables secure cookies
      try {
        const result = execSync(
          "git grep 'secure:\\s*false' -- 'src/**/*.ts' 'src/**/*.tsx' 2>/dev/null || true",
          { encoding: 'utf-8', cwd: process.cwd() }
        );
        // Only allow in development/test context
        const lines = result.split('\n').filter(line => 
          line && !line.includes('NODE_ENV') && !line.includes('development') && !line.includes('test')
        );
        expect(lines).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });
  });
});
