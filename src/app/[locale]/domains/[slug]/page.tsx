import { redirect } from 'next/navigation';

interface DomainPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Redirect to search page with domain filter
export default async function DomainPage({ params }: DomainPageProps) {
  const { slug } = await params;

  // Redirect to the search page with the domain filter applied
  redirect(`/search?domain=${slug}`);

  // This return is never reached but satisfies TypeScript
  return null;
}