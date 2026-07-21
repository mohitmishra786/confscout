import { NextResponse } from 'next/server';
import type { ConferenceData } from '@/types/conference';
import { apiLogger } from '@/lib/logger';
import { readStaticConferences } from '@/lib/staticConferences';

/**
 * GET /api/conferences/static
 * 
 * Returns conference data from static file without database queries.
 * Used as a fast fallback when database is unavailable.
 */
export async function GET() {
  try {
    apiLogger.info('Static API: Fetching from file');
    // TTL-cached at module level — no sync readFileSync blocking the event
    // loop, and no re-parse of the ~2 MB JSON on every request.
    const jsonData = await readStaticConferences();

    apiLogger.info('Static API: Returning data', { 
      months: jsonData.months ? Object.keys(jsonData.months).length : 0 
    });
    return NextResponse.json(jsonData);
  } catch (error) {
    apiLogger.error('Static API: Error loading file', error);
    
    // Return empty data structure as fallback
    const emptyData: ConferenceData = {
      lastUpdated: new Date().toISOString(),
      stats: {
        total: 0,
        withOpenCFP: 0,
        withLocation: 0,
        byDomain: {}
      },
      months: {}
    };
    
    return NextResponse.json(emptyData);
  }
}
