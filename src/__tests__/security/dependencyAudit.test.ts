/**
 * Security Audit Test
 * 
 * This test verifies that no high severity vulnerabilities exist in dependencies.
 * Run this test as part of CI/CD to ensure security compliance.
 */

import { execSync } from 'child_process';

describe('Security Audit', () => {
  it('should have no high severity vulnerabilities', () => {
    let auditOutput: string;
    
    try {
      // Run npm audit and capture output
      auditOutput = execSync('npm audit --json', { 
        encoding: 'utf-8',
        cwd: process.cwd()
      });
    } catch (error: any) {
      // npm audit returns non-zero exit code when vulnerabilities found
      auditOutput = error.stdout || '{}';
    }

    const auditResult = JSON.parse(auditOutput);
    
    // Check for high and critical severity vulnerabilities
    const vulnerabilities = auditResult.vulnerabilities || {};
    const highSeverityVulns = Object.entries(vulnerabilities).filter(
      ([_, data]: [string, any]) => {
        const severity = data.severity?.toLowerCase() || '';
        return severity === 'high' || severity === 'critical';
      }
    );

    // Expect no high or critical severity vulnerabilities
    expect(highSeverityVulns).toHaveLength(0);
  });

  it('should have all dependencies within acceptable severity levels', () => {
    let auditOutput: string;
    
    try {
      auditOutput = execSync('npm audit --json', { 
        encoding: 'utf-8',
        cwd: process.cwd()
      });
    } catch (error: any) {
      auditOutput = error.stdout || '{}';
    }

    const auditResult = JSON.parse(auditOutput);
    const metadata = auditResult.metadata || {};
    
    // Verify no critical vulnerabilities exist
    expect(metadata.vulnerabilities?.critical || 0).toBe(0);
    
    // Verify no high vulnerabilities exist
    expect(metadata.vulnerabilities?.high || 0).toBe(0);
  });

  it('should verify lockfile integrity', () => {
    // Ensure package-lock.json exists and is properly formatted
    const fs = require('fs');
    const path = require('path');
    
    const lockfilePath = path.join(process.cwd(), 'package-lock.json');
    expect(fs.existsSync(lockfilePath)).toBe(true);
    
    const lockfileContent = fs.readFileSync(lockfilePath, 'utf-8');
    const lockfile = JSON.parse(lockfileContent);
    
    // Verify lockfile version is current
    expect(lockfile.lockfileVersion).toBeGreaterThanOrEqual(3);
    
    // Verify all dependencies are locked
    expect(Object.keys(lockfile.packages || {})).toContain('node_modules/next');
    expect(Object.keys(lockfile.packages || {})).toContain('node_modules/fast-xml-parser');
  });
});
