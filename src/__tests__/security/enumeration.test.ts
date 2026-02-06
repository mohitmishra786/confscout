/**
 * Security Tests for Resource Enumeration Prevention
 *
 * Verifies that the application uses non-sequential IDs for public resources
 * and does not leak sequential IDs in API responses.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Resource Enumeration Prevention', () => {
  it('should use non-sequential IDs for User model', () => {
    const schemaPath = join(process.cwd(), 'prisma/schema.prisma');
    let content = '';
    try {
      content = readFileSync(schemaPath, 'utf-8');
    } catch {
      return;
    }
    const match = content.match(/model\s+User\s*{([\s\S]*?)}/);
    if (!match) throw new Error('User model not found in schema.prisma');
    const userModel = match[1];
    
    // Should use cuid() or uuid()
    expect(userModel).toMatch(/id\s+String\s+@id\s+@default\((cuid|uuid)\(\)\)/);
  });

  it('should use non-sequential IDs for Bookmark model', () => {
    const schemaPath = join(process.cwd(), 'prisma/schema.prisma');
    let content = '';
    try {
      content = readFileSync(schemaPath, 'utf-8');
    } catch {
      return;
    }
    const match = content.match(/model\s+Bookmark\s*{([\s\S]*?)}/);
    if (!match) throw new Error('Bookmark model not found in schema.prisma');
    const model = match[1];
    expect(model).toMatch(/id\s+String\s+@id\s+@default\((cuid|uuid)\(\)\)/);
  });

  it('should not expose Subscriber sequential IDs in API', () => {
    // Subscriber uses Int autoincrement, so we must ensure it's not in API responses
    const apiPath = join(process.cwd(), 'src/app/api/subscribe/route.ts');
    let content = '';
    try {
      content = readFileSync(apiPath, 'utf-8');
    } catch {
      return;
    }
    
    // Check for NextResponse.json calls and ensure they don't include raw IDs
    // Strip comments first to avoid false positives
    const contentWithoutComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    
    // Match NextResponse.json({ ... }) patterns
    const jsonCalls = contentWithoutComments.match(/NextResponse\.json\s*\(\s*\{[\s\S]*?\}\s*(?:,|\))/g) || [];
    
    for (const call of jsonCalls) {
      // Should not contain "id:" as a key (word boundary used to avoid conferenceId etc)
      // Sequential IDs are usually just 'id'
      expect(call).not.toMatch(/\bid\s*:/i);
    }
  });

  it('should use generic error messages for auth to prevent user enumeration', () => {
    const registerPath = join(process.cwd(), 'src/app/api/auth/register/route.ts');
    let content = '';
    try {
      content = readFileSync(registerPath, 'utf-8');
    } catch {
      return;
    }
    // Should not distinguish between "email taken" and other failures if possible,
    // but usually "Registration failed" is the generic way.
    expect(content).toMatch(/Registration failed/);
  });

  it('should not have predictable sequential paths for sensitive resources', () => {
    // Check for patterns like /api/users/1, /api/users/2
    const PREDICTABLE_PATH_THRESHOLD = 0;
    try {
      const result = execSync(
        'git grep -E "/api/[a-z]*/[0-9]+" -- "src/**/*.ts" "src/**/*.tsx" 2>/dev/null || true',
        { encoding: 'utf-8' }
      );
      // Filter out static data or known safe paths
      const matches = result.split('\n').filter(line => line && !line.includes('test'));
      expect(matches.length).toBe(PREDICTABLE_PATH_THRESHOLD);
    } catch (error) {
      if (error instanceof Error && error.message.includes('expect')) throw error;
    }
  });
});
