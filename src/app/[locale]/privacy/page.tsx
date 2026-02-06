import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-zinc-400">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Data Collection</h2>
            <p>We collect minimal data to provide our services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Email Address:</strong> Used for subscriptions and digests.</li>
              <li><strong>Authentication Data:</strong> Provided by GitHub or Google via NextAuth.</li>
              <li><strong>Usage Data:</strong> Bookmarks and attendance status to personalize your experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Cookies</h2>
            <p>We use cookies for session management and analytics (Vercel Analytics). You can disable cookies in your browser settings, but some features may not function correctly.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Third-Party Services</h2>
            <p>We utilize trusted third-party providers:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Vercel:</strong> Hosting and Analytics.</li>
              <li><strong>Upstash:</strong> Redis caching.</li>
              <li><strong>Neon:</strong> PostgreSQL database.</li>
              <li><strong>Zoho Mail:</strong> Email delivery.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Your Rights</h2>
            <p>You may unsubscribe from our emails at any time using the link provided in every message. To request full deletion of your account data, please contact us via GitHub.</p>
          </section>

          <section className="pt-8 border-t border-zinc-800">
            <p className="text-sm italic">Last updated: January 30, 2026</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}