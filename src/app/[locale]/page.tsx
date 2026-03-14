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
  return <HomeClient initialData={data} />;
}
