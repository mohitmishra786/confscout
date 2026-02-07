'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { ConferenceData, SortOption, DOMAIN_INFO } from '@/types/conference';

import Header from '@/components/Header';
import ConferenceCard from '@/components/ConferenceCard';
import Footer from '@/components/Footer';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();

  const [data, setData] = useState<ConferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state from URL params
  const initialSearchTerm = searchParams.get('q') || '';
  const initialDomain = searchParams.get('domain') || 'all';
  const initialCfpOnly = searchParams.get('cfp') === 'true';

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedDomain, setSelectedDomain] = useState(initialDomain);
  const [showCfpOnly, setShowCfpOnly] = useState(initialCfpOnly);
  const [sortBy, setSortBy] = useState<SortOption>('startDate');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const conferencesPerPage = 12;

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/conferences.json');
        if (!response.ok) throw new Error('Failed to fetch');
        const jsonData = await response.json();
        setData(jsonData);
      } catch {
        setError('Failed to load conference data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Flatten conferences from months
  const allConferences = useMemo(() => {
    if (!data?.months) return [];
    return Object.values(data.months).flat();
  }, [data]);

  // Update URL when filters change
  useEffect(() => {
    const urlParams = new URLSearchParams();
    if (searchTerm) urlParams.set('q', searchTerm);
    if (selectedDomain !== 'all') urlParams.set('domain', selectedDomain);
    if (showCfpOnly) urlParams.set('cfp', 'true');

    const locale = params.locale as string;
    const newURL = urlParams.toString() ? `/${locale}/search?${urlParams.toString()}` : `/${locale}/search`;
    router.replace(newURL, { scroll: false });
  }, [searchTerm, selectedDomain, showCfpOnly, router, params.locale]);

  // Get unique domains
  const domains = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of allConferences) {
      counts[c.domain] = (counts[c.domain] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([slug, count]) => ({
        slug,
        count,
        ...DOMAIN_INFO[slug] || { name: slug, icon: '📌', color: '#6B7280' }
      }));
  }, [allConferences]);

  // Filter and sort conferences
  const filteredConferences = useMemo(() => {
    if (!data?.months) return [];

    let conferences = [...allConferences];

    // Filter by domain
    if (selectedDomain !== 'all') {
      conferences = conferences.filter(c => c.domain === selectedDomain);
    }

    // Filter by CFP open
    if (showCfpOnly) {
      conferences = conferences.filter(c => c.cfp?.status === 'open');
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      conferences = conferences.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.location?.raw?.toLowerCase().includes(term) ||
        c.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Sort
    switch (sortBy) {
      case 'cfpDeadline':
        conferences.sort((a, b) => {
          const aDate = a.cfp?.endDate || '9999-12-31';
          const bDate = b.cfp?.endDate || '9999-12-31';
          return aDate.localeCompare(bDate);
        });
        break;
      case 'name':
        conferences.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'startDate':
      default:
        conferences.sort((a, b) => {
          const aDate = a.startDate || '9999-12-31';
          const bDate = b.startDate || '9999-12-31';
          return aDate.localeCompare(bDate);
        });
    }

    return conferences;
  }, [data, allConferences, selectedDomain, showCfpOnly, searchTerm, sortBy]);

  // Paginated results
  const paginatedConferences = useMemo(() => {
    const startIndex = (currentPage - 1) * conferencesPerPage;
    return filteredConferences.slice(startIndex, startIndex + conferencesPerPage);
  }, [filteredConferences, currentPage, conferencesPerPage]);

  const totalPages = Math.ceil(filteredConferences.length / conferencesPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDomain, showCfpOnly, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400">Loading conferences...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Try Again
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">Search Conferences</h1>

        {/* Filters */}
        <section className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search conferences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Domain */}
            <div className="w-full md:w-48">
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full"
              >
                <option value="all">All Domains</option>
                {domains.map(d => (
                  <option key={d.slug} value={d.slug}>
                    {d.name} ({d.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="w-full md:w-40">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full"
              >
                <option value="startDate">By Date</option>
                <option value="cfpDeadline">By CFP Deadline</option>
                <option value="name">By Name</option>
              </select>
            </div>
          </div>

          {/* Toggle Filters */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCfpOnly}
                onChange={(e) => setShowCfpOnly(e.target.checked)}
              />
              <span className={`text-sm ${showCfpOnly ? 'text-green-400' : 'text-zinc-400'}`}>
                Open CFPs only
              </span>
            </label>

            <div className="text-sm text-zinc-500">
              {filteredConferences.length} result{filteredConferences.length !== 1 ? 's' : ''}
            </div>
          </div>
        </section>

        {/* Results */}
        {paginatedConferences.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {paginatedConferences.map((conf, idx) => (
                <ConferenceCard key={`${conf.id}-${idx}`} conference={conf} searchTerm={searchTerm} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-800 rounded disabled:opacity-50 text-white"
                >
                  Previous
                </button>
                <span className="text-zinc-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-gray-800 rounded disabled:opacity-50 text-white"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-zinc-500">
            No conferences found matching your criteria.
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}