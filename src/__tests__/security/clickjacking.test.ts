
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
    // CSP is usually a long string, let's look for the directive
    expect(nextConfigContent).toMatch(/frame-ancestors 'self'/);
  });
});
