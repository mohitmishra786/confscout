import { NextResponse } from 'next/server';
import { getCachedConferences } from '@/lib/cache';
import { generateICalDownload } from '@/lib/ical';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conferenceIds = searchParams.get('ids');
    
    const data = await getCachedConferences();
    let conferences = [];
    
    for (const monthConfs of Object.values(data.months)) {
      conferences.push(...monthConfs);
    }

    if (conferenceIds) {
      const ids = conferenceIds.split(',');
      conferences = conferences.filter(c => ids.includes(c.id));
    }

    const icalData = generateICalDownload(conferences);

    return new NextResponse(icalData, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="conferences.ics"',
      },
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate calendar' },
      { status: 500 }
    );
  }
}