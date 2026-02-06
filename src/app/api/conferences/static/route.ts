import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ConferenceData } from '@/types/conference';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/conferences/static
 * 
 * Returns conference data from static file without database queries.
 * Used as a fast fallback when database is unavailable.
 */
export async function GET() {
  try {
    apiLogger.info('Static API: Fetching from file');
    const filePath = join(process.cwd(), 'public/data/conferences.json');
    const fileData = readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileData);
    
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
