
import { readFileSync } from 'fs';
import { join } from 'path';

describe('TypeScript Configuration', () => {
  it('should have strict mode enabled', () => {
    const tsconfigPath = join(process.cwd(), 'tsconfig.json');
    const content = readFileSync(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(content);
    
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });
});
