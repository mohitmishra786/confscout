import { NextResponse } from 'next/server';
import { getCachedConferences } from '@/lib/cache';
import { querySchemas } from '@/lib/apiSchemas';
import { z } from 'zod';

function escapeCsvCell(value: string | null | undefined): string {
  if (!value) return '""';
  
  // Convert to string and handle null/undefined
  const stringValue = String(value);
  
  // Check if the value starts with dangerous characters that could trigger formulas
  if (/^[=+\-@]/.test(stringValue)) {
    return `'${stringValue}`; // Prefix with single quote to neutralize formulas
  }
  
  // Escape double quotes by doubling them and wrap in quotes
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters using Zod
    const validated = querySchemas.v1Conferences.parse({
      domain: searchParams.get('domain') || undefined,
      cfp_open: searchParams.get('cfp_open') || undefined,
      format: searchParams.get('format') || 'json',
    });
    
    const domain = validated.domain;
    const cfpOnly = validated.cfp_open === 'true';
    const format = validated.format;

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
        ...conferences.map(c => [
          escapeCsvCell(c.name),
          escapeCsvCell(c.url),
          escapeCsvCell(c.startDate || ''),
          escapeCsvCell(c.endDate || ''),
          escapeCsvCell(c.domain),
          escapeCsvCell(c.location?.raw || ''),
          escapeCsvCell(c.cfp?.url || ''),
          escapeCsvCell(c.cfp?.endDate || '')
        ].join(','))
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues.map(i => i.message) },
        { status: 400 }
      );
    }
    console.error('V1 API error:', error);
    return NextResponse.json(
      { error: 'API Error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}