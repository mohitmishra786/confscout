
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Subresource Integrity (SRI)', () => {
  it('should ensure all external scripts have integrity attributes', async () => {
    // Find all TSX/TS files
    const files = await glob('src/**/*.{tsx,ts}', { ignore: ['**/*.test.ts', '**/*.test.tsx'] });
    
    const violations: string[] = [];

    files.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      
      // Look for <script src="..."> tags
      // This regex looks for script tags with src attribute that are NOT internal (starting with / or .)
      // and do NOT have an integrity attribute.
      // It handles multiline tags roughly.
      
      const scriptRegex = /<script[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
      let match;
      
      while ((match = scriptRegex.exec(content)) !== null) {
        const fullTag = match[0];
        
        // Skip if it already has integrity
        if (fullTag.includes('integrity=')) continue;
        
        // Skip common verified internal/safe scripts if any (e.g. from specific trusted domains if we allow them without SRI - but we shouldn't)
        // For this test, we enforce SRI for ALL absolute URL scripts.
        
        violations.push(`${file}: ${fullTag}`);
      }
    });

    if (violations.length > 0) {
      console.error('SRI Violations found:', violations);
    }

    expect(violations).toHaveLength(0);
  });

  it('should ensure all external stylesheets have integrity attributes', async () => {
    // Similar check for <link rel="stylesheet" href="...">
    const files = await glob('src/**/*.{tsx,ts}', { ignore: ['**/*.test.ts', '**/*.test.tsx'] });
    
    const violations: string[] = [];

    files.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      
      // Look for link tags with stylesheet rel and absolute href
      const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
      // Also handle href coming before rel
      const linkRegex2 = /<link[^>]+href=["'](https?:\/\/[^"']+)["'][^>]+rel=["']stylesheet["'][^>]*>/gi;
      
      const checkMatch = (regex: RegExp) => {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const fullTag = match[0];
          if (fullTag.includes('integrity=')) continue;
          violations.push(`${file}: ${fullTag}`);
        }
      };

      checkMatch(linkRegex);
      checkMatch(linkRegex2);
    });

    if (violations.length > 0) {
      console.error('SRI Violations found (CSS):', violations);
    }

    expect(violations).toHaveLength(0);
  });
});
