import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';
import { securityLogger } from '@/lib/logger';
import { withErrorHandling, Errors } from '@/lib/errorHandler';
import { bodySchemas } from '@/lib/apiSchemas';
import { ApiResponse } from '@/types/api';
import { env } from '@/lib/env';

const DEFAULT_BCRYPT_ROUNDS = 14;

export const POST = withErrorHandling(async (request: NextRequest) => {
  if (!await validateCsrfToken(request)) {
    securityLogger.warn('Invalid CSRF token on registration attempt');
    throw Errors.forbidden('Invalid CSRF token');
  }

  const body = await request.json();
  const { name, email, password } = bodySchemas.register.parse(body);

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    // Use a non-PII identifier for logging (first 8 chars of hash)
    const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 8);
    securityLogger.info('Registration attempt with existing email', { emailId: emailHash });
    
    // SECURITY: Return success even if user exists to prevent email enumeration
    const response: ApiResponse = {
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      meta: { timestamp: new Date().toISOString() }
    };
    return NextResponse.json(response, { status: 201 });
  }

  // Get salt rounds from env or use default
  // Note: BCRYPT_ROUNDS is not in our typed env yet, but we can access it or add it
  const saltRounds = DEFAULT_BCRYPT_ROUNDS;

  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword
    }
  });

  const successResponse: ApiResponse = {
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    },
    meta: { timestamp: new Date().toISOString() }
  };

  return NextResponse.json(successResponse, { status: 201 });
});
