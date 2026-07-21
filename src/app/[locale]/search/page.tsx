'use client';

import { useState, useEffect, useMemo, useDeferredValue, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { type ConferenceData, type SortOption, DOMAIN_INFO } from '@/types/conference';

import Header from '@/components/Header';
import ConferenceCard from '@/components/ConferenceCard';
import Footer from '@/components/Footer';
import { secureFetch } from '@/lib/api';

interface SavedSearchRow {
  id: string;
  name: string;
  filters: {
    q?: string;
    domain?: string;
    cfp?: boolean;
    sortBy?: string;
  };
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const { status: authStatus } = useSession();

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
  // Keeps the input painting instantly while the (thousands-of-rows)
  // filter+sort is scheduled at lower priority.
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Saved searches (issue #56)
  const [savedSearches, setSavedSearches] = useState<SavedSearchRow[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const conferencesPerPage = 12;

  const loadSavedSearches = useCallback(async () => {
    if (authStatus !== 'authenticated') {
      setSavedSearches([]);
      return;
    }
    try {
      const res = await secureFetch('/api/user/saved-searches');
      if (!res.ok) return;
      const json = await res.json();
      setSavedSearches(Array.isArray(json.data) ? json.data : []);
    } catch {
      // non-fatal
    }
  }, [authStatus]);

  useEffect(() => {
    void loadSavedSearches();
  }, [loadSavedSearches]);

  const applySavedSearch = (row: SavedSearchRow) => {
    const f = row.filters || {};
    setSearchTerm(f.q || '');
    setSelectedDomain(f.domain || 'all');
    setShowCfpOnly(Boolean(f.cfp));
    if (f.sortBy) setSortBy(f.sortBy as SortOption);
    setCurrentPage(1);
  };

  const handleSaveSearch = async () => {
    const name = saveName.trim();
    if (!name) {
      setSaveMsg('Enter a name for this search');
      return;
    }
    setSaveBusy(true);
    setSaveMsg(null);
    try {
      const res = await secureFetch('/api/user/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          filters: {
            q: searchTerm || undefined,
            domain: selectedDomain !== 'all' ? selectedDomain : undefined,
            cfp: showCfpOnly || undefined,
            sortBy: sortBy !== 'startDate' ? sortBy : undefined,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveMsg(json?.error?.message || json?.error || 'Could not save search');
        return;
      }
      setSaveName('');
      setSaveMsg('Saved');
      await loadSavedSearches();
    } catch {
      setSaveMsg('Could not save search');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      const res = await secureFetch(`/api/user/saved-searches?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSavedSearches((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // ignore
    }
  };

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
    if (deferredSearchTerm.trim()) {
      const term = deferredSearchTerm.toLowerCase();
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
  }, [data, allConferences, selectedDomain, showCfpOnly, deferredSearchTerm, sortBy]);

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

  // Skeleton matches the final grid layout exactly, so the footer does
  // not shift when results arrive (was CLS 0.224 measured on this page).
  const resultsSkeleton = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="card p-5 h-[228px] animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-24 bg-zinc-800 rounded" />
            <div className="h-5 w-16 bg-zinc-800 rounded" />
          </div>
          <div className="h-6 w-3/4 bg-zinc-800 rounded mb-2" />
          <div className="h-4 w-1/2 bg-zinc-800 rounded mb-4" />
          <div className="mt-auto pt-3 border-t border-dashed border-zinc-800/50 flex justify-between">
            <div className="h-4 w-20 bg-zinc-800 rounded" />
            <div className="h-4 w-24 bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white mb-6">Search Conferences</h1>
          <div className="card p-4 mb-6 h-[132px] animate-pulse" aria-hidden="true" />
          <p className="sr-only" role="status">Loading conferences…</p>
          {resultsSkeleton}
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white mb-6">Search Conferences</h1>
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
            <div className="text-red-400 text-lg mb-4" role="alert">{error}</div>
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              Try Again
            </button>
          </div>
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
              <label htmlFor="search-input" className="sr-only">Search conferences</label>
              <input
                id="search-input"
                type="search"
                placeholder="Search conferences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Domain */}
            <div className="w-full md:w-48">
              <label htmlFor="domain-select" className="sr-only">Filter by domain</label>
              <select
                id="domain-select"
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
              <label htmlFor="sort-select" className="sr-only">Sort conferences</label>
              <select
                id="sort-select"
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

            <div className="text-sm text-zinc-400 tabular-nums" aria-live="polite">
              {filteredConferences.length} result{filteredConferences.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Saved searches (#56) — signed-in users only */}
          {authStatus === 'authenticated' && (
            <div className="mt-4 pt-4 border-t border-zinc-800/80">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <label htmlFor="save-search-name" className="sr-only">
                  Name for saved search
                </label>
                <input
                  id="save-search-name"
                  type="text"
                  maxLength={80}
                  placeholder="Name this search…"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveSearch()}
                  disabled={saveBusy}
                  className="btn-primary whitespace-nowrap disabled:opacity-50"
                >
                  {saveBusy ? 'Saving…' : 'Save search'}
                </button>
              </div>
              {saveMsg && (
                <p className="text-xs text-zinc-400 mt-2" role="status">
                  {saveMsg}
                </p>
              )}
              {savedSearches.length > 0 && (
                <ul className="flex flex-wrap gap-2 mt-3">
                  {savedSearches.map((row) => (
                    <li key={row.id}>
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/60 pl-3 pr-1 py-1 text-xs text-zinc-200">
                        <button
                          type="button"
                          onClick={() => applySavedSearch(row)}
                          className="hover:text-white"
                        >
                          {row.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSaved(row.id)}
                          aria-label={`Delete saved search ${row.name}`}
                          className="ml-1 rounded-full px-1.5 py-0.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Results */}
        {paginatedConferences.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {paginatedConferences.map((conf) => (
                <ConferenceCard key={conf.id} conference={conf} searchTerm={deferredSearchTerm} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex justify-center items-center gap-2" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Go to previous page"
                  className="px-3 py-2 bg-gray-800 rounded disabled:opacity-50 text-white transition-[background-color,transform] duration-150 ease-out motion-safe:active:scale-95 hover:bg-gray-700"
                >
                  Previous
                </button>
                <span className="text-zinc-400 tabular-nums" aria-current="page">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Go to next page"
                  className="px-3 py-2 bg-gray-800 rounded disabled:opacity-50 text-white transition-[background-color,transform] duration-150 ease-out motion-safe:active:scale-95 hover:bg-gray-700"
                >
                  Next
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-zinc-400">
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