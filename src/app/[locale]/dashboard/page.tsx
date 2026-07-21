import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCachedConferences } from '@/lib/cache';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Independent fetches — run in parallel, not sequentially.
  const [bookmarks, data] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    }),
    getCachedConferences(),
  ]);

  const allConferences = Object.values(data.months).flat();

  // Merge data — Map lookup (O(1)) instead of find() inside map (O(n·m)),
  // flatMap to merge+filter in one pass, and only the fields the client
  // actually renders (no Date serialization workaround needed).
  const confById = new Map(allConferences.map(c => [c.id, c]));
  const trackedEvents = bookmarks.flatMap(bm => {
    const conf = confById.get(bm.conferenceId);
    return conf
      ? [{ id: bm.id, conferenceId: bm.conferenceId, status: bm.status, conference: conf }]
      : [];
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Speaker Dashboard</h1>
          <p className="text-zinc-400">Manage your conference applications and tracked events.</p>
        </header>

        <DashboardClient initialEvents={trackedEvents} />
      </main>
      <Footer />
    </div>
  );
}