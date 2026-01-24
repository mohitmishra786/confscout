import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    try {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `UPDATE subscribers 
         SET verified = TRUE, verification_token = NULL, updated_at = CURRENT_TIMESTAMP 
         WHERE verification_token = $1 
         RETURNING email`,
                [token]
            );

            if (result.rowCount === 0) {
                return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
            }

            // Redirect to success page or show message
            return NextResponse.redirect(new URL('/?verified=true', request.url));
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Verify Error:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
