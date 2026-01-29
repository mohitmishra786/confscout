import { NextResponse } from 'next/server';
import { getCachedConferences } from '@/lib/cache';
import { Conference } from '@/types/conference';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * GET /api/conferences
 * 
 * Returns conference data.
 * - If no filters: Returns cached full dataset (fast).
 * - If filters: Queries database directly (dynamic).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const cfpOnly = searchParams.get('cfpOpen') === 'true';
    const search = searchParams.get('search');

    // Optimization: If no filters, use the Redis/File cache (pre-formatted)
    if ((!domain || domain === 'all') && !cfpOnly && !search) {
      const data = await getCachedConferences();
      return NextResponse.json(data);
    }

    // Dynamic Query via Prisma
    const where: Prisma.ConferenceWhereInput = {
      ...(domain && domain !== 'all' ? { domain } : {}),
      ...(cfpOnly ? { cfpStatus: 'open' } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { locationRaw: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search.toLowerCase() } }
        ]
      } : {})
    };

    const conferences = await prisma.conference.findMany({
      where,
      orderBy: { startDate: 'asc' }
    });

    // Format for frontend (Month grouping)
    // We reuse the logic from cache.ts conceptually, but inline here for simplicity
    // or we could export the helper from cache.ts.
    // Let's re-implement strictly what's needed.
    
    const months: Record<string, Conference[]> = {};
    const byDomain: Record<string, number> = {};
    let withOpenCFP = 0;
    let withLocation = 0;

    // Transform DB shape to Frontend Interface
    const formattedConferences: Conference[] = conferences.map(c => ({
      id: c.id,
      name: c.name,
      url: c.url,
      startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : null,
      endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : null,
      location: {
        city: c.city || '',
        country: c.country || '',
        raw: c.locationRaw || '',
        lat: c.lat || undefined,
        lng: c.lng || undefined
      },
      online: c.online,
      cfp: {
        url: c.cfpUrl || '',
        endDate: c.cfpEndDate ? c.cfpEndDate.toISOString().split('T')[0] : null,
        status: c.cfpStatus as 'open' | 'closed' | undefined
      },
      domain: c.domain,
      description: c.description || undefined,
      source: c.source,
      tags: c.tags,
      financialAid: c.financialAid ? JSON.parse(JSON.stringify(c.financialAid)) : undefined
    }));

    for (const conf of formattedConferences) {
      byDomain[conf.domain] = (byDomain[conf.domain] || 0) + 1;
      if (conf.cfp?.status === 'open') withOpenCFP++;
      if (conf.location.lat) withLocation++;

      const monthKey = conf.startDate
        ? new Date(conf.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'TBD';
      
      if (!months[monthKey]) months[monthKey] = [];
      months[monthKey].push(conf);
    }

    return NextResponse.json({
      lastUpdated: new Date().toISOString(),
      stats: {
        total: formattedConferences.length,
        withOpenCFP,
        withLocation,
        byDomain,
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