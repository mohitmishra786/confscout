/**
 * Security Tests for SQL Injection and Least Privilege
 *
 * Verifies that database queries use parameterized inputs
 * and do not use dangerous raw SQL patterns.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

describe('Database Security', () => {
  it('should use parameterized queries for all raw SQL', () => {
    // Search for .query() calls in files using pg or similar
    try {
      const result = execSync(
        'git grep -n ".query(" -- "src/**/*.ts" 2>/dev/null || true',
        { encoding: 'utf-8' }
      );

      const lines = result.split('\n').filter(Boolean);
      const violations: string[] = [];
      
      for (const line of lines) {
        if (line.includes('test')) continue;
        
        // If it uses template literals with variables directly, it might be unsafe
        // e.g. .query(`SELECT * FROM users WHERE id = ${id}`)
        // vs .query('SELECT * FROM users WHERE id = $1', [id])
        if (line.includes('${') && line.includes('query(')) {
           violations.push(line);
        }
      }
      expect(violations).toHaveLength(0);
    } catch (error) {
      if (error instanceof Error && error.message.includes('expect')) throw error;
      // Skip if git/grep fails for other reasons
    }
  });

  it('should not use dangerous Prisma methods like $queryRawUnsafe without careful audit', () => {
    try {
      const result = execSync(
        'git grep -n "\\$queryRawUnsafe" -- "src/**/*.ts" 2>/dev/null || true',
        { encoding: 'utf-8' }
      );
      const lines = result.split('\n').filter(line => line && !line.includes('database.test.ts'));
      expect(lines).toHaveLength(0);
    } catch (error) {
      if (error instanceof Error && error.message.includes('expect')) throw error;
    }
  });

  it('should not expose database internal errors', () => {
    let apiRoutes: string[] = [];
    try {
      apiRoutes = execSync('find src/app/api -name "route.ts" 2>/dev/null || true', { encoding: 'utf-8' }).split('\n');
    } catch {
      return;
    }
    
    for (const route of apiRoutes) {
      if (!route) continue;
      try {
        const content = readFileSync(route, 'utf-8');
        // Catch blocks should not return error.message directly if it's a DB error
        if (content.includes('catch') && content.includes('prisma')) {
           // Basic check for error leakage
           expect(content).not.toMatch(/return NextResponse\.json\(\{\s*error:\s*error\.message\s*\}\)/);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    }
  });
});
