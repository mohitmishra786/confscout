'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useCompare } from '@/context/CompareContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';
import type { Conference } from '@/types/conference';
import { isValidConference } from '@/lib/validation';

/**
 * Side-by-side comparison with shareable `?ids=` deep link (issue #78).
 */
function CompareContent() {
  const { selectedConferences, removeFromCompare, addToCompare, clearCompare } = useCompare();
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);

  // Hydrate compare list from ?ids= once on mount when empty.
  useEffect(() => {
    if (hydratedFromUrl) return;
    const idsParam = searchParams.get('ids');
    if (!idsParam || selectedConferences.length > 0) {
      setHydratedFromUrl(true);
      return;
    }

    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
    if (ids.length === 0) {
      setHydratedFromUrl(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/data/conferences.json');
        if (!res.ok) return;
        const data = await res.json();
        const all: Conference[] = Object.values(data.months || {}).flat() as Conference[];
        const byId = new Map(all.map((c) => [c.id, c]));
        for (const id of ids) {
          if (cancelled) return;
          const conf = byId.get(id);
          if (conf && isValidConference(conf)) {
            addToCompare(conf);
          }
        }
      } finally {
        if (!cancelled) setHydratedFromUrl(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, selectedConferences.length, addToCompare, hydratedFromUrl]);

  // Keep URL in sync for shareable comparisons
  useEffect(() => {
    if (!hydratedFromUrl) return;
    const ids = selectedConferences.map((c) => c.id).join(',');
    const next = ids
      ? `/${locale}/compare?ids=${encodeURIComponent(ids)}`
      : `/${locale}/compare`;
    router.replace(next, { scroll: false });
  }, [selectedConferences, locale, router, hydratedFromUrl]);

  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://www.confscouting.com/${locale}/compare`;

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // ignore
    }
  }, []);

  const rows = useMemo(
    () => [
      {
        label: 'Date',
        render: (c: Conference) =>
          c.startDate
            ? `${c.startDate}${c.endDate && c.endDate !== c.startDate ? ` → ${c.endDate}` : ''}`
            : 'TBD',
      },
      {
        label: 'Location',
        render: (c: Conference) => c.location?.raw || (c.online ? 'Online' : 'TBD'),
      },
      {
        label: 'Domain',
        render: (c: Conference) => c.domain,
      },
      {
        label: 'Online',
        render: (c: Conference) => (c.online ? 'Yes' : 'No'),
      },
      {
        label: 'CFP Status',
        render: (c: Conference) =>
          c.cfp?.status === 'open'
            ? `Open${typeof c.cfp.daysRemaining === 'number' ? ` (${c.cfp.daysRemaining}d left)` : ''}`
            : c.cfp?.status === 'closed'
              ? 'Closed'
              : 'N/A',
      },
      {
        label: 'CFP Deadline',
        render: (c: Conference) => c.cfp?.endDate || '—',
      },
      {
        label: 'CFP URL',
        render: (c: Conference) =>
          c.cfp?.url ? (
            <a
              href={c.cfp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Open CFP
            </a>
          ) : (
            '—'
          ),
      },
      {
        label: 'Financial aid',
        render: (c: Conference) => (c.financialAid?.available ? 'Available' : 'Not listed'),
      },
      {
        label: 'Tags',
        render: (c: Conference) => (c.tags?.length ? c.tags.slice(0, 6).join(', ') : '—'),
      },
      {
        label: 'Website',
        render: (c: Conference) => (
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 hover:underline"
          >
            Visit website
          </a>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white">Compare Conferences</h1>
          {selectedConferences.length > 0 && (
            <div className="flex items-center gap-3">
              <ShareButtons
                url={shareUrl}
                title="Conference comparison on ConfScouting"
                text={`Comparing ${selectedConferences.map((c) => c.name).join(', ')}`}
              />
              <button
                type="button"
                onClick={() => void copyShareLink()}
                className="text-sm text-zinc-400 hover:text-white underline-offset-2 hover:underline"
              >
                Copy compare link
              </button>
              <button
                type="button"
                onClick={clearCompare}
                className="text-sm text-red-400/90 hover:text-red-300"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {selectedConferences.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p>No conferences selected to compare.</p>
            <Link
              href={`/${locale}`}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded mt-4 inline-block transition-colors"
            >
              Browse Conferences
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b border-zinc-800 text-zinc-400 w-32">Feature</th>
                  {selectedConferences.map((c) => (
                    <th key={c.id} className="p-4 border-b border-zinc-800 min-w-[200px]">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-white font-bold text-lg">{c.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFromCompare(c.id)}
                          aria-label={`Remove ${c.name} from comparison`}
                          className="text-zinc-400 hover:text-red-400 text-xl leading-none"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td className="p-4 border-b border-zinc-800 font-medium text-zinc-500">
                      {row.label}
                    </td>
                    {selectedConferences.map((c) => (
                      <td key={c.id} className="p-4 border-b border-zinc-800 capitalize">
                        {row.render(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black">
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-white mb-8">Compare Conferences</h1>
            <p className="text-zinc-500">Loading comparison…</p>
          </main>
          <Footer />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
