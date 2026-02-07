import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCachedConferences } from '@/lib/cache';
import { Conference, ConferenceData } from '@/types/conference';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/logger';
import { querySchemas } from '@/lib/apiSchemas';
import { z } from 'zod';

/**
 * GET /api/conferences
 * 
 * Returns conference data.
 * - If no filters: Returns cached full dataset (fast).
 * - If filters: Queries database directly (dynamic).
 */
export async function GET(request: Request) {
  apiLogger.info('/api/conferences called');
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters using Zod
    const validated = querySchemas.conferences.parse({
      domain: searchParams.get('domain') || undefined,
      cfpOpen: searchParams.get('cfpOpen') || undefined,
      search: searchParams.get('search') || undefined,
    });
    
    const domain = validated.domain;
    const cfpOnly = validated.cfpOpen === 'true';
    const search = validated.search;

    apiLogger.info('Request params', { domain, cfpOnly, search, hasSession: !!session?.user });

    // Optimization: If no filters AND not logged in, use the Redis/File cache
    // (If logged in, we want to show 'isAttending' status correctly, so we might need a dynamic query or merge)
    if (!session?.user && (!domain || domain === 'all') && !cfpOnly && !search) {
      apiLogger.info('Using cached conferences');
      const data = await Promise.race([
        getCachedConferences(),
        new Promise<ConferenceData>((_, reject) => 
          setTimeout(() => reject(new Error('Cache fetch timeout after 15s')), 15000)
        )
      ]);
      apiLogger.info('Returning cached data', { months: Object.keys(data.months).length });
      return NextResponse.json(data);
    }

    // Dynamic Query via Prisma
    apiLogger.info('Performing dynamic database query');
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

    apiLogger.time('dbQuery');
    const conferences = await Promise.race([
      prisma.conference.findMany({
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
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout after 15s')), 15000)
      )
    ]);
    apiLogger.timeEnd('dbQuery');

    // Format for frontend (Month grouping)
    const months: Record<string, Conference[]> = {};
    const byDomain: Record<string, number> = {};
    let withOpenCFP = 0;
    let withLocation = 0;

    // Transform DB shape to Frontend Interface
    const formattedConferences = conferences.map((c) => ({
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
        status: (c.cfpStatus as 'open' | 'closed' | undefined)
      },
      domain: c.domain,
      description: c.description || undefined,
      source: c.source,
      tags: c.tags,
      financialAid: c.financialAid ? JSON.parse(JSON.stringify(c.financialAid)) : undefined,
      // Attendance data
      attendeeCount: c.attendances.length,
      isAttending: session?.user ? c.attendances.some((a) => a.userId === session.user.id) : false,
      attendees: c.attendances.slice(0, 5).map((a) => ({
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
    if (error instanceof z.ZodError) {
      apiLogger.warn('Invalid query parameters', { issues: error.issues });
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues.map(i => i.message) },
        { status: 400 }
      );
    }
    apiLogger.error('Error fetching conferences', error);
    return NextResponse.json(
      { error: 'Failed to fetch conferences' },
      { status: 500 }
    );
  }
}