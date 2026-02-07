/**
 * Enhanced cron endpoint for sending conference digests
 * Supports daily and weekly frequencies with dynamic email formatting
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { sendDigestEmail } from '@/lib/email';
import { Conference } from '@/types/conference';
import { invalidateCache } from '@/lib/cache';
import { readFileSync } from 'fs';
import { join } from 'path';
import { timingSafeEqual } from 'crypto';

/**
 * Perform constant-time comparison to prevent timing attacks
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal, false otherwise
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Interface for subscriber preferences
 */
interface SubscriberPreferences {
  domain?: string;
  location?: string;
  country?: string;
}

/**
 * Mask email address for logging
 * @param email - Raw email address
 * @returns Masked email (e.g., t***t@example.com)
 */
function maskEmail(email: string): string {
  return email.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.min(b.length, 3))}${c}`);
}

/**
 * Filter conferences based on user preferences
 * @param conferences - All available conferences
 * @param preferences - User preferences object
 * @returns Filtered conferences
 */
function filterConferencesForUser(
  conferences: Conference[],
  preferences: SubscriberPreferences
): Conference[] {
  const domain = preferences?.domain;

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
function getUserLocation(preferences: SubscriberPreferences): string | undefined {
  const location = preferences?.location;
  const country = preferences?.country;

  if (location && country) {
    return `${location}, ${country}`;
  }

  return location || country;
}

// Zod schema for frequency validation
const frequencySchema = z.enum(['daily', 'weekly']);

/**
 * GET handler for cron digest endpoint
 * Supports query parameter: ?frequency=daily|weekly
 * Requires CRON_SECRET authorization header
 */
export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;
  
  if (!expectedToken) {
    console.error('CRON_SECRET is not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ') || !safeCompare(authHeader.slice(7), expectedToken)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Validate frequency parameter using Zod
  const { searchParams } = new URL(request.url);
  const rawFrequency = searchParams.get('frequency') || 'weekly';
  
  const parseResult = frequencySchema.safeParse(rawFrequency);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid frequency. Must be "daily" or "weekly"' },
      { status: 400 }
    );
  }
  
  const triggerFrequency = parseResult.data;

  try {
    // Load conference data using fs (works in serverless)
    const dataPath = join(process.cwd(), 'public', 'data', 'conferences.json');
    const fileContents = readFileSync(dataPath, 'utf8');
    const data = JSON.parse(fileContents) as { months?: Record<string, Conference[]>; conferences?: Conference[] };
    const conferences: Conference[] = data.months 
      ? Object.values(data.months).flat() as Conference[] 
      : (data.conferences || []);

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
          const maskedEmail = maskEmail(sub.email);
          console.log(`Skipping ${maskedEmail}: no matching conferences for their preferences`);
          skippedCount++;
          return { status: 'skipped', maskedEmail };
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
          return { status: 'sent', maskedEmail: maskEmail(sub.email), conferences: userConfs.length };
        } catch (error) {
          const maskedEmail = maskEmail(sub.email);
          console.error(`Failed to send digest to ${maskedEmail}:`, error);
          failedCount++;
          return { status: 'failed', maskedEmail, error: String(error) };
        }
      });

      // Use a timeout for the entire email processing batch to prevent function hang
      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error('Email batch processing timeout after 55s')), 55000);
        // Ensure timer is cleared if allSettled wins
        Promise.allSettled(emailPromises).finally(() => clearTimeout(timer));
      });

      await Promise.race([
        Promise.allSettled(emailPromises),
        timeoutPromise
      ]);

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
    // SECURITY: Only return generic error message, log details internally
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        frequency: triggerFrequency,
      },
      { status: 500 }
    );
  }
}
