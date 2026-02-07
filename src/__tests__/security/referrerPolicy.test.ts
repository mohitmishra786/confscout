
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Referrer Policy', () => {
  it('should be configured to strict-origin-when-cross-origin in next.config.ts', () => {
    const configPath = join(process.cwd(), 'next.config.ts');
    const content = readFileSync(configPath, 'utf-8');
    
    // Check for Referrer-Policy header configuration
    expect(content).toMatch(/key:\s*['"]Referrer-Policy['"]/);
    expect(content).toMatch(/value:\s*['"]strict-origin-when-cross-origin['"]/);
  });

  // If we had middleware setting headers, we would test it here too.
  // Since next.config.ts handles it globally, this is sufficient.
});
