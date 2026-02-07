
import { glob } from 'glob';
import { readFileSync } from 'fs';

describe('TypeScript Standards', () => {
  it('should not use "enum" keyword (use const assertion or union types instead)', async () => {
    const files = await glob('src/**/*.{ts,tsx}');
    const violations: string[] = [];

    files.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      
      // Look for "enum " but ignore comments and strings
      // This is a naive regex but catches top-level enums
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
        
        if (/\bexport\s+enum\s+\w+/.test(trimmed) || /^enum\s+\w+/.test(trimmed)) {
          violations.push(`${file}:${index + 1}: ${trimmed}`);
        }
      });
    });

    if (violations.length > 0) {
      console.error('Enum violations found:', violations);
    }

    expect(violations).toHaveLength(0);
  });
});
