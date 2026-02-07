import { NextResponse } from 'next/server';
import { getCachedConferences } from '@/lib/cache';
import { generateICalDownload } from '@/lib/ical';
import { querySchemas } from '@/lib/apiSchemas';
import { z } from 'zod';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawIds = searchParams.get('ids');
    
    // Validate query parameters using Zod
    const validated = querySchemas.calendar.parse({ ids: rawIds || undefined });
    
    const data = await getCachedConferences();
    let conferences = [];
    
    for (const monthConfs of Object.values(data.months)) {
      conferences.push(...monthConfs);
    }

    if (validated.ids) {
      const ids = validated.ids.split(',');
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid conference IDs format' },
        { status: 400 }
      );
    }
    console.error('Calendar generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar' },
      { status: 500 }
    );
  }
}