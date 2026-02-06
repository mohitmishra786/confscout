/**
 * Security Tests for CORS and HTTP Headers
 *
 * Verifies that the application implements proper security headers
 * and CORS configuration.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock NextConfig type
interface NextConfig {
  headers?: () => Promise<Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>>;
}

describe('Security Headers Configuration', () => {
  let nextConfigContent: string;

  beforeAll(() => {
    try {
      nextConfigContent = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf-8');
    } catch {
      nextConfigContent = '';
    }
  });

  describe('CORS Configuration', () => {
    it('should restrict Access-Control-Allow-Origin', () => {
      // Should rely on env var or specific domain, not *
      expect(nextConfigContent).not.toMatch(/Access-Control-Allow-Origin['"],\s*value:\s*['"]\*['"]/);
      expect(nextConfigContent).toMatch(/Access-Control-Allow-Origin/);
      expect(nextConfigContent).toMatch(/process\.env\.NEXT_PUBLIC_APP_URL/);
    });

    it('should define allowed methods', () => {
      expect(nextConfigContent).toMatch(/Access-Control-Allow-Methods/);
      // Verify limited methods
      expect(nextConfigContent).toMatch(/GET,DELETE,PATCH,POST,PUT/);
    });

    it('should allow credentials', () => {
      expect(nextConfigContent).toMatch(/Access-Control-Allow-Credentials/);
    });

    it('should define allowed headers', () => {
      expect(nextConfigContent).toMatch(/Access-Control-Allow-Headers/);
    });
  });

  describe('Security Headers', () => {
    it('should implement Strict-Transport-Security (HSTS)', () => {
      expect(nextConfigContent).toMatch(/Strict-Transport-Security/);
      expect(nextConfigContent).toMatch(/max-age=63072000/);
    });

    it('should implement X-XSS-Protection', () => {
      expect(nextConfigContent).toMatch(/X-XSS-Protection/);
      expect(nextConfigContent).toMatch(/1; mode=block/);
    });

    it('should implement X-Frame-Options', () => {
      expect(nextConfigContent).toMatch(/X-Frame-Options/);
      expect(nextConfigContent).toMatch(/SAMEORIGIN/);
    });

    it('should implement X-Content-Type-Options', () => {
      expect(nextConfigContent).toMatch(/X-Content-Type-Options/);
      expect(nextConfigContent).toMatch(/nosniff/);
    });

    it('should implement Referrer-Policy', () => {
      expect(nextConfigContent).toMatch(/Referrer-Policy/);
      expect(nextConfigContent).toMatch(/strict-origin-when-cross-origin/);
    });
  });

  describe('Middleware Security', () => {
    let middlewareContent: string;

    beforeAll(() => {
      try {
        middlewareContent = readFileSync(join(process.cwd(), 'src/middleware.ts'), 'utf-8');
      } catch {
        middlewareContent = '';
      }
    });

    it('should exist', () => {
      expect(middlewareContent).toBeTruthy();
    });

    it('should not interfere with API CORS headers', () => {
      // Middleware typically shouldn't overwrite API headers unless explicitly designed
      // This is a check to ensure middleware doesn't have "bad" CORS logic
      expect(middlewareContent).not.toMatch(/Access-Control-Allow-Origin.*[*]/);
    });
  });
});
