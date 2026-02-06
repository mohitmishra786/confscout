'use client';

import { useState, FormEvent } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ConferenceCard from '@/components/ConferenceCard';
import { Conference } from '@/types/conference';

/**
 * Renders the AI-powered conference recommendation page.
 */
export default function RecommendationsPage() {
  const [interests, setInterests] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Conference[]>([]);
  const [error, setError] = useState('');

  /**
   * Submits the recommendation request and updates the UI state.
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecommendations([]);

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, location, bio })
      });

      const data: { recommendations: Conference[]; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get recommendations');
      
      setRecommendations(data.recommendations);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            AI <span className="gradient-text">Conference Match</span>
          </h1>
          <p className="text-zinc-400">
            Tell us what you&apos;re interested in, and our AI will find the perfect conferences for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="md:col-span-1">
            <div className="card p-6 sticky top-24">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="interests" className="block text-sm font-medium text-zinc-400 mb-1">Interests / Tech Stack</label>
                  <input
                    id="interests"
                    type="text"
                    required
                    placeholder="React, AI, Rust..."
                    value={interests}
                    onChange={e => setInterests(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-zinc-400 mb-1">Preferred Location</label>
                  <input
                    id="location"
                    type="text"
                    placeholder="Europe, USA, Online..."
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-zinc-400 mb-1">Bio (Optional)</label>
                  <textarea
                    id="bio"
                    placeholder="I am a senior frontend engineer looking for..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white h-24"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span>✨</span> Find Matches
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Results */}
          <div className="md:col-span-2 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
                {error}
              </div>
            )}

            {recommendations.length > 0 ? (
              recommendations.map((conf) => (
                <div key={conf.id} className="relative">
                  <div className="absolute -left-3 top-6 bottom-6 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full opacity-50" />
                  {conf.recommendationReason && (
                    <div className="mb-2 pl-4">
                      <p className="text-sm text-purple-300 font-medium italic">
                        &quot; {conf.recommendationReason} &quot;
                      </p>
                    </div>
                  )}
                  <ConferenceCard conference={conf} />
                </div>
              ))
            ) : (
              !loading && (
                <div className="text-center py-12 text-zinc-600 border border-zinc-800 border-dashed rounded-xl">
                  <div className="text-4xl mb-4 opacity-20">🤖</div>
                  <p>Your personalized recommendations will appear here.</p>
                </div>
              )
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}