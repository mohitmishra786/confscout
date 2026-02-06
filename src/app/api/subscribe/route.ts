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
        
        const client = await pool.connect();
        try {
            const token = crypto.randomBytes(32).toString('hex');
            
            await client.query(
                `INSERT INTO subscribers (email, preferences, frequency, verification_token)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email) DO UPDATE 
                 SET preferences = $2, frequency = $3, verification_token = $4`,
                [email, JSON.stringify(preferences), frequency, token]
            );

            await sendWelcomeEmail(email, token);

            return NextResponse.json({ message: 'Subscribed successfully!' }, { status: 200 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Subscribe Error:', error);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
