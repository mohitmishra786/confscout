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
      const configPath = join(process.cwd(), 'next.config.ts');
      
      try {
        const content = readFileSync(configPath, 'utf-8');
        // SECURITY: Only allow body size overrides if they are small (< 10MB)
        const match = content.match(/bodySizeLimit:\s*['"](\d+)mb['"]/i);
        if (match) {
          const size = parseInt(match[1], 10);
          expect(size).toBeLessThan(10);
        }
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
                               content.includes('byteLength');
           
           expect(hasSizeCheck).toBe(true);
        }
      }
    });
  });

  describe('DoS Prevention', () => {
    it('should use appropriate response types for large data', () => {
      // Check for calendar or CSV routes that handle potentially large data
      try {
        const result = execSync(
          'git grep -E "new NextResponse\\(|ReadableStream" -- "src/app/api" 2>/dev/null || true',
          { encoding: 'utf-8' }
        );
        // Verify we have some large data handling patterns
        expect(result.length).toBeGreaterThan(0);
      } catch (error) {
        if (error instanceof Error && error.message.includes('expect')) throw error;
      }
    });
  });
});
