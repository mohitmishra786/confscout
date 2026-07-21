import { NextRequest, NextResponse } from 'next/server';
import { getCachedConferences } from '@/lib/cache';
import { withErrorHandling, Errors } from '@/lib/errorHandler';
import { querySchemas } from '@/lib/apiSchemas';
import type { Conference } from '@/types/conference';
import type { ApiResponse } from '@/types/api';

/**
 * GET /api/conferences/related?id=...&limit=6
 * Related conferences by shared domain/tags (issue #70) — no vector DB required.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { id, limit } = querySchemas.relatedConferences.parse({
    id: request.nextUrl.searchParams.get('id') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
  });

  const data = await getCachedConferences();
  const all = Object.values(data.months).flat() as Conference[];
  const source = all.find((c) => c.id === id);
  if (!source) {
    throw Errors.notFound('Conference not found');
  }

  const sourceTags = new Set((source.tags || []).map((t) => t.toLowerCase()));

  const scored = all
    .filter((c) => c.id !== source.id)
    .map((c) => {
      let score = 0;
      if (c.domain && c.domain === source.domain) score += 3;
      for (const t of c.tags || []) {
        if (sourceTags.has(t.toLowerCase())) score += 1;
      }
      if (c.cfp?.status === 'open') score += 1;
      // Prefer upcoming
      if (c.startDate && source.startDate && c.startDate >= source.startDate.slice(0, 7)) {
        score += 0.5;
      }
      return { conf: c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.conf);

  const response: ApiResponse = {
    success: true,
    data: scored,
    meta: { timestamp: new Date().toISOString() },
  };
  return NextResponse.json(response);
});
