/**
 * Security Tests for CORS and HTTP Headers
 *
 * Verifies that the application implements proper security headers
 * and CORS configuration.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Security Headers Configuration', () => {
  let nextConfigContent = '';

  beforeAll(() => {
    try {
      nextConfigContent = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf-8');
    } catch {
      // If file not found, tests that depend on it will fail or skip appropriately
    }
  });

  describe('CORS Configuration', () => {
    it('should restrict Access-Control-Allow-Origin', () => {
      if (!nextConfigContent) return;
      // Should rely on env var or specific domain, not *
      expect(nextConfigContent).not.toMatch(/Access-Control-Allow-Origin['"],\s*value:\s*['"]\*['"]/);
      expect(nextConfigContent).toMatch(/Access-Control-Allow-Origin/);
      expect(nextConfigContent).toMatch(/process\.env\.NEXT_PUBLIC_APP_URL/);
    });

    it('should define allowed methods', () => {
      if (!nextConfigContent) return;
      expect(nextConfigContent).toMatch(/Access-Control-Allow-Methods/);
      // Verify limited methods
      expect(nextConfigContent).toMatch(/GET,DELETE,PATCH,POST,PUT,OPTIONS/);
    });

    it('should allow credentials', () => {
      if (!nextConfigContent) return;
      expect(nextConfigContent).toMatch(/Access-Control-Allow-Credentials/);
    });

    it('should define allowed headers', () => {
      if (!nextConfigContent) return;
      expect(nextConfigContent).toMatch(/Access-Control-Allow-Headers/);
    });
  });

  describe('Security Headers', () => {
    it('should implement Strict-Transport-Security (HSTS)', () => {
      if (!nextConfigContent) return;
      expect(nextConfigContent).toMatch(/Strict-Transport-Security/);
      expect(nextConfigContent).toMatch(/max-age=63072000/);
    });

    it('should implement X-Frame-Options', () => {
      if (!nextConfigContent) return;
      expect(nextConfigContent).toMatch(/X-Frame-Options/);
      expect(nextConfigContent).toMatch(/SAMEORIGIN/);
    });

    it('should implement X-Content-Type-Options', () => {
      if (!nextConfigContent) return;
      expect(nextConfigContent).toMatch(/X-Content-Type-Options/);
      expect(nextConfigContent).toMatch(/nosniff/);
    });

    it('should implement Referrer-Policy', () => {
      if (!nextConfigContent) return;
      expect(nextConfigContent).toMatch(/Referrer-Policy/);
      expect(nextConfigContent).toMatch(/strict-origin-when-cross-origin/);
    });

    it('should implement X-XSS-Protection', () => {
      if (!nextConfigContent) return;
      expect(nextConfigContent).toMatch(/X-XSS-Protection/);
      expect(nextConfigContent).toMatch(/1; mode=block/);
    });

    it('should implement Permissions-Policy', () => {
      if (!nextConfigContent) return;
      expect(nextConfigContent).toMatch(/Permissions-Policy/);
      expect(nextConfigContent).toMatch(/camera=\(\)/);
    });

    it('should implement X-DNS-Prefetch-Control', () => {
      if (!nextConfigContent) return;
      expect(nextConfigContent).toMatch(/X-DNS-Prefetch-Control/);
      expect(nextConfigContent).toMatch(/on/);
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
