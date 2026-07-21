import { NextRequest, NextResponse } from 'next/server';
import { getCachedConferences } from '@/lib/cache';
import { withErrorHandling } from '@/lib/errorHandler';
import { querySchemas } from '@/lib/apiSchemas';
import type { Conference } from '@/types/conference';
import type { ApiResponse } from '@/types/api';

/**
 * GET /api/search/suggest?q=...
 * Lightweight autocomplete suggestions for the search UI (issue #75).
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { q } = querySchemas.searchSuggest.parse({
    q: request.nextUrl.searchParams.get('q') ?? undefined,
  });

  const data = await getCachedConferences();
  const all = Object.values(data.months).flat() as Conference[];

  const nameHits: string[] = [];
  const domains = new Set<string>();
  const tags = new Set<string>();

  for (const c of all) {
    if (nameHits.length < 8 && c.name.toLowerCase().includes(q)) {
      nameHits.push(c.name);
    }
    if (c.domain?.toLowerCase().includes(q)) {
      domains.add(c.domain);
    }
    for (const t of c.tags || []) {
      if (t.toLowerCase().includes(q)) tags.add(t);
    }
    if (nameHits.length >= 8 && domains.size >= 5 && tags.size >= 8) break;
  }

  const response: ApiResponse = {
    success: true,
    data: {
      conferences: nameHits.slice(0, 8),
      domains: [...domains].slice(0, 5),
      tags: [...tags].slice(0, 8),
    },
    meta: { timestamp: new Date().toISOString() },
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
});
