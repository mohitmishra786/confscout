/**
 * ConfScout Homepage - SERVER COMPONENT
 *
 * Statically generated at build time for each locale, then revalidated
 * via ISR every hour so content stays fresh without per-request DB hits.
 */

import { getCachedConferences } from '@/lib/cache';
import HomeClient from './page.client';
import { JSX } from 'react';

// ISR: rebuild this page at most once per hour on demand.
// Remove `force-dynamic` — that was forcing a full server render on every
// request, bypassing the entire Next.js cache and hammering the DB/Redis
// on every cold start. With ISR the built HTML is served from the CDN edge
// and only the background revalidation touches the DB.
export const revalidate = 3600; // seconds

// Tell Next.js which locale segments to pre-render at build time.
// Currently only 'en' is active (intlMiddleware locales: ['en']).
// Add more when you add locales: ['en', 'fr', 'de', 'es'].
export function generateStaticParams() {
  return [{ locale: 'en' }];
}

export default async function Home(): Promise<JSX.Element> {
  // During ISR revalidation this runs once, result is cached at the edge.
  // During a normal request the cached HTML is returned without touching this.
  const data = await getCachedConferences();

  // Only inline the first two month groups. Serializing the full dataset
  // (~6k conferences) produced a 35 MB HTML document that destroyed LCP,
  // TBT and TTI. The client progressively loads the full dataset from
  // /data/conferences.json after hydration. Stats/monthCount are tiny, so
  // every number on the page is correct from the first paint.
  const INITIAL_MONTH_GROUPS = 2;
  const initialData = {
    lastUpdated: data.lastUpdated,
    stats: data.stats,
    months: Object.fromEntries(Object.entries(data.months).slice(0, INITIAL_MONTH_GROUPS)),
    monthCount: Object.keys(data.months).length,
  };

  return <HomeClient initialData={initialData} />;
}
