import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendUnsubscribeEmail } from '@/lib/email';
import { querySchemas } from '@/lib/apiSchemas';
import { z } from 'zod';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawToken = searchParams.get('token');

        if (!rawToken) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        // Validate token format using Zod
        const { token } = querySchemas.unsubscribe.parse({ token: rawToken });

        const client = await pool.connect();
        try {
            // Find and delete the subscriber
            const result = await client.query(
                'DELETE FROM subscribers WHERE verification_token = $1 RETURNING email',
                [token]
            );

            if (result.rowCount === 0) {
                return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
            }

            const email = result.rows[0].email;

            // Send confirmation email
            await sendUnsubscribeEmail(email, token);

            // Redirect to success page
            return NextResponse.redirect(new URL('/unsubscribe/success', request.url));
        } finally {
            client.release();
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid token format' },
                { status: 400 }
            );
        }
        console.error('Unsubscribe Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
