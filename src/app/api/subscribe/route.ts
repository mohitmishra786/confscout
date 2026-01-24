import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';
import { z } from 'zod';

const subscribeSchema = z.object({
    email: z.string().email(),
    preferences: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, preferences } = subscribeSchema.parse(body);
        const token = crypto.randomBytes(32).toString('hex');

        // Check if email exists
        const client = await pool.connect();
        try {
            // Upsert user
            const query = `
        INSERT INTO subscribers (email, preferences, verification_token, verified)
        VALUES ($1, $2, $3, FALSE)
        ON CONFLICT (email) 
        DO UPDATE SET verification_token = $3, preferences = $2, updated_at = CURRENT_TIMESTAMP
        RETURNING id, verified;
      `;
            const result = await client.query(query, [email, preferences || {}, token]);

            const user = result.rows[0];
            if (user.verified) {
                return NextResponse.json({ message: 'Already subscribed' }, { status: 200 });
            }

            // Send verification email
            await sendVerificationEmail(email, token);

            return NextResponse.json({ message: 'Verification email sent' }, { status: 200 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Subscribe Error:', error);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
