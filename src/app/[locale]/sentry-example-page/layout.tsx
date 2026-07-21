import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Page title lives here because the page itself is a client component and
// `next/head` is a no-op in the App Router.
export const metadata: Metadata = {
  title: 'Sentry Next.js Example Page',
  robots: { index: false, follow: false },
};

export default function SentryExampleLayout({ children }: { children: ReactNode }) {
  return children;
}
