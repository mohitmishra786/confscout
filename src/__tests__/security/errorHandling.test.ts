/**
 * Security Tests for Error Handling
 *
 * Ensures that error messages do not leak sensitive information
 * (stack traces, system paths, internal configuration) in production.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Error Handling Security', () => {
  describe('Global Error Handlers', () => {
    it('should catch unhandled exceptions', () => {
      // Check for global-error.tsx or error.tsx
      const hasGlobalError = tryReadFile('src/app/global-error.tsx') || tryReadFile('src/app/error.tsx');
      expect(hasGlobalError).toBeTruthy();
    });

    it('should not display stack traces in production', () => {
      // Verify that error components don't render error.stack directly
      const globalError = tryReadFile('src/app/global-error.tsx');
      const errorPage = tryReadFile('src/app/[locale]/error.tsx'); // Standard Next.js error page
      const errorBoundary = tryReadFile('src/components/ErrorBoundary.tsx');

      const content = (globalError || '') + (errorPage || '') + (errorBoundary || '');
      
      // Should not contain {error.stack} or similar in JSX
      expect(content).not.toMatch(/{[^}]*error\.stack[^}]*}/);
      expect(content).not.toMatch(/<pre>[^<]*error\.stack[^<]*<\/pre>/);
    });
  });

  describe('API Error Handling', () => {
    it('should generally return generic error messages', () => {
      // Check API routes for generic error responses
      let apiRoutes: string[] = [];
      try {
        apiRoutes = execSync('find src/app/api -name "route.ts" 2>/dev/null', { encoding: 'utf-8' }).split('\n');
      } catch {
        // If find fails, maybe the directory structure is different or it's not a git repo
        return;
      }
      
      let safeErrors = 0;
      let totalChecks = 0;

      for (const route of apiRoutes) {
        if (!route) continue;
        const content = readFileSync(route, 'utf-8');
        
        // Check for try-catch blocks returning generic errors
        if (content.includes('NextResponse.json') && content.includes('catch')) {
          totalChecks++;
          const genericErrorPatterns = [
            /error:\s*['"]Internal Server Error['"]/,
            /error:\s*['"]Something went wrong['"]/,
            /error:\s*['"]Failed to/,
            /status:\s*500/,
            /status:\s*403/
          ];
          
          if (genericErrorPatterns.some(p => p.test(content))) {
            safeErrors++;
          }
        }
      }

      // Most API routes should use generic error messages
      if (totalChecks > 0) {
        expect(safeErrors / totalChecks).toBeGreaterThanOrEqual(0.8);
      }
    });

    it('should not leak stack traces in API responses', () => {
      // Check for direct error object returns which might serialize stack
      const result = execSync(
        'git grep "return NextResponse.json.*error.*}" -- "src/app/api" 2>/dev/null || true',
        { encoding: 'utf-8' }
      );

      // Should not see patterns like { error: err } or { error } which might leak details
      // Instead should see { error: 'message' } or { error: error.message }
      const dangerousLeak = result.split('\n').filter(line => {
        if (!line) return false;
        // Check for { error } or { error: err } where err is an error object
        const isDangerous = line.includes('NextResponse.json(error)') || 
                           (line.match(/NextResponse\.json\(\{\s*error\s*\}\)/) && !line.includes('error: "') && !line.includes("error: '"));
        return isDangerous;
      });

      expect(dangerousLeak).toHaveLength(0);
    });
  });

  describe('Production Configuration', () => {
    it('should hide source maps in production unless needed', () => {
      const nextConfig = tryReadFile('next.config.ts');
      if (nextConfig) {
        // Source maps should generally be hidden or Sentry-only
        // This is a heuristic check
        expect(nextConfig).not.toMatch(/productionBrowserSourceMaps:\s*true/);
      }
    });
  });
});

function tryReadFile(path: string): string | null {
  try {
    return readFileSync(join(process.cwd(), path), 'utf-8');
  } catch {
    return null;
  }
}
