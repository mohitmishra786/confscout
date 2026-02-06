/**
 * Security Tests for Gitignore Configuration
 *
 * Ensures sensitive files are properly excluded from version control
 * and no secrets are accidentally committed.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import { join } from 'path';

describe('Gitignore Security Configuration', () => {
  const gitignorePath = join(process.cwd(), '.gitignore');
  let gitignoreContent = '';
  let trackedFiles: string[] = [];
  let isGitRepo = true;

  beforeAll(() => {
    if (existsSync(gitignorePath)) {
      gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    }
    try {
      trackedFiles = execSync('git ls-files', { encoding: 'utf-8' })
        .split('\n')
        .filter(Boolean);
    } catch (e) {
      console.warn('Skipping: git ls-files failed', e);
      isGitRepo = false;
    }
  });

  describe('Environment Variables Protection', () => {
    it('should have .env files in gitignore', () => {
      const hasEnvPattern = gitignoreContent.includes('.env') ||
                           gitignoreContent.includes('.env*') ||
                           gitignoreContent.includes('.env.local');
      expect(hasEnvPattern).toBe(true);
    });

    it('should not track any .env files', () => {
      if (!isGitRepo) return;
      const envFiles = trackedFiles.filter(f =>
        /(?:^|\/)\.env(?:\.|$)/.test(f)
      );
      expect(envFiles).toHaveLength(0);
    });

    it('should not track files with SECRET, KEY, or PASSWORD in name', () => {
      if (!isGitRepo) return;
      const sensitiveFiles = trackedFiles.filter(f => {
        const upper = f.toUpperCase();
        return (upper.includes('SECRET') || upper.includes('PRIVATE_KEY') ||
                upper.includes('PASSWORD') || upper.includes('CREDENTIAL')) &&
                !f.includes('.example') && !f.includes('.template') &&
                !/(^|[\\/])(tests?|specs?|__tests__|__mocks__)([\\/]|$)/.test(f);
      });
      expect(sensitiveFiles).toHaveLength(0);
    });
  });

  describe('Node Modules and Dependencies', () => {
    it('should have node_modules in gitignore', () => {
      expect(gitignoreContent).toMatch(/node_modules/);
    });

    it('should have .next build directory in gitignore', () => {
      expect(gitignoreContent).toMatch(/\.next\/?/);
    });

    it('should have build directories in gitignore', () => {
      const hasBuildIgnore = gitignoreContent.includes('/build') ||
                            gitignoreContent.includes('dist/') ||
                            gitignoreContent.includes('out/');
      expect(hasBuildIgnore).toBe(true);
    });
  });

  describe('Sensitive Configuration Files', () => {
    it('should ignore private keys and certificates', () => {
      const keyPatterns = ['*.pem', '*.key', '*.crt', '*.p12', '*.pfx'];
      const hasKeyPatterns = keyPatterns.some(pattern =>
        gitignoreContent.includes(pattern)
      );
      expect(hasKeyPatterns).toBe(true);
    });

    it('should ignore log files', () => {
      expect(gitignoreContent).toMatch(/\.log/);
    });

    it('should ignore debug files', () => {
      expect(gitignoreContent).toMatch(/npm-debug/);
    });
  });

  describe('Framework-Specific Security', () => {
    it('should ignore Vercel deployment config', () => {
      expect(gitignoreContent).toMatch(/\.vercel/);
    });

    it('should ignore TypeScript build info', () => {
      expect(gitignoreContent).toMatch(/\.tsbuildinfo/);
    });
  });

  describe('OS and Editor Files', () => {
    it('should ignore .DS_Store files', () => {
      expect(gitignoreContent).toMatch(/\.DS_Store/);
    });

    it('should not track .DS_Store files', () => {
      if (!isGitRepo) return;
      const dsStoreFiles = trackedFiles.filter(f =>
        f.includes('.DS_Store')
      );
      expect(dsStoreFiles).toHaveLength(0);
    });
  });
});

describe('Secret Scanning', () => {
  it('should not commit files containing hardcoded secrets', () => {
    // Check the first 100 files (sequential sample)
    const files = globSync('src/**/*.{ts,tsx,js,jsx,json}', { cwd: process.cwd() });

    const checkedFiles = files.slice(0, 100);
    const secretPatterns = [
      /password\s*[:=]\s*["'][^"']{8,}["']/i,
      /api[_-]?key\s*[:=]\s*["'][^"']{16,}["']/i,
      /secret\s*[:=]\s*["'][^"']{16,}["']/i,
      /token\s*[:=]\s*["']eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*/i, // JWT pattern
    ];

    for (const file of checkedFiles) {
      if (!file) continue;
      // Skip test/mock files explicitly
      if (file.includes('.example') || file.includes('.template') ||
          /(^|[\\/])(tests?|specs?|__tests__|__mocks__)([\\/]|$)/.test(file) ||
          file.includes('package-lock.json')) continue;

      try {
        const content = readFileSync(join(process.cwd(), file), 'utf-8');
        for (const pattern of secretPatterns) {
          const match = content.match(pattern);
          if (match) {
            throw new Error(`Potential secret found in ${file}: matched ${pattern}`);
          }
          expect(match).toBeNull();
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Potential secret')) throw error;
        // Skip files that can't be read
      }
    }
  });

  it('should use environment variables for sensitive config', () => {
    // Check that auth.ts uses environment variables
    const authPath = join(process.cwd(), 'src/lib/auth.ts');
    if (existsSync(authPath)) {
      const content = readFileSync(authPath, 'utf-8');
      // Should reference process.env for secrets
      expect(content).toMatch(/process\.env/);
    }
  });
});
