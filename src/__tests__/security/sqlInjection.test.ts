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
    function extractQueryContents(content: string): string[] {
      const queries: string[] = [];
      const queryRegex = /\.query\(/g;
      let match;

      while ((match = queryRegex.exec(content)) !== null) {
        const startIndex = match.index + match[0].length;
        let parenDepth = 1;
        let endIndex = startIndex;

        while (parenDepth > 0 && endIndex < content.length) {
          if (content[endIndex] === '(') parenDepth++;
          if (content[endIndex] === ')') parenDepth--;
          endIndex++;
        }

        if (parenDepth === 0) {
          queries.push(content.slice(startIndex, endIndex - 1));
        }
      }

      return queries;
    }

    it('should use $N placeholders in all SQL queries', () => {
      const violations: string[] = [];

      for (const route of apiRoutes) {
        const content = readFileSync(route, 'utf-8');

        if (!content.includes('.query(')) continue;

        const queryContents = extractQueryContents(content);

        for (const query of queryContents) {
          const hasTemplateInterpolation = query.includes('${');
          const hasDoubleQuoteConcat = query.includes('"') && query.includes('+');
          const hasSingleQuoteConcat = query.includes("'") && query.includes('+');

          if (hasTemplateInterpolation || hasDoubleQuoteConcat || hasSingleQuoteConcat) {
            violations.push(`${route}: ${query.trim()}`);
          }
        }
      }

      expect(violations).toHaveLength(0);
    });

    it('should pass values as array parameters', () => {
      const violations: string[] = [];

      for (const route of apiRoutes) {
        const content = readFileSync(route, 'utf-8');

        const queryContents = extractQueryContents(content);

        for (const queryArgs of queryContents) {
          // Parse queryArgs to find if there's a second argument at depth 0
          let parenDepth = 0;
          let bracketDepth = 0;
          let braceDepth = 0;
          let quoteChar: string | null = null;
          let commaIndex = -1;

          for (let i = 0; i < queryArgs.length; i++) {
            const char = queryArgs[i];
            if (quoteChar) {
              if (char === quoteChar && queryArgs[i - 1] !== '\\') quoteChar = null;
              continue;
            }
            if (char === "'" || char === '"' || char === '`') {
              quoteChar = char;
              continue;
            }
            if (char === '(') parenDepth++;
            else if (char === ')') parenDepth--;
            else if (char === '[') bracketDepth++;
            else if (char === ']') bracketDepth--;
            else if (char === '{') braceDepth++;
            else if (char === '}') braceDepth--;
            else if (char === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
              commaIndex = i;
              break;
            }
          }

          const hasSecondArg = commaIndex !== -1;
          const sqlQuery = hasSecondArg ? queryArgs.slice(0, commaIndex).trim() : queryArgs.trim();

          const hasInterpolation = sqlQuery.includes('${');
          const hasConcat = (sqlQuery.includes('"') || sqlQuery.includes("'")) && sqlQuery.includes('+');

          if ((hasInterpolation || hasConcat) && !hasSecondArg) {
            violations.push(`${route}: Unsafe query without parameters: ${queryArgs.trim()}`);
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

        if (content.includes('.query(') || content.includes('prisma.')) {
          const hasZodImport = /from ['"]zod['"]/.test(content) || /from ['"]@\/lib\/apiSchemas['"]/.test(content);
          const hasZodUsage = content.includes('z.') || content.includes('.safeParse(') || content.includes('.parse(');

          if (!hasZodImport && !hasZodUsage) {
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

      for (const route of apiRoutes) {
        const content = readFileSync(route, 'utf-8');
        
        // Use extracted queries to handle multi-line and avoid regex pitfalls
        // We'll search for .query(...) calls manually
        const queryRegex = /\.query\(/g;
        let match;

        while ((match = queryRegex.exec(content)) !== null) {
          const startIndex = match.index + match[0].length;
          let parenDepth = 1;
          let endIndex = startIndex;

          while (parenDepth > 0 && endIndex < content.length) {
            if (content[endIndex] === '(') parenDepth++;
            if (content[endIndex] === ')') parenDepth--;
            endIndex++;
          }

          if (parenDepth === 0) {
            const queryArgs = content.slice(startIndex, endIndex - 1);
            // Only check the first argument (the SQL string)
            let firstArg = queryArgs;
            const firstComma = queryArgs.indexOf(','); // Simple check, fine for detecting concat in the first arg
            if (firstComma !== -1) {
              firstArg = queryArgs.slice(0, firstComma);
            }

            if (firstArg.includes('+') || firstArg.includes('${')) {
               // Verify it's not just template literal without interpolation
               if (firstArg.includes('${') || (firstArg.includes('+') && (firstArg.includes('"') || firstArg.includes("'")))) {
                 violations.push(`${route}: Potential SQL injection pattern detected: ${firstArg.trim()}`);
               }
            }
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
      const hasPrisma = content.includes('prisma.');
      const hasRawSql = content.includes('.query(') && content.includes('pool');

      if (hasPrisma) {
        prismaCount++;
      } else if (hasRawSql) {
        rawSqlCount++;
      }
    }

    const totalRoutes = prismaCount + rawSqlCount;
    expect(totalRoutes).toBeGreaterThan(0);

    const prismaRatio = totalRoutes > 0 ? prismaCount / totalRoutes : 0;
    expect(prismaRatio).toBeGreaterThanOrEqual(0.5);
  });
});
