import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-zinc-400">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By using ConfScout, you agree to these terms. If you do not agree, please do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Data Accuracy</h2>
            <p>While we strive for accuracy, conference data is aggregated from external sources. We are not responsible for cancelled events or incorrect dates. Always verify with the official conference website.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Use of Content</h2>
            <p>ConfScout is an open-source project. Data aggregated from third-party sources remains the property of their respective owners.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Limitation of Liability</h2>
            <p>ConfScout is provided &quot;as is&quot; without warranty. We are not liable for any travel costs, visa issues, or damages resulting from the use of our platform.</p>
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