'use client';

/**
 * Admin Dashboard
 * Shows data statistics from the static JSON file.
 */

import { useState, useEffect, useMemo } from 'react';
import { type ConferenceData, DOMAIN_INFO } from '@/types/conference';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader } from '@/components/Loader';

export default function AdminPage() {
  const [data, setData] = useState<ConferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/conferences.json');
        if (!response.ok) throw new Error('Failed to fetch data');
        const jsonData = await response.json();
        setData(jsonData);
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Flatten conferences for analysis
  const allConferences = useMemo(() => {
    if (!data?.months) return [];
    return Object.values(data.months).flat();
  }, [data]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!data) return null;

    const byDomain: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let withCfp = 0;
    let withLocation = 0;

    for (const conf of allConferences) {
      byDomain[conf.domain] = (byDomain[conf.domain] || 0) + 1;
      bySource[conf.source] = (bySource[conf.source] || 0) + 1;
      if (conf.cfp?.status === 'open') withCfp++;
      if (conf.location?.lat) withLocation++;
    }

    return {
      total: allConferences.length,
      withCfp,
      withLocation,
      byDomain: Object.entries(byDomain).sort((a, b) => b[1] - a[1]),
      bySource: Object.entries(bySource).sort((a, b) => b[1] - a[1]),
      months: Object.keys(data.months).length,
      lastUpdated: data.lastUpdated // Pass this through
    };
  }, [data, allConferences]);

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Data Dashboard</h1>

        <Loader
          data={stats}
          isLoading={loading}
          error={error}
          fallback={
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
          render={(statsData) => (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card p-5 text-center">
                  <div className="text-3xl font-bold text-white">{statsData.total.toLocaleString()}</div>
                  <div className="text-sm text-zinc-500">Total Conferences</div>
                </div>
                <div className="card p-5 text-center">
                  <div className="text-3xl font-bold text-green-400">{statsData.withCfp}</div>
                  <div className="text-sm text-zinc-500">Open CFPs</div>
                </div>
                <div className="card p-5 text-center">
                  <div className="text-3xl font-bold text-blue-400">{statsData.withLocation.toLocaleString()}</div>
                  <div className="text-sm text-zinc-500">With Coordinates</div>
                </div>
                <div className="card p-5 text-center">
                  <div className="text-3xl font-bold text-purple-400">{statsData.months}</div>
                  <div className="text-sm text-zinc-500">Months</div>
                </div>
              </div>

              {/* By Domain */}
              <div className="card p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">By Domain</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {statsData.byDomain.map(([domain, count]) => (
                    <div key={domain} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                      <span className="text-zinc-400 capitalize">{DOMAIN_INFO[domain]?.name || domain}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Source */}
              <div className="card p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">By Source</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {statsData.bySource.map(([source, count]) => (
                    <div key={source} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                      <span className="text-zinc-400">{source}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last Updated */}
              {statsData.lastUpdated && (
                <div className="text-center text-sm text-zinc-600">
                  Last updated: {new Date(statsData.lastUpdated).toLocaleString()}
                </div>
              )}
            </>
          )}
        />
      </main>
      <Footer />
    </div>
  );
}