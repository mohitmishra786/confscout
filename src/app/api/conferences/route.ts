import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCachedConferences } from '@/lib/cache';
import { Conference } from '@/types/conference';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/conferences
 * 
 * Returns conference data.
 * - If no filters: Returns cached full dataset (fast).
 * - If filters: Queries database directly (dynamic).
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const cfpOnly = searchParams.get('cfpOpen') === 'true';
    const search = searchParams.get('search');

    // Optimization: If no filters AND not logged in, use the Redis/File cache
    // (If logged in, we want to show 'isAttending' status correctly, so we might need a dynamic query or merge)
    if (!session?.user && (!domain || domain === 'all') && !cfpOnly && !search) {
      const data = await getCachedConferences();
      return NextResponse.json(data);
    }

    // Dynamic Query via Prisma
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conferences = await (prisma as any).conference.findMany({
      where,
      include: {
        attendances: {
          select: {
            userId: true,
            user: {
              select: {
                image: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    // Format for frontend (Month grouping)
    const months: Record<string, Conference[]> = {};
    const byDomain: Record<string, number> = {};
    let withOpenCFP = 0;
    let withLocation = 0;

    // Transform DB shape to Frontend Interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedConferences: any[] = conferences.map((c: any) => ({
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
      financialAid: c.financialAid ? JSON.parse(JSON.stringify(c.financialAid)) : undefined,
      // Attendance data
      attendeeCount: c.attendances.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      isAttending: session?.user ? c.attendances.some((a: any) => a.userId === session.user.id) : false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attendees: c.attendances.slice(0, 5).map((a: any) => ({
        image: a.user.image,
        name: a.user.name
      }))
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