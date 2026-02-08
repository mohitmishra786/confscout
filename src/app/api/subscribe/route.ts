import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';
import { validateCsrfToken } from '@/lib/csrf';
import { withErrorHandling, Errors } from '@/lib/errorHandler';
import { bodySchemas } from '@/lib/apiSchemas';
import { ApiResponse } from '@/types/api';

export const POST = withErrorHandling(async (request: NextRequest) => {
  if (!await validateCsrfToken(request)) {
    throw Errors.forbidden('Invalid CSRF token');
  }

  const body = await request.json();
  const { email, preferences, frequency } = bodySchemas.subscribe.parse(body);
  
  const client = await pool.connect();
  try {
    const token = crypto.randomBytes(32).toString('hex');
    
    const result = await client.query(
      `INSERT INTO subscribers (email, preferences, frequency, verification_token)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE 
        SET preferences = $2, frequency = $3, verification_token = $4
        RETURNING (xmax = 0) AS is_new`,
      [email, JSON.stringify(preferences), frequency, token]
    );

    // Only send welcome email for new subscribers
    if (result.rows[0]?.is_new) {
      await sendWelcomeEmail(email, token);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Subscribed successfully!',
      meta: { timestamp: new Date().toISOString() }
    };

    return NextResponse.json(response, { status: 200 });
  } finally {
    client.release();
  }
});
