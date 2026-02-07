/**
 * ConfScout Homepage - SERVER COMPONENT
 * 
 * This is the main server component that fetches data server-side
 * for optimal performance (reduced TTFB and improved FCP).
 */

import { getCachedConferences } from '@/lib/cache';
import HomeClient from './page.client';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export default async function Home() {
  // Server-side data fetching - runs in parallel with component rendering
  const data = await getCachedConferences();
  
  // Pass the pre-fetched data to the client component
  return <HomeClient initialData={data} />;
}
