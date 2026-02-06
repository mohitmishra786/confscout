/**
 * Enhanced cron endpoint for sending conference digests
 * Supports daily and weekly frequencies with dynamic email formatting
 */

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendDigestEmail } from '@/lib/email';
import { promises as fs } from 'fs';
import path from 'path';
import { Conference } from '@/types/conference';
import { invalidateCache } from '@/lib/cache';

/**
 * Filter conferences based on user preferences
 * @param conferences - All available conferences
 * @param preferences - User preferences object
 * @returns Filtered conferences
 */
function filterConferencesForUser(
  conferences: Conference[],
  preferences: Record<string, unknown>
): Conference[] {
  const domain = preferences?.domain as string | undefined;

  if (!domain || domain === 'all') {
    return conferences;
  }

  return conferences.filter(c => c.domain === domain);
}

/**
 * Get user location from preferences
 * @param preferences - User preferences object
 * @returns Location string or undefined
 */
function getUserLocation(preferences: Record<string, unknown>): string | undefined {
  const location = preferences?.location as string | undefined;
  const country = preferences?.country as string | undefined;

  if (location && country) {
    return `${location}, ${country}`;
  }

  return location || country;
}

/**
 * GET handler for cron digest endpoint
 * Supports query parameter: ?frequency=daily|weekly
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const triggerFrequency = (searchParams.get('frequency') || 'weekly') as 'daily' | 'weekly';

  // Validate frequency parameter
  if (!['daily', 'weekly'].includes(triggerFrequency)) {
    return NextResponse.json(
      { error: 'Invalid frequency. Must be "daily" or "weekly"' },
      { status: 400 }
    );
  }

  try {
    // Load conference data
    const dataPath = path.join(process.cwd(), 'public/data/conferences.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(fileContents);
    // Fix: Flatten months to get all conferences
    const conferences: Conference[] = data.months ? Object.values(data.months).flat() as Conference[] : (data.conferences || []);

    // Filter conferences based on frequency
    const now = new Date();
    let upcomingConfs: Conference[];

    if (triggerFrequency === 'daily') {
      // For daily: Next 7 days for conferences, next 3 days for CFPs
      const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      upcomingConfs = conferences.filter((c) => {
        const start = c.startDate ? new Date(c.startDate) : null;
        const cfpEnd = c.cfp?.endDate ? new Date(c.cfp.endDate) : null;

        return (start && start >= now && start <= oneWeek) ||
               (cfpEnd && cfpEnd >= now && cfpEnd <= threeDays);
      });
    } else {
      // For weekly: Next 14 days for conferences, next 7 days for CFPs
      const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      upcomingConfs = conferences.filter((c) => {
        const start = c.startDate ? new Date(c.startDate) : null;
        const cfpEnd = c.cfp?.endDate ? new Date(c.cfp.endDate) : null;

        return (start && start >= now && start <= twoWeeks) ||
               (cfpEnd && cfpEnd >= now && cfpEnd <= oneWeek);
      });
    }

    if (upcomingConfs.length === 0) {
      return NextResponse.json({
        frequency: triggerFrequency,
        message: 'No upcoming conferences to send.',
        conferencesChecked: conferences.length,
      });
    }

    // Get verified subscribers matching the frequency
    const client = await pool.connect();

    try {
      const res = await client.query(
        `SELECT email, verification_token, preferences 
         FROM subscribers 
         WHERE verified = TRUE 
         AND (frequency = $1 OR frequency IS NULL)`,
        [triggerFrequency]
      );

      const subscribers = res.rows;

      console.log(`[${triggerFrequency.toUpperCase()}] Processing digest for ${subscribers.length} subscribers.`);

      // Invalidate cache to ensure fresh data
      await invalidateCache();

      // Send emails with per-user filtering
      let sentCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      const emailPromises = subscribers.map(async (sub) => {
        // Filter conferences based on user's domain preference
        const userConfs = filterConferencesForUser(upcomingConfs, sub.preferences || {});

        if (userConfs.length === 0) {
          console.log(`Skipping ${sub.email}: no matching conferences for their preferences`);
          skippedCount++;
          return { status: 'skipped', email: sub.email };
        }

        // Get user location for prioritization
        const userLocation = getUserLocation(sub.preferences || {});

        try {
          await sendDigestEmail(
            sub.email,
            sub.verification_token,
            userConfs,
            triggerFrequency,
            userLocation,
            true // Use Groq AI for enhanced content
          );
          sentCount++;
          return { status: 'sent', email: sub.email, conferences: userConfs.length };
        } catch (error) {
          console.error(`Failed to send digest to ${sub.email}:`, error);
          failedCount++;
          return { status: 'failed', email: sub.email, error: String(error) };
        }
      });

      await Promise.allSettled(emailPromises);

      console.log(`[${triggerFrequency.toUpperCase()}] Digest complete: ${sentCount} sent, ${skippedCount} skipped, ${failedCount} failed`);

      return NextResponse.json({
        frequency: triggerFrequency,
        totalSubscribers: subscribers.length,
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
        upcomingConferences: upcomingConfs.length,
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Digest Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        frequency: triggerFrequency,
      },
      { status: 500 }
    );
  }
}
