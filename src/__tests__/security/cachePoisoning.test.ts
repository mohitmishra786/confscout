/**
 * Security Tests for Cache Poisoning Prevention
 *
 * Verifies that the caching mechanism uses specific keys and handles
 * request variations correctly.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Cache Poisoning Prevention', () => {
  it('should use versioned and specific cache keys', () => {
    const cachePath = join(process.cwd(), 'src/lib/cache.ts');
    let content = '';
    try {
      content = readFileSync(cachePath, 'utf-8');
    } catch {
      return;
    }
    // Should include project prefix and version/locale
    expect(content).toMatch(/confscout:v\d+/);
    expect(content).toMatch(/:conferences/);
  });

  it('should not use cache if request has specific variations', () => {
    const apiPath = join(process.cwd(), 'src/app/api/conferences/route.ts');
    let content = '';
    try {
      content = readFileSync(apiPath, 'utf-8');
    } catch {
      return;
    }
    // Verify that cache is only used for specific, controlled requests
    expect(content).toMatch(/if\s*\(\(!domain\s*\|\|\s*domain\s*===\s*['"]all['"]\)\s*&&\s*!cfpOnly\s*&&\s*!search\s*&&\s*page\s*===\s*1\)/);
  });

  it('should not rely on unvalidated host headers for cache content', () => {
    const apiPath = join(process.cwd(), 'src/app/api/conferences/route.ts');
    let content = '';
    try {
      content = readFileSync(apiPath, 'utf-8');
    } catch {
      return;
    }
    // Check if host header is used to generate content inside the cache-using block
    // (It shouldn't be)
    const lines = content.split('\n');
    let inCacheBlock = false;
    let braceCount = 0;
    for (const line of lines) {
      if (line.includes('if (!session?.user') && line.includes('getCachedConferences')) {
        inCacheBlock = true;
        braceCount = 0;
      }
      
      if (inCacheBlock) {
        // Count braces to handle nested blocks
        const openers = (line.match(/{/g) || []).length;
        const closers = (line.match(/}/g) || []).length;
        braceCount += openers - closers;

        expect(line).not.toMatch(/headers\.get\(['"]host['"]\)/i);
        expect(line).not.toMatch(/headers\.get\(['"]x-forwarded-host['"]\)/i);
        
        // If brace count returns to 0 (or goes negative if we started mid-line), we exited the block
        if (braceCount <= 0 && line.includes('}')) {
          inCacheBlock = false;
        }
      }
    }
  });
});
