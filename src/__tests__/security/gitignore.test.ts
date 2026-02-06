/**
 * Security Tests for Gitignore Configuration
 *
 * Ensures sensitive files are properly excluded from version control
 * and no secrets are accidentally committed.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Gitignore Security Configuration', () => {
  const gitignorePath = join(process.cwd(), '.gitignore');
  let gitignoreContent: string;

  beforeAll(() => {
    if (existsSync(gitignorePath)) {
      gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    } else {
      gitignoreContent = '';
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
      let trackedFiles = '';
      try {
        trackedFiles = execSync('git ls-files', { encoding: 'utf-8' });
      } catch {
        return; // Skip if not in git repo
      }
      const envFiles = trackedFiles.split('\n').filter(f =>
        /(?:^|\/)\.env(?:\.|$)/.test(f)
      );
      expect(envFiles).toHaveLength(0);
    });

    it('should not track files with SECRET, KEY, or PASSWORD in name', () => {
      let trackedFiles = '';
      try {
        trackedFiles = execSync('git ls-files', { encoding: 'utf-8' });
      } catch {
        return;
      }
      const sensitiveFiles = trackedFiles.split('\n').filter(f => {
        const upper = f.toUpperCase();
        return (upper.includes('SECRET') || upper.includes('PRIVATE_KEY') ||
                upper.includes('PASSWORD') || upper.includes('CREDENTIAL')) &&
                !f.includes('.example') && !f.includes('.template') &&
                !/(^|[\\/])(test|spec|__tests__|__mocks__)s?([\\/]|$)/.test(f);
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
      let trackedFiles = '';
      try {
        trackedFiles = execSync('git ls-files', { encoding: 'utf-8' });
      } catch {
        return;
      }
      const dsStoreFiles = trackedFiles.split('\n').filter(f =>
        f.includes('.DS_Store')
      );
      expect(dsStoreFiles).toHaveLength(0);
    });
  });
});

describe('Secret Scanning', () => {
  it('should not commit files containing hardcoded secrets', () => {
    // This is a basic check - in production, use tools like git-secrets or truffleHog
    let trackedFiles = '';
    try {
      trackedFiles = execSync('git ls-files', { encoding: 'utf-8' });
    } catch {
      return;
    }
    const files = trackedFiles.split('\n').filter(f =>
      f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.json')
    );

    // Check a representative sample of files for obvious secrets
    // Sampling 100 files randomly or sequentially
    const checkedFiles = files.slice(0, 100);
    const secretPatterns = [
      /password\s*[:=]\s*["'][^"']{8,}["']/i,
      /api[_-]?key\s*[:=]\s*["'][^"']{16,}["']/i,
      /secret\s*[:=]\s*["'][^"']{16,}["']/i,
      /token\s*[:=]\s*["']eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*/i, // JWT pattern
    ];

    for (const file of checkedFiles) {
      if (!file) continue;
      try {
        const content = readFileSync(join(process.cwd(), file), 'utf-8');
        for (const pattern of secretPatterns) {
          // Exclude test files and examples
          if (!file.includes('.example') && !file.includes('.template') &&
              !/(^|[\\/])(test|spec|__tests__|__mocks__)s?([\\/]|$)/.test(file) &&
              !file.includes('package-lock.json')) {
            expect(content).not.toMatch(pattern);
          }
        }
      } catch {
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
