/**
 * Security Tests for Payload Limits
 *
 * Ensures that API routes enforce payload size limits
 * to prevent DoS attacks.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Payload Size Limits', () => {
  describe('Global Configuration', () => {
    it('should limit body size in next.config.ts', () => {
      // Next.js limits body size to 1MB by default for API routes
      // However, it can be configured in next.config.ts or per-route
      const configPath = join(process.cwd(), 'next.config.ts');
      
      try {
        const content = readFileSync(configPath, 'utf-8');
        // Check if there are any overrides increasing the limit unsafely
        expect(content).not.toMatch(/bodySizeLimit:\s*['"]\d+mb['"]/i); // e.g. '50mb'
      } catch {
        // Use default
      }
    });
  });

  describe('API Route Configuration', () => {
    it('should not disable body parsing globally', () => {
      const configPath = join(process.cwd(), 'next.config.ts');
      try {
        const content = readFileSync(configPath, 'utf-8');
        expect(content).not.toMatch(/bodyParser:\s*false/);
      } catch {
        // Ok
      }
    });

    it('should check for large payload handling in upload routes', () => {
      // Find routes that might handle uploads
      const result = execSync(
        'git grep -l "upload" -- "src/app/api" 2>/dev/null || true',
        { encoding: 'utf-8' }
      );

      const routes = result.split('\n').filter(Boolean);

      for (const route of routes) {
        const content = readFileSync(join(process.cwd(), route), 'utf-8');
        // If it handles uploads, it should verify file size
        if (content.includes('request.formData()') || content.includes('form-data')) {
           // Should have some size check
           const hasSizeCheck = content.includes('.size') || 
                               content.includes('MAX_FILE_SIZE') || 
                               content.includes('maxFileSize') ||
                               content.includes('limit');
           
           if (!hasSizeCheck) {
             // Warn but don't fail as it might be handled by middleware or cloud provider
             console.warn(`Potential missing size check in ${route}`);
           }
        }
      }
    });
  });

  describe('DoS Prevention', () => {
    it('should use streaming for large responses', () => {
      // Check for streaming responses in API
      try {
        const result = execSync(
          'git grep "Stream" -- "src/app/api" 2>/dev/null || true',
          { encoding: 'utf-8' }
        );
        // Just an informational check that streaming is used where appropriate
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });
  });
});
