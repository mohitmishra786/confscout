
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Clickjacking Prevention', () => {
  let nextConfigContent: string;

  beforeAll(() => {
    nextConfigContent = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf-8');
  });

  it('should implement X-Frame-Options header', () => {
    expect(nextConfigContent).toMatch(/key:\s*['"]X-Frame-Options['"]/);
    expect(nextConfigContent).toMatch(/value:\s*['"]SAMEORIGIN['"]/);
  });

  it('should implement CSP frame-ancestors directive', () => {
    // CSP is now in src/lib/csp.ts
    const cspContent = readFileSync(join(process.cwd(), 'src/lib/csp.ts'), 'utf-8');
    expect(cspContent).toMatch(/frame-ancestors '(self|none)'/);
  });
});
