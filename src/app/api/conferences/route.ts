import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCachedConferences } from '@/lib/cache';
import type { Conference, ConferenceData } from '@/types/conference';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/logger';
import { querySchemas } from '@/lib/apiSchemas';
import { withErrorHandling } from '@/lib/errorHandler';
import { ApiResponse } from '@/types/api';
import { Prisma } from '@prisma/client';
import { getLocalMonthYear } from '@/lib/date';

/**
 * GET /api/conferences
 * 
 * Returns conference data.
 * Optimized with pagination and streaming for large datasets.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  apiLogger.info('/api/conferences called');
  
  const { searchParams } = request.nextUrl;
  
  const validated = querySchemas.conferences.parse({
    domain: searchParams.get('domain') || undefined,
    cfpOpen: searchParams.get('cfpOpen') || undefined,
    search: searchParams.get('search') || undefined,
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  });
  
  const { domain, search, page, limit } = validated;
  const cfpOnly = validated.cfpOpen === 'true';

  apiLogger.info('Request params', { domain, cfpOnly, search, page, limit });

  // Optimization: If no filters and it's the first page, use the cache
  if ((!domain || domain === 'all') && !cfpOnly && !search && page === 1) {
    apiLogger.info('Using cached conferences (fast path)');
    
    let timeoutId: NodeJS.Timeout | undefined;
    const data = await Promise.race([
      getCachedConferences(),
      new Promise<ConferenceData>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Cache fetch timeout after 15s')), 15000);
      })
    ]);

    if (timeoutId) clearTimeout(timeoutId);
    
    const response: ApiResponse<ConferenceData> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        pagination: {
          total: data.stats.total,
          page: 1,
          limit: data.stats.total,
          totalPages: 1
        }
      }
    };
    
    return NextResponse.json(response);
  }

  const session = await getServerSession(authOptions);
  
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

  apiLogger.time('dbQuery');
  const skip = (page - 1) * limit;
  const userId = session?.user?.id;

  // Attendance: use `_count` for totals (issue #84) and a tiny preview
  // relation (take 5) instead of loading full attendance rows just to count.
  // isAttending is resolved with a single batched query for the page of IDs.
  const [conferences, total] = await Promise.all([
    prisma.conference.findMany({
      where,
      select: {
        id: true,
        name: true,
        url: true,
        startDate: true,
        endDate: true,
        city: true,
        country: true,
        locationRaw: true,
        lat: true,
        lng: true,
        online: true,
        cfpUrl: true,
        cfpEndDate: true,
        cfpStatus: true,
        domain: true,
        description: true,
        source: true,
        tags: true,
        financialAid: true,
        _count: { select: { attendances: true } },
        attendances: {
          select: {
            user: { select: { image: true, name: true } },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { startDate: 'asc' },
      skip,
      take: limit,
    }),
    prisma.conference.count({ where }),
  ]);

  const attendingSet = new Set<string>();
  if (userId && conferences.length > 0) {
    const myAttendance = await prisma.attendance.findMany({
      where: {
        userId,
        conferenceId: { in: conferences.map((c) => c.id) },
      },
      select: { conferenceId: true },
    });
    for (const row of myAttendance) {
      attendingSet.add(row.conferenceId);
    }
  }
  apiLogger.timeEnd('dbQuery');

  const months: Record<string, Conference[]> = {};
  const byDomain: Record<string, number> = {};
  let withOpenCFP = 0;
  let withLocation = 0;

  const formattedConferences = conferences.map((c) => {
    return {
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
        lng: c.lng || undefined,
      },
      online: c.online,
      cfp: {
        url: c.cfpUrl || '',
        endDate: c.cfpEndDate ? c.cfpEndDate.toISOString().split('T')[0] : null,
        status: (c.cfpStatus as 'open' | 'closed' | undefined),
      },
      domain: c.domain,
      description: c.description || undefined,
      source: c.source,
      tags: c.tags,
      // Prisma Json fields are already plain JS values.
      financialAid: (c.financialAid ?? undefined) as Conference['financialAid'],
      attendeeCount: c._count.attendances,
      isAttending: userId ? attendingSet.has(c.id) : false,
      attendees: c.attendances.map((a) => ({
        image: a.user.image,
        name: a.user.name,
      })),
    };
  });

  for (const conf of formattedConferences) {
    byDomain[conf.domain] = (byDomain[conf.domain] || 0) + 1;
    if (conf.cfp?.status === 'open') withOpenCFP++;
    if (conf.location.lat) withLocation++;

    const monthKey = conf.startDate ? getLocalMonthYear(conf.startDate) : 'TBD';

    if (!months[monthKey]) months[monthKey] = [];
    months[monthKey].push(conf);
  }

  const result: ApiResponse = {
    success: true,
    data: {
      lastUpdated: new Date().toISOString(),
      stats: {
        total: formattedConferences.length,
        withOpenCFP,
        withLocation,
        byDomain,
      },
      months,
    },
    meta: {
      timestamp: new Date().toISOString(),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  };

  return NextResponse.json(result);
});
