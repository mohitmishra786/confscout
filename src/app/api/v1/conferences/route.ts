import { NextResponse } from 'next/server';
import { getCachedConferences } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const cfpOnly = searchParams.get('cfp_open') === 'true';
    const format = searchParams.get('format') || 'json';

    const data = await getCachedConferences();

    let conferences = [];
    for (const monthConfs of Object.values(data.months)) {
      conferences.push(...monthConfs);
    }

    if (domain && domain !== 'all') {
      conferences = conferences.filter(c => c.domain === domain);
    }

    if (cfpOnly) {
      conferences = conferences.filter(c => c.cfp?.status === 'open');
    }

    if (format === 'csv') {
      const csv = [
        'Name,URL,Start Date,End Date,Domain,Location,CFP URL,CFP End Date',
        ...conferences.map(c => 
          `"${c.name}","${c.url}","${c.startDate || ''}","${c.endDate || ''}","${c.domain}","${c.location?.raw || ''}","${c.cfp?.url || ''}","${c.cfp?.endDate || ''}"`
        )
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="conferences.csv"'
        }
      });
    }

    return NextResponse.json({
      meta: {
        total: conferences.length,
        lastUpdated: data.lastUpdated,
        apiVersion: 'v1'
      },
      data: conferences
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'API Error', message: error.message },
      { status: 500 }
    );
  }
}