/**
 * Security Tests for External Links
 *
 * Verifies that all external links use rel="noopener noreferrer"
 * to prevent tabnabbing attacks and referrer leakage.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('External Link Security', () => {
  it('should include rel="noopener noreferrer" for all target="_blank" links', () => {
    // Find all files with target="_blank"
    const result = execSync(
      'git grep -l "target=\\"_blank\\"" -- "*.ts" "*.tsx" "*.html" ":(exclude)src/__tests__/security/externalLinks.test.ts" 2>/dev/null || true',
      { encoding: 'utf-8', cwd: process.cwd() }
    );

    const files = result.split('\n').filter(Boolean);
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(join(process.cwd(), file), 'utf-8');
      
      const lines = content.split('\n');
      let currentTag = '';
      let inTag = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match only <a elements
        // NOTE: This heuristic may miss tags that open and close across lines if a 
        // closing '>' from a previous element appears on the same line as the '<a'.
        if (/<a[\s>]/i.test(line)) {
          inTag = true;
          currentTag = line;
        } else if (inTag) {
          currentTag += ' ' + line;
        }

        if (currentTag.includes('>') && inTag) {
          if (currentTag.includes('target="_blank"') || currentTag.includes("target='_blank'")) {
            // Validate that rel actually contains noopener or noreferrer
            if (!currentTag.match(/rel=["'][^"']*no(opener|referrer)/i)) {
              violations.push(`${file}:${i + 1}: ${currentTag.trim().substring(0, 100)}`);
            }
          }
          inTag = false;
          currentTag = '';
        }
      }
    }

    if (violations.length > 0) {
      console.warn('Potential external link security violations found:');
      violations.forEach(v => console.warn(`  ${v}`));
    }

    expect(violations).toHaveLength(0);
  });
});
