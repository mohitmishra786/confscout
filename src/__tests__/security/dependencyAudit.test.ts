/**
 * Security Audit Test
 *
 * This test verifies that no high severity vulnerabilities exist in dependencies.
 * Run this test as part of CI/CD to ensure security compliance.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function runNpmAudit(): Record<string, unknown> {
  let auditOutput: string;

  try {
    auditOutput = execSync('npm audit --json', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error) {
    if (error && typeof error === 'object') {
      const execError = error as { stdout?: unknown; stderr?: unknown };
      if ('stdout' in execError && execError.stdout) {
        auditOutput = String(execError.stdout);
      } else if ('stderr' in execError && execError.stderr) {
        throw new Error(`npm audit produced no JSON output: ${execError.stderr}`);
      } else {
        throw new Error('npm audit failed with no output');
      }
    } else {
      throw new Error('npm audit execution failed');
    }
  }

  try {
    return JSON.parse(auditOutput || '{}');
  } catch (_e) {
    throw new Error(`Failed to parse npm audit output as JSON: ${auditOutput.slice(0, 100)}...`);
  }
}

describe('Security Audit', () => {
  it('should have no high or critical severity vulnerabilities', () => {
    const auditResult = runNpmAudit() as {
      vulnerabilities?: Record<string, { severity?: string }>;
      metadata?: { vulnerabilities?: { critical?: number; high?: number } };
    };

    const vulnerabilities = auditResult.vulnerabilities || {};
    const highSeverityVulns = Object.entries(vulnerabilities).filter(
      ([, data]) => {
        const severity = data.severity?.toLowerCase() || '';
        return severity === 'high' || severity === 'critical';
      }
    );

    const metadata = auditResult.metadata || {};
    const criticalCount = metadata.vulnerabilities?.critical || 0;
    const highCount = metadata.vulnerabilities?.high || 0;

    expect(highSeverityVulns).toHaveLength(0);
    expect(criticalCount).toBe(0);
    expect(highCount).toBe(0);
  });

  it('should verify lockfile integrity', () => {
    // Ensure package-lock.json exists and is properly formatted
    const lockfilePath = join(process.cwd(), 'package-lock.json');
    expect(existsSync(lockfilePath)).toBe(true);

    const lockfileContent = readFileSync(lockfilePath, 'utf-8');
    const lockfile = JSON.parse(lockfileContent);

    // Verify lockfile version is current
    expect(lockfile.lockfileVersion).toBeGreaterThanOrEqual(2);

    // Verify dependencies are locked (packages map is non-empty)
    const packages = Object.keys(lockfile.packages || {});
    expect(packages.length).toBeGreaterThan(0);
  });
});
