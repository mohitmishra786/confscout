/**
 * Error Handler Module Tests
 * 
 * Tests the secure error handling module.
 * Issue #300 - Fix Verbose Error Messages
 */

import { APIError, ErrorCodes, Errors, getErrorMessage, handleAPIError } from '@/lib/errorHandler';

describe('Error Handler Module (Issue #300)', () => {
  describe('APIError class', () => {
    it('should create error with status code and message', () => {
      const error = new APIError(400, 'Bad Request', 'INVALID_INPUT');
      
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad Request');
      expect(error.code).toBe('INVALID_INPUT');
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new APIError(500, 'Test error');
      expect(error.stack).toBeDefined();
    });
  });

  describe('ErrorCodes constants', () => {
    it('should have all required error codes', () => {
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorCodes.DUPLICATE_ENTRY).toBe('DUPLICATE_ENTRY');
    });
  });

  describe('Error factory functions', () => {
    it('should create validation error with correct properties', () => {
      const error = Errors.validation();
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
    });

    it('should create unauthorized error with correct properties', () => {
      const error = Errors.unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Unauthorized');
    });

    it('should create forbidden error with correct properties', () => {
      const error = Errors.forbidden();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Forbidden');
    });

    it('should create not found error with correct properties', () => {
      const error = Errors.notFound();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Not found');
    });

    it('should create conflict error with correct properties', () => {
      const error = Errors.conflict();
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Conflict');
    });

    it('should create rate limited error with correct properties', () => {
      const error = Errors.rateLimited();
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.message).toBe('Too many requests');
    });

    it('should create internal error with correct properties', () => {
      const error = Errors.internal();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Internal server error');
    });

    it('should accept custom messages', () => {
      const error = Errors.notFound('Custom not found message');
      expect(error.message).toBe('Custom not found message');
    });
  });

  describe('getErrorMessage helper', () => {
    it('should return user-friendly message for validation error', () => {
      const error = { code: 'VALIDATION_ERROR' };
      const message = getErrorMessage(error);
      
      expect(message).toContain('invalid');
    });

    it('should return user-friendly message for unauthorized', () => {
      const error = { code: 'UNAUTHORIZED' };
      const message = getErrorMessage(error);
      
      expect(message).toContain('log in');
    });

    it('should return user-friendly message for rate limited', () => {
      const error = { code: 'RATE_LIMITED' };
      const message = getErrorMessage(error);
      
      expect(message).toContain('slow down');
    });

    it('should return error.error if available', () => {
      const error = { error: 'Custom error message' };
      const message = getErrorMessage(error);
      
      expect(message).toBe('Custom error message');
    });

    it('should return error.message if available', () => {
      const error = { message: 'Another message' };
      const message = getErrorMessage(error);
      
      expect(message).toBe('Another message');
    });

    it('should return fallback message for unknown errors', () => {
      const error = {};
      const message = getErrorMessage(error);
      
      expect(message).toContain('unexpected');
    });
  });

  describe('Error messages are user-friendly', () => {
    it('should not contain technical jargon in user messages', () => {
      const messages = [
        getErrorMessage({ code: 'VALIDATION_ERROR' }),
        getErrorMessage({ code: 'INTERNAL_ERROR' }),
        getErrorMessage({ code: 'DATABASE_ERROR' }),
      ];

      for (const message of messages) {
        expect(message).not.toContain('SQL');
        expect(message).not.toContain('stack');
        expect(message).not.toContain('undefined');
        expect(message).not.toContain('null');
        expect(message).not.toContain('exception');
      }
    });

    it('should not expose system paths or internals', async () => {
      // Create an error with sensitive path information
      const internalError = new APIError(500, 'Error at /usr/src/app/src/db.ts:42', 'INTERNAL_ERROR');

      // Pass through handleAPIError to test actual production sanitization
      const response = handleAPIError(internalError);
      const body = await response.json();

      // The error message should not be directly exposed to users in production
      // It should be mapped to a user-friendly message
      expect(body.error).not.toContain('/usr/src');
      expect(body.error).not.toContain('db.ts');
      // Should have user-friendly message instead
      expect(body.error).toContain('unexpected');
      // Original error with path is preserved in the error object but not exposed
      expect(internalError.message).toContain('/usr/src');
    });
  });
});
