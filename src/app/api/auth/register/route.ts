import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';
import { securityLogger } from '@/lib/logger';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

const DEFAULT_BCRYPT_ROUNDS = 14;

export async function POST(request: Request) {
  try {
    if (!await validateCsrfToken(request)) {
      securityLogger.warn('Invalid CSRF token on registration attempt');
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Use a non-PII identifier for logging (first 4 chars of hash)
      const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 8);
      securityLogger.info('Registration attempt with existing email', { emailId: emailHash });
      return NextResponse.json(
        { error: 'Registration failed. If you already have an account, try signing in.' },
        { status: 400 }
      );
    }

    // Get salt rounds from env or use default
    let saltRounds = parseInt(process.env.BCRYPT_ROUNDS || String(DEFAULT_BCRYPT_ROUNDS), 10);
    if (isNaN(saltRounds) || saltRounds < 12 || saltRounds > 16) {
      saltRounds = DEFAULT_BCRYPT_ROUNDS;
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}