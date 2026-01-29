import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ConferenceCard from '@/components/ConferenceCard';
import { getCachedConferences } from '@/lib/cache';
import Image from 'next/image';

interface ProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;

  // 1. Fetch User (Public Info)
  // We need to try/catch because if DB is not reachable/migrated, this might fail in this env
  let user;
  let bookmarks: string[] = [];

  try {
    user = await prisma.user.findUnique({
      where: { id },
      select: { name: true, image: true, createdAt: true, bookmarks: true }
    });
    
    if (user) {
      bookmarks = user.bookmarks.map((b: { conferenceId: string }) => b.conferenceId);
    }
  } catch (e) {
    console.error('Failed to fetch user profile:', e);
    // Fallback for demo/dev without DB
    if (id === 'demo') {
      user = {
        name: 'Demo Speaker',
        image: null,
        createdAt: new Date(),
      };
      bookmarks = ['a1d39bad5e35', 'c9ea26dce41f']; // Use some valid IDs from JSON
    }
  }

  if (!user) {
    notFound();
  }

  // 2. Fetch Conferences
  const data = await getCachedConferences();
  const allConferences = Object.values(data.months).flat();
  const userConferences = allConferences.filter(c => bookmarks.includes(c.id));

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-16">
          <div className="relative w-32 h-32 mb-6">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || 'User'}
                fill
                className="object-cover rounded-full border-4 border-zinc-800"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-4xl text-white font-bold border-4 border-zinc-800">
                {(user.name?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{user.name || 'Anonymous User'}</h1>
          <p className="text-zinc-500">Member since {new Date(user.createdAt).getFullYear()}</p>
          
          <div className="mt-6 flex gap-4">
            <div className="px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
              <span className="block text-2xl font-bold text-white">{userConferences.length}</span>
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Events</span>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <h2 className="text-xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">Upcoming Events</h2>
        
        {userConferences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userConferences.map(conf => (
              <ConferenceCard key={conf.id} conference={conf} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-600 italic">
            No public events listed.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}