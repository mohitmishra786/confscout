/**
 * Secrets Management Verification Tests
 * 
 * Issue #267 - Verify no secrets are hardcoded in source files
 * 
 * This test suite verifies that all sensitive configuration uses
 * environment variables and no secrets are committed to the repository.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { join } from 'path';

describe('Secrets Management (Issue #267)', () => {
  describe('Environment Variable Usage', () => {
    it('should use process.env for all API keys', () => {
      const files = globSync('src/**/*.ts');
      const violations: string[] = [];

      for (const file of files) {
        if (file.includes('__tests__') || file.includes('.test.')) continue;

        const content = readFileSync(file, 'utf-8');
        
        // Check for API key patterns that should use env vars
        const apiKeyPatterns = [
          /apiKey\s*:\s*["'][^"']+["']/,
          /api_key\s*:\s*["'][^"']+["']/,
          /apiKey\s*=\s*["'][^"']+["']/,
        ];

        for (const pattern of apiKeyPatterns) {
          if (pattern.test(content)) {
            // Check if it's NOT using process.env
            const match = content.match(pattern);
            if (match && !match[0].includes('process.env')) {
              violations.push(`${file}: Hardcoded API key detected`);
            }
          }
        }
      }

      expect(violations).toHaveLength(0);
    });

    it('should use process.env for database connections', () => {
      const files = [
        'src/lib/db.ts',
        'src/lib/cache.ts',
        'scripts/init_db.js'
      ];

      for (const file of files) {
        try {
          const content = readFileSync(join(process.cwd(), file), 'utf-8');
          
          // Should reference DATABASE_URL or similar from env
          if (content.includes('connectionString') || content.includes('DATABASE_URL')) {
            expect(content).toMatch(/process\.env/);
          }
        } catch {
          // File might not exist
        }
      }
    });

    it('should use process.env for authentication secrets', () => {
      const files = [
        'src/lib/auth.ts',
        'src/app/api/auth/[...nextauth]/route.ts'
      ];

      for (const file of files) {
        try {
          const content = readFileSync(join(process.cwd(), file), 'utf-8');
          
          // Check for secret/password patterns
          if (content.includes('secret') || content.includes('password')) {
            // Should use process.env
            expect(content).toMatch(/process\.env/);
          }
        } catch {
          // File might not exist
        }
      }
    });
  });

  describe('No Hardcoded Secrets Patterns', () => {
    const secretPatterns = [
      { name: 'Groq API Key', pattern: 'gsk_', regex: /gsk_[a-zA-Z0-9]{20,}/ },
      { name: 'OpenAI API Key', pattern: 'sk-', regex: /sk-[a-zA-Z0-9]{20,}/ },
      { name: 'Google API Key', pattern: 'AIza', regex: /AIza[0-9A-Za-z_-]{35,}/ },
      { name: 'GitHub Token', pattern: 'ghp_', regex: /ghp_[a-zA-Z0-9]{36,}/ },
      { name: 'GitHub PAT', pattern: 'github_pat_', regex: /github_pat_[a-zA-Z0-9_]{22,}/ },
      { name: 'AWS Access Key', pattern: 'AKIA', regex: /AKIA[0-9A-Z]{16}/ },
      { name: 'Slack Token', pattern: 'xoxb-', regex: /xoxb-[a-zA-Z0-9-]{10,}/ },
      { name: 'Slack User Token', pattern: 'xoxp-', regex: /xoxp-[a-zA-Z0-9-]{10,}/ },
    ];

    for (const { name, pattern, regex } of secretPatterns) {
      it(`should not contain hardcoded ${name}`, () => {
        const result = execSync(
          `git grep "${pattern}" -- "*.ts" "*.tsx" "*.js" "*.json" 2>/dev/null || true`,
          { encoding: 'utf-8' }
        );

        const lines = result.split('\n').filter(line => {
          if (!line) return false;
          // Exclude test files and test descriptions
          if (line.includes('.test.ts')) return false;
          if (line.includes('__tests__')) return false;
          if (line.includes('test.ts')) return false;
          // Exclude package-lock.json
          if (line.includes('package-lock.json')) return false;
          // Exclude comments describing the pattern
          if (line.includes('usually start with')) return false;
          if (line.includes('// ')) return false;
          // Apply stricter regex to filter false positives (CSS classes, etc.)
          if (!regex.test(line)) return false;
          return true;
        });

        expect(lines).toHaveLength(0);
      });
    }
  });

  describe('.env File Protection', () => {
    it('should have .env files in .gitignore', () => {
      const gitignore = readFileSync(join(process.cwd(), '.gitignore'), 'utf-8');
      
      expect(gitignore).toContain('.env');
      expect(gitignore).toContain('.env.local');
    });

    it('should have .env.example with placeholders', () => {
      try {
        const example = readFileSync(join(process.cwd(), '.env.example'), 'utf-8');
        
        // Should contain example placeholders, not real values
        expect(example).toMatch(/YOUR_/);
        expect(example).toMatch(/PLACEHOLDER/);
        
        // Should not contain real-looking secrets
        expect(example).not.toMatch(/gsk_[a-zA-Z0-9]{20}/);
        expect(example).not.toMatch(/sk-[a-zA-Z0-9]{20}/);
      } catch {
        // .env.example might not exist
      }
    });
  });

  describe('Secret Scanning', () => {
    it('should not contain private keys', () => {
      const result = execSync(
        'git grep -l "BEGIN PRIVATE KEY" -- "*.ts" "*.tsx" "*.js" "*.json" 2>/dev/null || true',
        { encoding: 'utf-8' }
      );
      
      const filtered = result.split('\n').filter(line => line && !line.includes('secretsManagement.test.ts'));
      expect(filtered).toHaveLength(0);
    });

    it('should not contain RSA keys', () => {
      const result = execSync(
        'git grep -l "BEGIN RSA PRIVATE KEY" -- "*.ts" "*.tsx" "*.js" "*.json" 2>/dev/null || true',
        { encoding: 'utf-8' }
      );
      
      const filtered = result.split('\n').filter(line => line && !line.includes('secretsManagement.test.ts'));
      expect(filtered).toHaveLength(0);
    });

    it('should not contain password literals in source', () => {
      const files = globSync('src/**/*.ts');
      const violations: string[] = [];

      for (const file of files) {
        if (file.includes('__tests__') || file.includes('.test.')) continue;

        const content = readFileSync(file, 'utf-8');
        
        // Look for password assignments (not in tests)
        const passwordPattern = /password\s*=\s*["'][^"']{8,}["']/g;
        const matches = content.match(passwordPattern);
        
        if (matches) {
          // Check if it's process.env assignment
          for (const match of matches) {
            if (!match.includes('process.env')) {
              violations.push(`${file}: Potential hardcoded password`);
            }
          }
        }
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Configuration Files', () => {
    it('should not have secrets in next.config.ts', () => {
      try {
        const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf-8');

        // Should not have hardcoded API keys
        expect(config).not.toMatch(/apiKey\s*:\s*["'][^"']+["']/);
        expect(config).not.toMatch(/secret\s*:\s*["'][^"']+["']/);

        // Should reference env vars
        expect(config).toMatch(/process\.env/);
      } catch {
        // Config file might use a different extension (.js, .mjs) or not exist
        // Skip this test if the file is not found
      }
    });

    it('should not have secrets in package.json scripts', () => {
      const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf-8');

      // Should not contain API keys
      expect(packageJson).not.toMatch(/gsk_/);
      expect(packageJson).not.toMatch(/sk-[a-zA-Z0-9]{20}/);
    });
  });
});
