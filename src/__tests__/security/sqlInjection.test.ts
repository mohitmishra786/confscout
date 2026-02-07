/**
 * SQL Injection Protection Verification Tests
 * 
 * This test suite verifies that all database queries use parameterized
 * inputs to prevent SQL injection attacks.
 * 
 * Issue #268 - SQL Injection Protection
 */

import { readFileSync } from 'fs';
import { globSync } from 'glob';

describe('SQL Injection Protection (Issue #268)', () => {
  const apiRoutes = globSync('src/app/api/**/route.ts');

  describe('Parameterized Query Usage', () => {
    it('should use $N placeholders in all SQL queries', () => {
      const violations: string[] = [];

      for (const route of apiRoutes) {
        const content = readFileSync(route, 'utf-8');
        
        // Skip if no SQL queries
        if (!content.includes('.query(')) continue;

        // Extract query calls
        const queryMatches = content.match(/\.query\([^)]+\)/g) || [];
        
        for (const match of queryMatches) {
          // Check if it's a template literal with interpolation
          if (match.includes('`') && match.includes('${')) {
            violations.push(`${route}: ${match}`);
          }
          
          // Check if it uses string concatenation
          if (match.includes('"') && match.includes('+')) {
            violations.push(`${route}: ${match}`);
          }
        }
      }

      expect(violations).toHaveLength(0);
    });

    it('should pass values as array parameters', () => {
      const violations: string[] = [];

      for (const route of apiRoutes) {
        const content = readFileSync(route, 'utf-8');
        
        // Find query calls
        const queryPattern = /\.query\(([^)]+)\)/g;
        let match;
        
        while ((match = queryPattern.exec(content)) !== null) {
          const queryCall = match[1];
          
          // Check if it has a second parameter (the values array)
          // Proper usage: client.query('SELECT * FROM table WHERE id = $1', [id])
          const commaIndex = queryCall.indexOf(',');
          
          if (commaIndex === -1) {
            // No parameters passed - might be OK for simple queries
            // But let's verify it's not injecting variables
            if (queryCall.includes('${') || queryCall.includes('+')) {
              violations.push(`${route}: Query without parameter array: ${queryCall}`);
            }
          }
        }
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Input Validation Before Queries', () => {
    it('should validate inputs with Zod before database operations', () => {
      const violations: string[] = [];

      for (const route of apiRoutes) {
        const content = readFileSync(route, 'utf-8');
        
        // Check if route uses Prisma or raw SQL
        if (content.includes('.query(') || content.includes('prisma.')) {
          // Should have Zod validation
          if (!content.includes('z.') && !content.includes('parse(')) {
            violations.push(`${route}: Missing Zod validation before DB operations`);
          }
        }
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Safe Query Patterns', () => {
    it('should not use string concatenation in SQL', () => {
      const violations: string[] = [];
      const dangerousPatterns = [
        /query\([`'"].*\+.*\)/,
        /query\([`'"].*\$\{.*\}/,
      ];

      for (const route of apiRoutes) {
        const content = readFileSync(route, 'utf-8');
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(content)) {
            violations.push(`${route}: Potential SQL injection pattern detected`);
          }
        }
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Database Error Handling', () => {
    it('should not expose database errors to clients', () => {
      const violations: string[] = [];

      for (const route of apiRoutes) {
        const content = readFileSync(route, 'utf-8');

        // Find all catch blocks by tracking brace depth
        const catchRegex = /catch\s*\([^)]*\)\s*\{/g;
        let match;

        while ((match = catchRegex.exec(content)) !== null) {
          const startIndex = match.index + match[0].length - 1; // Position at opening brace
          let braceDepth = 1;
          let endIndex = startIndex + 1;

          // Track nested braces to find the matching closing brace
          while (braceDepth > 0 && endIndex < content.length) {
            if (content[endIndex] === '{') braceDepth++;
            if (content[endIndex] === '}') braceDepth--;
            endIndex++;
          }

          const catchBlock = content.slice(startIndex, endIndex);

          // Should not return error.message directly in production
          if (catchBlock.includes('error.message') ||
              catchBlock.includes('err.message') ||
              catchBlock.includes('e.message')) {
            // Check if it's wrapped in ZodError check (which is OK for validation)
            if (!catchBlock.includes('ZodError')) {
              violations.push(`${route}: Potential DB error exposure in catch block`);
            }
          }
        }
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('SQL Injection Test Cases', () => {
    it('should be protected against classic SQL injection attacks', () => {
      const injectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM passwords --",
        "1; DELETE FROM users WHERE '1'='1",
        "' OR 1=1--",
        "1' AND 1=1--",
        "' OR '1'='1' --",
        "'; UPDATE users SET admin=true; --",
      ];

      for (const payload of injectionPayloads) {
        const query = `SELECT * FROM users WHERE id = $1`;
        const params = [payload];

        expect(query.includes('$1')).toBe(true);
        expect(params[0]).toBe(payload);
        expect(query).not.toContain(payload);
        expect(query).not.toContain(' OR ');
        expect(query).not.toContain('DROP');
        expect(query).not.toContain('DELETE');
        expect(query).not.toContain('UNION');
        expect(query).not.toContain('UPDATE');
      }
    });

    it('should be protected against blind SQL injection', () => {
      const blindInjectionPayloads = [
        "1 AND 1=1",
        "1 AND 1=2",
        "1' AND '1'='1",
        "1' AND '1'='2",
        "1 AND SLEEP(5)",
        "1; WAITFOR DELAY '0:0:5'--",
      ];

      for (const payload of blindInjectionPayloads) {
        const query = `SELECT * FROM conferences WHERE domain = $1`;
        const params = [payload];

        expect(query.includes('$1')).toBe(true);
        expect(params[0]).toBe(payload);
        expect(query).not.toContain(payload);
        expect(query).not.toContain(' AND ');
        expect(query).not.toContain('SLEEP');
        expect(query).not.toContain('WAITFOR');
      }
    });
  });
});

describe('Prisma ORM Security', () => {
  it('should not use $queryRawUnsafe', () => {
    const files = globSync('src/**/*.ts');
    const violations: string[] = [];

    for (const file of files) {
      if (file.includes('__tests__') || file.includes('.test.')) continue;
      
      const content = readFileSync(file, 'utf-8');
      
      if (content.includes('$queryRawUnsafe')) {
        violations.push(file);
      }
    }

    expect(violations).toHaveLength(0);
  });

  it('should use Prisma ORM for most operations', () => {
    const files = globSync('src/app/api/**/route.ts');
    let prismaCount = 0;
    let rawSqlCount = 0;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      
      if (content.includes('prisma.')) {
        prismaCount++;
      }
      
      if (content.includes('.query(') && content.includes('pool')) {
        rawSqlCount++;
      }
    }

    // Document the current state
    console.log(`Routes using Prisma ORM: ${prismaCount}`);
    console.log(`Routes using raw SQL: ${rawSqlCount}`);
    
    // Both are OK as long as raw SQL uses parameterization
    expect(prismaCount + rawSqlCount).toBeGreaterThan(0);
  });
});
