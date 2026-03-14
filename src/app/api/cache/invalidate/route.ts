/**
 * POST /api/cache/invalidate
 *
 * Called exclusively by the data-ingestion GitHub Actions workflows
 * (ingest.yml, sync_events.yml) immediately after new conference data
 * has been written to the DB and public/data/conferences.json.
 *
 * What it does:
 *   1. Validates the Bearer token against CACHE_INVALIDATION_SECRET.
 *   2. Deletes the Redis key so the next page request fetches fresh DB data.
 *   3. Immediately re-populates Redis (warm) so that first visitor after a
 *      workflow run gets a cache hit, not a cold DB query.
 *   4. Triggers Next.js ISR revalidation for /[locale] so the static HTML
 *      is also rebuilt with the new data.
 *
 * Security:
 *   - Bearer token uses constant-time comparison (prevents timing attacks).
 *   - Route is excluded from the CSRF middleware (server-to-server call).
 *   - No user data is exposed in the response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { revalidatePath } from 'next/cache';
import { invalidateCache, warmCache } from '@/lib/cache';
import { env } from '@/lib/env';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const secret = env.CACHE_INVALIDATION_SECRET;
  if (!secret) {
    console.error('[cache/invalidate] CACHE_INVALIDATION_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ') || !safeCompare(auth.slice(7), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Flush Redis ────────────────────────────────────────────────────────
  await invalidateCache();

  // ── 3. Warm Redis with fresh DB data ─────────────────────────────────────
  // This runs synchronously so the first visitor after a workflow run gets a
  // cache hit rather than a cold DB query.
  await warmCache();

  // ── 4. Trigger ISR revalidation for the homepage ─────────────────────────
  // Rebuilds the statically generated /en page (and any other locale paths)
  // so the CDN-cached HTML reflects the new data immediately.
  revalidatePath('/[locale]', 'page');

  console.log('[cache/invalidate] Cache flushed, warmed, and ISR triggered');

  return NextResponse.json({
    ok: true,
    revalidated: true,
    timestamp: new Date().toISOString(),
  });
}
