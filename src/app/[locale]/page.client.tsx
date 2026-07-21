'use client';

/**
 * ConfScout Homepage
 * 
 * Features:
 * - World map visualization of conferences
 * - Month-grouped timeline view
 * - Speaker Mode toggle (highlights open CFPs)
 * - Domain and filter controls
 */

import { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { type Conference, type ConferenceData, type HomeInitialData, DOMAIN_INFO } from '@/types/conference';
import { parseLocalDate } from '@/lib/date';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TimelineView from '@/components/TimelineView';
import ConferenceCard from '@/components/ConferenceCard';
import SubscribeModal from '@/components/SubscribeModal';
import NearMeButton from '@/components/NearMeButton';
import { SafeJsonLd } from '@/components/SafeJsonLd';

// Dynamic import for WorldMap (requires browser APIs)
const WorldMap = dynamic(() => import('@/components/WorldMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-gray-400">Loading map...</div>
    </div>
  ),
});

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Per-conference derived data, computed ONCE per dataset change instead of
 * on every keystroke. Previously the month grouping called
 * `new Date(...).toLocaleDateString(...)` for all ~6k conferences on every
 * render — that was the 10.3 s INP measured on the search input.
 */
interface IndexedConference {
  conf: Conference;
  monthKey: string;
  monthTime: number;
  searchText: string;
}

function buildIndex(conferences: Conference[]): IndexedConference[] {
  return conferences.map((conf) => {
    const d = conf.startDate ? parseLocalDate(conf.startDate) : null;
    const monthKey = d ? `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` : 'TBD';
    const monthTime = d ? new Date(d.getFullYear(), d.getMonth(), 1).getTime() : Number.MAX_SAFE_INTEGER;
    const searchText = `${conf.name} ${conf.location?.raw ?? ''} ${(conf.tags ?? []).join(' ')}`.toLowerCase();
    return { conf, monthKey, monthTime, searchText };
  });
}

interface HomeClientProps {
  initialData: HomeInitialData;
}

