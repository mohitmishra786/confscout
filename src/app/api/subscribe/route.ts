import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';

const subscribeSchema = z.object({
    email: z.string().email(),
    preferences: z.record(z.string(), z.any()).optional(),
    frequency: z.enum(['daily', 'weekly']).default('weekly'),
});

export async function POST(request: Request) {
    try {
        if (!await validateCsrfToken(request)) {
            return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
        }

        const body = await request.json();
        const { email, preferences, frequency } = subscribeSchema.parse(body);
        const token = crypto.randomBytes(32).toString('hex');

        // Check if email exists
        const client = await pool.connect();
        try {
            // Upsert user - Verified by default
            const query = `
        INSERT INTO subscribers (email, preferences, frequency, verification_token, verified)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (email) 
        DO UPDATE SET verification_token = $4, preferences = $2, frequency = $3, verified = TRUE, updated_at = CURRENT_TIMESTAMP
        RETURNING id, verified;
      `;
            await client.query(query, [email, preferences || {}, frequency, token]);

            // Send Confirmation/Welcome email
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const domain = (preferences as any)?.domain || 'all';
            await sendWelcomeEmail(email, token, frequency, domain);

            return NextResponse.json({ message: 'Subscribed successfully!' }, { status: 200 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Subscribe Error:', error);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
