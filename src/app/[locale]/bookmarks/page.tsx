import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCachedConferences } from '@/lib/cache';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ConferenceCard from '@/components/ConferenceCard';
import { redirect } from 'next/navigation';
import Link from 'next/link';

/**
 * User Bookmarks Page
 * 
 * Displays all conferences saved by the authenticated user.
 */
export default async function BookmarksPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/bookmarks');
  }

  // 1. Fetch User's Bookmarks
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    select: { conferenceId: true },
    orderBy: { createdAt: 'desc' }
  });

  const bookmarkIds = bookmarks.map(b => b.conferenceId);

  // 2. Fetch All Conferences
  const data = await getCachedConferences();
  const allConferences = Object.values(data.months).flat();

  // 3. Filter bookmarked conferences
  const bookmarkedConferences = allConferences.filter(c => bookmarkIds.includes(c.id));

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">My Bookmarks</h1>
          <p className="text-zinc-400">Manage your saved conferences and speaking opportunities.</p>
        </div>

        {bookmarkedConferences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarkedConferences.map(conf => (
              <ConferenceCard key={conf.id} conference={conf} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-zinc-800 border-dashed rounded-3xl bg-zinc-900/20">
            <div className="text-5xl mb-4 opacity-20">🔖</div>
            <h2 className="text-xl font-medium text-zinc-300 mb-2">No bookmarks yet</h2>
            <p className="text-zinc-500 mb-6">Start saving conferences to track them here.</p>
            <Link href="/" className="btn-primary px-6 py-2 inline-block">Browse Conferences</Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}