export default function HomeClient({ initialData }: HomeClientProps) {
  const t = useTranslations('HomePage');

  // The server inlines only the first month groups (fast LCP). The full
  // dataset is loaded from the CDN-cached static JSON after hydration.
  const [fullData, setFullData] = useState<ConferenceData | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/data/conferences.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: ConferenceData) => {
        if (!cancelled) setFullData(json);
      })
      .catch(() => {
        // Progressive enhancement only — the initial server-rendered
        // month groups stay usable if the fetch fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const data = fullData ?? initialData;
  const isFullDataLoaded = fullData !== null;
  const monthCount = fullData ? Object.keys(fullData.months).length : initialData.monthCount;

  // View and filter state
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [speakerMode, setSpeakerMode] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('all');
  // Map is hidden by default — defers loading the ~180 KB Leaflet bundle
  // until the user explicitly opens it, improving mobile TTI.
  const [showMap, setShowMap] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Deferred value keeps the input painting instantly; the list re-render
  // (which filters thousands of rows) is scheduled at lower priority.
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const isSearchStale = searchTerm !== deferredSearchTerm;

  // Subscription and Map UI state
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);

  // Lazy loading state for performance
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset lazy load when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedDomain, speakerMode, deferredSearchTerm]);

  // Intersection observer for infinite scroll/lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 20);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMoreRef]);

  // Flatten conferences for filtering
  const allConferences = useMemo(() => {
    if (!data?.months) return [];
    return Object.values(data.months).flat();
  }, [data]);

  // Derived per-conference data (month key, sort key, searchable text),
  // built once per dataset — not per keystroke.
  const conferenceIndex = useMemo(() => buildIndex(allConferences), [allConferences]);

  // Single filtered view of the index — shared by the flat list (grid/map)
  // and the month-grouped timeline, so the filter runs exactly once.
  const filteredIndex = useMemo(() => {
    const term = deferredSearchTerm.trim().toLowerCase();
    return conferenceIndex.filter(({ conf, searchText }) => {
      if (selectedDomain !== 'all' && conf.domain !== selectedDomain) return false;
      if (speakerMode && conf.cfp?.status !== 'open') return false;
      if (term && !searchText.includes(term)) return false;
      return true;
    });
  }, [conferenceIndex, selectedDomain, speakerMode, deferredSearchTerm]);

  const filteredConferences = useMemo(
    () => filteredIndex.map(({ conf }) => conf),
    [filteredIndex]
  );

  // Regroup filtered conferences by month using the precomputed keys —
  // no date parsing or Intl formatting in this loop.
  const filteredMonths = useMemo(() => {
    const grouped = new Map<string, { time: number; confs: Conference[] }>();

    for (const { conf, monthKey, monthTime } of filteredIndex) {
      const entry = grouped.get(monthKey);
      if (entry) entry.confs.push(conf);
      else grouped.set(monthKey, { time: monthTime, confs: [conf] });
    }

    return Object.fromEntries(
      [...grouped.entries()]
        .sort((a, b) => a[1].time - b[1].time)
        .map(([key, { confs }]) => [
          key,
          confs.toSorted((a, b) => (a.startDate || '').localeCompare(b.startDate || '')),
        ])
    );
  }, [filteredIndex]);

  // Domain list with counts — sourced from the server-computed stats so it
  // is correct even before the full dataset has loaded.
  const domains = useMemo(() => {
    return Object.entries(data.stats.byDomain)
      .sort((a, b) => b[1] - a[1])
      .map(([slug, count]) => ({
        slug,
        count,
        ...DOMAIN_INFO[slug] || { name: slug, icon: '📌', color: '#6B7280' }
      }));
  }, [data.stats.byDomain]);

  const handleLocationFound = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(6);
    setShowMap(true); // Ensure map is visible
  };

  const handleConfClick = (conf: Pick<Conference, 'location'>) => {
    if (conf.location.lat && conf.location.lng) {
      setMapCenter([conf.location.lat, conf.location.lng]);
      setMapZoom(10);
      setShowMap(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Tech Conferences Worldwide',
    description: 'A curated list of upcoming tech conferences, CFPs, and events.',
    url: 'https://www.confscouting.com',
    mainEntity: allConferences.slice(0, 20).map(conf => ({
      '@type': 'Event',
      name: conf.name,
      startDate: conf.startDate,
      endDate: conf.endDate,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: conf.online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
      location: conf.online ? {
        '@type': 'VirtualLocation',
        url: conf.url
      } : {
        '@type': 'Place',
        name: conf.location.raw,
        address: {
          '@type': 'PostalAddress',
          addressLocality: conf.location.city,
          addressCountry: conf.location.country
        }
      },
      image: 'https://www.confscouting.com/og-image.png',
      description: conf.description || `Tech conference focused on ${conf.domain}.`,
      offers: {
        '@type': 'Offer',
        url: conf.url,
        availability: 'https://schema.org/InStock'
      }
    }))
  }), [allConferences]);

  // Stale data detection
  const isStale = useMemo(() => {
    if (!data?.lastUpdated) return false;
    const lastUpdate = new Date(data.lastUpdated);
    const now = new Date();
    // More than 24 hours old
    return (now.getTime() - lastUpdate.getTime()) > 24 * 60 * 60 * 1000;
  }, [data?.lastUpdated]);

  return (
    <div className="min-h-screen bg-black">
      <Header />

      {isStale && (
        <div className="bg-amber-900/20 border-b border-amber-500/20 py-2 px-4 text-center">
          <p className="text-amber-200/80 text-xs">
            ⚠️ Data might be stale. Last updated {new Date(data.lastUpdated).toLocaleDateString()}. 
            <button type="button" onClick={() => window.location.reload()} className="ml-2 underline hover:text-white">Refresh</button>
          </p>
        </div>
      )}

      {/* Subscribe Button (Fixed or top) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsSubscribeOpen(true)}
          className="bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-[transform,background-color] duration-150 ease-out flex items-center gap-2 motion-safe:hover:scale-105 motion-safe:active:scale-95 hover:bg-blue-500"
        >
          Get Updates
        </button>
      </div>

      <SubscribeModal isOpen={isSubscribeOpen} onClose={() => setIsSubscribeOpen(false)} />

      {/* SECURITY FIX: Using SafeJsonLd component instead of dangerouslySetInnerHTML */}
      <SafeJsonLd data={jsonLd} />

      <main className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Hero */}
        <section className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 [text-wrap:balance]">
            <span className="gradient-text">Tech Conferences</span>
            <br />
            <span className="text-white">Worldwide</span>
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto">
            {t('subtitle', { total: data?.stats.total.toLocaleString() || '0', domains: domains.length })}
            <br />
            {data?.stats.withOpenCFP} {t('stats.openCfps')} waiting for speakers.
          </p>
        </section>

        {/* Stats */}
        {data?.stats && (
          <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1 tabular-nums">{data.stats.total.toLocaleString()}</div>
              <div className="text-xs text-zinc-400">{t('stats.conferences')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-green-400 mb-1 tabular-nums">{data.stats.withOpenCFP}</div>
              <div className="text-xs text-zinc-400">{t('stats.openCfps')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1 tabular-nums">{data.stats.withLocation.toLocaleString()}</div>
              <div className="text-xs text-zinc-400">{t('stats.mapped')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1 tabular-nums">{monthCount}</div>
              <div className="text-xs text-zinc-400">{t('stats.months')}</div>
            </div>
          </section>
        )}

        {/* World Map Toggle */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              aria-expanded={showMap}
              className={`text-sm text-zinc-400 hover:text-white transition-colors`}
            >
              {showMap ? t('map.hide') : t('map.show')}
            </button>
            {showMap && <NearMeButton onLocationFound={handleLocationFound} />}
          </div>


          {showMap && (
            <div className="mt-2 transition-all">
              <WorldMap
                conferences={filteredConferences}
                center={mapCenter}
                zoom={mapZoom}
                onMarkerClick={handleConfClick}
              />
            </div>
          )}
        </section>

        {/* Filters */}
        <section className="mb-6 card p-4 sm:p-6 sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-800">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="conference-search" className="sr-only">{t('filters.searchPlaceholder')}</label>
              <input
                id="conference-search"
                type="search"
                placeholder={t('filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Domain */}
            <div className="w-full md:w-56">
              <label htmlFor="domain-filter" className="sr-only">{t('filters.allDomains')}</label>
              <select
                id="domain-filter"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">{t('filters.allDomains')} ({data.stats.total.toLocaleString()})</option>
                {domains.map(d => (
                  <option key={d.slug} value={d.slug}>
                    {d.name} ({d.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              {/* Speaker Mode */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={speakerMode}
                  onChange={(e) => setSpeakerMode(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm ${speakerMode ? 'text-green-400 font-medium' : 'text-zinc-400'}`}>
                  {t('filters.speakerMode')}
                </span>
              </label>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1" role="group" aria-label="View mode">
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  aria-pressed={viewMode === 'timeline'}
                  className={`px-3 py-1 text-xs font-medium rounded transition-[color,background-color,transform] duration-150 ease-out motion-safe:active:scale-95 ${viewMode === 'timeline' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {t('filters.timeline')}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  className={`px-3 py-1 text-xs font-medium rounded transition-[color,background-color,transform] duration-150 ease-out motion-safe:active:scale-95 ${viewMode === 'grid' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {t('filters.grid')}
                </button>
              </div>
            </div>

            <div className="text-sm text-zinc-400 tabular-nums" aria-live="polite">
              {filteredConferences.length} result{filteredConferences.length !== 1 ? 's' : ''}
              {!isFullDataLoaded && (
                <span className="ml-2 text-zinc-500" role="status">Loading full index…</span>
              )}
              {(selectedDomain !== 'all' || speakerMode || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDomain('all');
                    setSpeakerMode(false);
                    setSearchTerm('');
                  }}
                  className="ml-4 text-blue-400 hover:text-blue-300 underline"
                >
                  {t('filters.clear')}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Conference Display */}
        <div className={isSearchStale ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
        {filteredConferences.length > 0 ? (
          viewMode === 'timeline' ? (
            <TimelineView months={filteredMonths} speakerMode={speakerMode} />
          ) : (
            <div className="space-y-8">
              <h2 className="sr-only">Conference results</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredConferences.slice(0, visibleCount).map((conf) => (
                  <ConferenceCard key={conf.id} conference={conf} searchTerm={deferredSearchTerm} />
                ))}
              </div>
              
              {/* Sentinel element for intersection observer */}
              {visibleCount < filteredConferences.length && (
                <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {filteredConferences.length > 50 && visibleCount >= filteredConferences.length && (
                <div className="col-span-full text-center py-4 text-zinc-400">
                  Showing all {filteredConferences.length} results.
                </div>
              )}
            </div>
          )
        ) : (
          <div className="text-center py-20 px-4 card border-dashed border-zinc-800">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-white mb-2">No conferences found</h3>
            <p className="text-zinc-400 max-w-md mx-auto mb-8">
              We couldn&apos;t find any conferences matching your current filters. Try adjusting your search term or clearing filters to see more results.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedDomain('all');
                setSpeakerMode(false);
                setSearchTerm('');
              }}
              className="btn-primary"
            >
              Clear all filters
            </button>
          </div>
        )}
        </div>

        {/* Last Updated */}
        {data?.lastUpdated && (
          <div className="mt-10 text-center text-sm text-zinc-400">
            Last updated: {new Date(data.lastUpdated).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
