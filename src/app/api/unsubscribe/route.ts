import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendUnsubscribeEmail } from '@/lib/email';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    try {
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
            await sendUnsubscribeEmail(email);

            // Redirect to success page
            return NextResponse.redirect(new URL('/unsubscribe/success', request.url));
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Unsubscribe Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
