import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendDigestEmail } from '@/lib/email';
import { promises as fs } from 'fs';
import path from 'path';
import { Conference } from '@/types/conference';

// Filter conferences based on user preferences
function filterConferencesForUser(conferences: Conference[], preferences: Record<string, unknown>): Conference[] {
    const domain = preferences?.domain as string | undefined;
    // If no domain preference or 'all', return all conferences
    if (!domain || domain === 'all') {
        return conferences;
    }
    return conferences.filter(c => c.domain === domain);
}

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
        const conferences: Conference[] = data.conferences || [];

        // Filter "New" conferences (simulated: start date in next 14 days OR CFP closing in next 7 days)
        const upcomingConfs = conferences.filter((c) => {
            const start = c.startDate ? new Date(c.startDate) : null;
            const now = new Date();
            const twoWeeks = new Date();
            twoWeeks.setDate(now.getDate() + 14);

            const cfpEnd = c.cfp?.endDate ? new Date(c.cfp.endDate) : null;
            const oneWeek = new Date();
            oneWeek.setDate(now.getDate() + 7);

            return (start && start >= now && start <= twoWeeks) || (cfpEnd && cfpEnd >= now && cfpEnd <= oneWeek);
        });

        if (upcomingConfs.length === 0) {
            return NextResponse.json({ message: 'No upcoming conferences to send.' });
        }

        // Get verified subscribers matching the frequency, including their preferences
        const client = await pool.connect();
        try {
            const res = await client.query(
                `SELECT email, verification_token, preferences FROM subscribers 
                 WHERE verified = TRUE 
                 AND (frequency = $1 OR frequency IS NULL)`,
                [triggerFrequency]
            );
            const subscribers = res.rows;

            console.log(`Processing ${triggerFrequency} digest for ${subscribers.length} subscribers.`);

            // Send emails with per-user filtering
            let sentCount = 0;
            let skippedCount = 0;

            const emailPromises = subscribers.map(async sub => {
                // Filter conferences based on user's domain preference
                const userConfs = filterConferencesForUser(upcomingConfs, sub.preferences || {});

                if (userConfs.length === 0) {
                    console.log(`Skipping ${sub.email}: no matching conferences for their preferences`);
                    skippedCount++;
                    return { status: 'skipped', email: sub.email };
                }

                try {
                    await sendDigestEmail(sub.email, sub.verification_token, userConfs);
                    sentCount++;
                    return { status: 'sent', email: sub.email };
                } catch (error) {
                    console.error(`Failed to send digest to ${sub.email}:`, error);
                    return { status: 'failed', email: sub.email, error };
                }
            });

            await Promise.allSettled(emailPromises);

            console.log(`Digest complete: ${sentCount} sent, ${skippedCount} skipped`);

            return NextResponse.json({
                frequency: triggerFrequency,
                totalSubscribers: subscribers.length,
                sent: sentCount,
                skipped: skippedCount,
                upcomingConferences: upcomingConfs.length
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Digest Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

