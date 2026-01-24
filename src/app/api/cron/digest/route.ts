import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendDigestEmail } from '@/lib/email';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
    // Parse frequency from query param (default to 'weekly' if not specified)
    const { searchParams } = new URL(request.url);
    const triggerFrequency = searchParams.get('frequency') || 'weekly';

    // Verify Cron secret if needed (Vercel protects this automatically if configured properly)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    try {
        // Load conference data
        const dataPath = path.join(process.cwd(), 'public/data/conferences.json');
        const fileContents = await fs.readFile(dataPath, 'utf8');
        const data = JSON.parse(fileContents);
        const conferences = data.conferences || [];

        // Filter "New" conferences (simulated: start date in next 14 days OR CFP closing in next 7 days)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const upcomingConfs = conferences.filter((c: any) => {
            const start = new Date(c.startDate);
            const now = new Date();
            const twoWeeks = new Date();
            twoWeeks.setDate(now.getDate() + 14);

            const cfpEnd = c.cfp?.endDate ? new Date(c.cfp.endDate) : null;
            const oneWeek = new Date();
            oneWeek.setDate(now.getDate() + 7);

            return (start >= now && start <= twoWeeks) || (cfpEnd && cfpEnd >= now && cfpEnd <= oneWeek);
        });

        if (upcomingConfs.length === 0) {
            return NextResponse.json({ message: 'No upcoming conferences to send.' });
        }

        // Get verified subscribers matching the frequency
        const client = await pool.connect();
        try {
            const query = `
            SELECT email FROM subscribers 
            WHERE verified = TRUE 
            AND (frequency = $1 OR frequency IS NULL)
        `;
            // Note: handling 'OR frequency IS NULL' to support legacy users as weekly if needed, or strictly $1.
            // Let's rely on default 'weekly' being set in DB, so strictly check frequency.
            // Actually, let's allow 'weekly' job to pick up those without specific frequency if we want default.
            // But for now, strict match is safer.
            const res = await client.query('SELECT email FROM subscribers WHERE verified = TRUE AND frequency = $1', [triggerFrequency]);
            const subscribers = res.rows;

            console.log(`Sending ${triggerFrequency} digest to ${subscribers.length} subscribers.`);

            // Send emails
            // Ideally use a queue (e.g. Inngest/BullMQ) for large lists. For now, sequential/parallel awaits.
            const emailPromises = subscribers.map(sub => sendDigestEmail(sub.email, upcomingConfs));
            await Promise.allSettled(emailPromises);

            return NextResponse.json({ count: subscribers.length, frequency: triggerFrequency });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Digest Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
