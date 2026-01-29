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

  // 1. Get User's Bookmarks
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  });

  // 2. Get Conference Details
  const data = await getCachedConferences();
  const allConferences = Object.values(data.months).flat();

  // 3. Merge data
  const trackedEvents = bookmarks.map(bm => {
    const conf = allConferences.find(c => c.id === bm.conferenceId);
    return {
      ...bm,
      conference: conf || null
    };
  }).filter(e => e.conference !== null);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Speaker Dashboard</h1>
          <p className="text-zinc-400">Manage your conference applications and tracked events.</p>
        </header>

        <DashboardClient initialEvents={JSON.parse(JSON.stringify(trackedEvents))} />
      </main>
      <Footer />
    </div>
  );
}