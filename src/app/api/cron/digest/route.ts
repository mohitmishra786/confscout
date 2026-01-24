import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendDigestEmail } from '@/lib/email';
import { promises as fs } from 'fs';
import path from 'path';

// Helper to check if a date is within last 7 days (Unused but kept for reference if needed)
// function _isRecent(dateStr: string) {
//     const date = new Date(dateStr);
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//     return date >= sevenDaysAgo;
// }

export async function GET() {
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
        const conferences = data.conferences || []; // Flat list of upcoming

        // Filter "New" conferences (simulated by checking if added/updated recently or starting soon)
        // Since we don't track "addedAt" in the JSON efficiently, let's just pick upcoming ones starting in next 30 days that have OPEN CFPs or high relevance.
        // Ideally, we should diff against previous data, but for now we send "Upcoming Highlights"

        // Better logic: Filter confs with start date in next 14 days OR CFP closing in next 7 days
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const upcomingConfs = conferences.filter((c: any) => {
            const start = new Date(c.startDate);
            const now = new Date();
            const twoWeeks = new Date();
            twoWeeks.setDate(now.getDate() + 14);
            return start >= now && start <= twoWeeks;
        });

        if (upcomingConfs.length === 0) {
            return NextResponse.json({ message: 'No updates to send' });
        }

        const client = await pool.connect();
        try {
            // Get verified subscribers
            const result = await client.query('SELECT email FROM subscribers WHERE verified = TRUE');
            const subscribers = result.rows;

            console.log(`Sending digest to ${subscribers.length} subscribers`);

            for (const sub of subscribers) {
                await sendDigestEmail(sub.email, upcomingConfs);
            }

            return NextResponse.json({ count: subscribers.length });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Cron Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
