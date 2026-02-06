/**
 * Security Tests for API Keys and Secrets
 *
 * Verifies that no API keys or secrets are hardcoded in the codebase.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('API Key and Secret Security', () => {
  it('should not contain hardcoded Groq API keys', () => {
    // Groq keys usually start with gsk_
    const result = execSync(
      'git grep "gsk_" -- "*.ts" "*.tsx" "*.js" "*.json" 2>/dev/null || true',
      { encoding: 'utf-8' }
    );
    expect(result).toBe('');
  });

  it('should not contain hardcoded OpenAI API keys', () => {
    // OpenAI keys usually start with sk-
    const result = execSync(
      'git grep "sk-[a-zA-Z0-9]\{20,\}" -- "*.ts" "*.tsx" "*.js" "*.json" 2>/dev/null || true',
      { encoding: 'utf-8' }
    );
    expect(result).toBe('');
  });

  it('should not contain hardcoded Google API keys', () => {
    // Google keys usually start with AIza
    const result = execSync(
      'git grep "AIza[0-9A-Za-z-_]\{35\}" -- "*.ts" "*.tsx" "*.js" "*.json" 2>/dev/null || true',
      { encoding: 'utf-8' }
    );
    expect(result).toBe('');
  });

  it('should not contain hardcoded GitHub tokens', () => {
    // GitHub tokens usually start with ghp_ or github_pat_
    const result = execSync(
      'git grep -E "ghp_|github_pat_" -- "*.ts" "*.tsx" "*.js" "*.json" 2>/dev/null || true',
      { encoding: 'utf-8' }
    );
    expect(result).toBe('');
  });

  it('should use process.env for all sensitive configuration', () => {
    const sensitiveFiles = [
      'src/lib/auth.ts',
      'src/lib/email.ts',
      'src/lib/groqEmail.ts',
      'src/lib/db.ts',
      'src/lib/cache.ts'
    ];

    for (const file of sensitiveFiles) {
      try {
        const content = readFileSync(join(process.cwd(), file), 'utf-8');
        // Verify that sensitive fields use process.env
        if (content.includes('apiKey') || content.includes('secret') || 
            content.includes('password') || content.includes('token')) {
          expect(content).toMatch(/process\.env/);
        }
      } catch {
        // Skip if file not found
      }
    }
  });
});
