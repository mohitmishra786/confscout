import { NextResponse } from 'next/server';
import { getCachedConferences } from '@/lib/cache';
import { Conference } from '@/types/conference';

/**
 * GET /api/conferences
 * 
 * Returns conference data in the new month-grouped format with caching.
 * Query params:
 * - domain: Filter by domain (ai, web, software, etc.)
 * - cfpOpen: Only show conferences with open CFPs
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const cfpOnly = searchParams.get('cfpOpen') === 'true';

    // Get data from cache
    const data = await getCachedConferences();

    // Flatten months into a single array for filtering
    let conferences: Conference[] = [];
    for (const monthConfs of Object.values(data.months)) {
      conferences.push(...monthConfs);
    }

    // Filter by domain
    if (domain && domain !== 'all') {
      conferences = conferences.filter(c => c.domain === domain);
    }

    // Filter by CFP status
    if (cfpOnly) {
      conferences = conferences.filter(c => c.cfp?.status === 'open');
    }

    // Re-group by month
    const months: Record<string, Conference[]> = {};
    for (const conf of conferences) {
      const monthKey = conf.startDate
        ? new Date(conf.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'TBD';
      if (!months[monthKey]) months[monthKey] = [];
      months[monthKey].push(conf);
    }

    return NextResponse.json({
      lastUpdated: data.lastUpdated,
      stats: {
        total: conferences.length,
        withOpenCFP: conferences.filter(c => c.cfp?.status === 'open').length,
        withLocation: conferences.filter(c => c.location?.lat).length,
        byDomain: data.stats.byDomain,
      },
      months,
    });
  } catch (error) {
    console.error('Error fetching conferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conferences' },
      { status: 500 }
    );
  }
}