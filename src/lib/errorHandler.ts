/**
 * Secure Error Handling Module
 * 
 * Provides centralized error handling that prevents information leakage
 * in production while preserving detailed error information for debugging.
 * 
 * Issue #300 - Fix Verbose Error Messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { securityLogger } from '@/lib/logger';
import { ApiResponse } from '@/types/api';

/**
 * API Error class for structured error responses
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'APIError';
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error codes for client-facing errors
 * These are safe to expose to clients
 */
export const ErrorCodes = {
  // 400 Bad Request
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // 401 Unauthorized
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  
  // 403 Forbidden
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  CSRF_INVALID: 'CSRF_INVALID',
  
  // 404 Not Found
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // 409 Conflict
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // 429 Too Many Requests
  RATE_LIMITED: 'RATE_LIMITED',
  
  // 500 Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Map of error codes to HTTP status codes
 */
const errorCodeToStatus: Record<ErrorCode, number> = {
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_FIELD]: 400,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.INVALID_TOKEN]: 401,
  [ErrorCodes.EXPIRED_TOKEN]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCodes.CSRF_INVALID]: 403,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.DUPLICATE_ENTRY]: 409,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
};

/**
 * User-friendly error messages
 * These messages are safe to show to end users
 */
const userFriendlyMessages: Record<ErrorCode, string> = {
  [ErrorCodes.VALIDATION_ERROR]: 'The provided data is invalid. Please check your input and try again.',
  [ErrorCodes.INVALID_INPUT]: 'Invalid input provided.',
  [ErrorCodes.MISSING_FIELD]: 'Required field is missing.',
  [ErrorCodes.UNAUTHORIZED]: 'Please log in to access this resource.',
  [ErrorCodes.INVALID_TOKEN]: 'Your session is invalid. Please log in again.',
  [ErrorCodes.EXPIRED_TOKEN]: 'Your session has expired. Please log in again.',
  [ErrorCodes.FORBIDDEN]: 'You do not have permission to access this resource.',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'You do not have the required permissions.',
  [ErrorCodes.CSRF_INVALID]: 'Invalid security token. Please refresh the page and try again.',
  [ErrorCodes.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'The requested resource could not be found.',
  [ErrorCodes.CONFLICT]: 'A conflict occurred with the current state of the resource.',
  [ErrorCodes.DUPLICATE_ENTRY]: 'This entry already exists.',
  [ErrorCodes.RATE_LIMITED]: 'Too many requests. Please slow down and try again later.',
  [ErrorCodes.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again later.',
  [ErrorCodes.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later.',
};

/**
 * Sanitize Zod validation errors for production
 * Removes sensitive field information
 */
export function sanitizeValidationError(error: z.ZodError): {
  error: string;
  code: string;
  fields: string[];
} {
  const fields = error.issues.map(issue => issue.path.join('.'));
  
  return {
    error: 'Validation failed',
    code: ErrorCodes.VALIDATION_ERROR,
    fields: [...new Set(fields)], // Deduplicate
  };
}

/**
 * Handle API errors securely
 * Returns safe error responses to clients while logging details internally
 */
export function handleAPIError(error: unknown, requestId?: string): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const timestamp = new Date().toISOString();
  
  // Log detailed error internally
  const errorLog = {
    timestamp,
    requestId,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : { message: String(error) },
  };
  
  securityLogger.error('API Error', errorLog);
  
  // Helper to create a standard error response
  const createErrorResponse = (
    message: string, 
    code: string, 
    status: number, 
    details?: any, 
    stack?: string
  ) => {
    const response: ApiResponse = {
      success: false,
      error: {
        message,
        code,
        ...(details && { details }),
        ...(isDevelopment && stack && { stack }),
      },
      meta: {
        requestId,
        timestamp,
      }
    };
    return NextResponse.json(response, { status });
  };
  
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const sanitized = sanitizeValidationError(error);
    return createErrorResponse(
      sanitized.error,
      sanitized.code,
      400,
      isDevelopment ? error.issues : sanitized.fields
    );
  }
  
  // Handle custom API errors
  if (error instanceof APIError) {
    const errorCode = error.code as ErrorCode;
    const message = isDevelopment
      ? error.message
      : (userFriendlyMessages[errorCode] || userFriendlyMessages[ErrorCodes.INTERNAL_ERROR]);

    const responseCode = (errorCode && userFriendlyMessages[errorCode]) ? errorCode : ErrorCodes.INTERNAL_ERROR;
    const statusCode = (errorCode && userFriendlyMessages[errorCode])
      ? error.statusCode
      : errorCodeToStatus[ErrorCodes.INTERNAL_ERROR];

    return createErrorResponse(message, responseCode, statusCode, null, error.stack);
  }
  
  // Handle Prisma errors (don't expose database details)
  if (error && typeof error === 'object' && 'code' in error && 
      typeof (error as { code: unknown }).code === 'string' &&
      (error as { code: string }).code.startsWith('P')) {
    const prismaError = error as { code: string; message?: string };
    
    const prismaErrorMap: Record<string, ErrorCode> = {
      'P2002': ErrorCodes.DUPLICATE_ENTRY,
      'P2025': ErrorCodes.NOT_FOUND,
      'P2003': ErrorCodes.VALIDATION_ERROR,
    };
    
    const errorCode = prismaErrorMap[prismaError.code];
    if (errorCode) {
      return createErrorResponse(
        userFriendlyMessages[errorCode],
        errorCode,
        errorCodeToStatus[errorCode]
      );
    }
  }
  
  // Generic error
  return createErrorResponse(
    userFriendlyMessages[ErrorCodes.INTERNAL_ERROR],
    ErrorCodes.INTERNAL_ERROR,
    500,
    null,
    error instanceof Error ? error.stack : undefined
  );
}

/**
 * Wrap async API route handlers with error handling
 */
export function withErrorHandling(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

/**
 * Create specific error types for common scenarios
 */
export const Errors = {
  validation: (message?: string) => 
    new APIError(400, message || 'Validation failed', ErrorCodes.VALIDATION_ERROR),
  
  unauthorized: (message?: string) => 
    new APIError(401, message || 'Unauthorized', ErrorCodes.UNAUTHORIZED),
  
  forbidden: (message?: string) => 
    new APIError(403, message || 'Forbidden', ErrorCodes.FORBIDDEN),
  
  notFound: (message?: string) => 
    new APIError(404, message || 'Not found', ErrorCodes.NOT_FOUND),
  
  conflict: (message?: string) => 
    new APIError(409, message || 'Conflict', ErrorCodes.CONFLICT),
  
  rateLimited: (message?: string) => 
    new APIError(429, message || 'Too many requests', ErrorCodes.RATE_LIMITED),
  
  internal: (message?: string) => 
    new APIError(500, message || 'Internal server error', ErrorCodes.INTERNAL_ERROR),
};

/**
 * Client-side error message helper
 * Gets user-friendly message from error response
 */
export function getErrorMessage(error: { code?: string; error?: string; message?: string }): string {
  if (error.code && error.code in userFriendlyMessages) {
    return userFriendlyMessages[error.code as ErrorCode];
  }
  
  return error.error || error.message || userFriendlyMessages[ErrorCodes.INTERNAL_ERROR];
}
