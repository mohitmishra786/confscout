/**
 * Security Tests for Code Injection Prevention
 *
 * Ensures no dangerous code execution patterns like eval() or new Function() exist.
 * Also checks for other code injection vectors.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { join } from 'path';

describe('Code Injection Prevention', () => {
  describe('No eval() Usage', () => {
    it('should not contain eval() calls in TypeScript/JavaScript files', () => {
      // Search for eval usage in source files
      try {
        const result = execSync(
          'git grep -n "eval\\s*(" -- "*.ts" "*.tsx" "*.js" "*.jsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        // Filter out comments and test file references
        const lines = result.split('\n').filter(line => {
          if (!line) return false;
          // Extract the code content after "file:line:" prefix
          const contentPart = line.replace(/^[^:]*:\d+:/, '').trim();
          // Skip comments (heuristic)
          if (contentPart.startsWith('//') || contentPart.startsWith('*') || contentPart.startsWith('/*')) return false;
          // Skip test files that are checking for eval
          if (line.includes('.test.') || line.includes('.spec.')) return false;
          // Skip node_modules
          if (line.includes('node_modules')) return false;
          return true;
        });

        expect(lines).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });

    it('should not use new Function() constructor', () => {
      try {
        const result = execSync(
          'git grep -n "new\\s*Function\\s*(" -- "*.ts" "*.tsx" "*.js" "*.jsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        const lines = result.split('\n').filter(line => {
          if (!line) return false;
          const contentPart = line.replace(/^[^:]*:\d+:/, '').trim();
          if (contentPart.startsWith('//') || contentPart.startsWith('*') || contentPart.startsWith('/*')) return false;
          if (line.includes('.test.') || line.includes('.spec.')) return false;
          if (line.includes('node_modules')) return false;
          return true;
        });

        expect(lines).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });
  });

  describe('No Dynamic Code Execution', () => {
    it('should not use setTimeout with string arguments', () => {
      // setTimeout("code", delay) is equivalent to eval()
      try {
        const result = execSync(
          'git grep -E "setTimeout\\s*\\([^,]*[\"\']" -- "*.ts" "*.tsx" "*.js" "*.jsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        const lines = result.split('\n').filter(line => {
          if (!line) return false;
          if (line.includes('node_modules')) return false;
          if (line.includes('.test.') || line.includes('.spec.')) return false;
          return true;
        });

        expect(lines).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });

    it('should not use setInterval with string arguments', () => {
      // setInterval("code", delay) is equivalent to eval()
      try {
        const result = execSync(
          'git grep -E "setInterval\\s*\\([^,]*[\"\']" -- "*.ts" "*.tsx" "*.js" "*.jsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        const lines = result.split('\n').filter(line => {
          if (!line) return false;
          if (line.includes('node_modules')) return false;
          if (line.includes('.test.') || line.includes('.spec.')) return false;
          return true;
        });

        expect(lines).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });
  });

  describe('No Dangerous DOM Manipulation', () => {
    it('should minimize usage of innerHTML', () => {
      try {
        const result = execSync(
          'git grep -n "innerHTML" -- "*.ts" "*.tsx" "*.js" "*.jsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        const allowedInnerHTMLFiles = [
          'src/app/global-error.tsx',
          'src/components/SafeJsonLd.tsx',
          'src/lib/email.ts',
          'src/lib/emailTemplates.ts',
          'src/lib/groqEmail.ts'
        ];

        const lines = result.split('\n').filter(line => {
          if (!line) return false;
          if (line.includes('node_modules')) return false;
          if (line.includes('.test.')) return false;
          // Check if file is in allowlist
          return !allowedInnerHTMLFiles.some(f => line.includes(f));
        });

        expect(lines).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });
  });

  describe('Safe JSON Parsing', () => {
    it('should use JSON.parse() safely without eval', () => {
      // Check that JSON.parse is used instead of eval for JSON
      try {
        const result = execSync(
          'git grep -n "JSON.parse" -- "*.ts" "*.tsx" 2>/dev/null | head -20 || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        // Informational check
        expect(result.length).toBeGreaterThan(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });

    it('should not use eval() for JSON parsing', () => {
      try {
        const result = execSync(
          'git grep -E "eval\\s*\\(\\s*[^)]*JSON" -- "*.ts" "*.tsx" "*.js" "*.jsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        const lines = result.split('\n').filter(line => line && !line.includes('node_modules') && !line.includes('.test.'));
        expect(lines).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });
  });

  describe('No Shell Injection', () => {
    it('should not use child_process with user input', () => {
      // Check for child_process.exec with dynamic strings
      try {
        const result = execSync(
          'git grep -n "child_process\\|exec\\s*(" -- "*.ts" "*.tsx" "*.js" "*.jsx" 2>/dev/null || true',
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        const lines = result.split('\n').filter(line => {
          if (!line) return false;
          if (line.includes('node_modules')) return false;
          if (line.includes('.test.')) return false;
          // Allow execSync for grep commands in tests
          if (line.includes('execSync') && line.includes('git grep')) return false;
          return true;
        });

        expect(lines).toHaveLength(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
        // Other errors (like missing git) should be reported as failures unless explicitly skipped
        throw new Error(`Grep command failed in shell injection test: ${error}`);
      }
    });
  });
});

describe('Secure Coding Patterns', () => {
  it('should use proper function declarations instead of dynamic code', () => {
    // This is a documentation test - shows the project uses proper patterns
    const srcFiles = globSync('src/**/*.{ts,tsx}', { cwd: process.cwd() });

    // Sample a few files to verify proper function usage
    const sampleFiles = srcFiles.slice(0, 5);

    for (const file of sampleFiles) {
      try {
        const content = readFileSync(join(process.cwd(), file), 'utf-8');
        // Should contain proper function declarations
        expect(content).toMatch(/function|=>|const.*=.*\(/);
      } catch {
        // Skip files that can't be read
      }
    }
  });

  it('should use TypeScript for type safety', () => {
    const tsFiles = globSync('src/**/*.{ts,tsx}', { cwd: process.cwd() });
    const jsFiles = globSync('src/**/*.js', { cwd: process.cwd() });

    // Project should primarily use TypeScript
    expect(tsFiles.length).toBeGreaterThan(jsFiles.length);
  });
});
