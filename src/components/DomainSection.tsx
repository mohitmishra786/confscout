'use client';

import { useState } from 'react';
import type { Conference, Domain } from '@/types/conference';
import ConferenceCard from './ConferenceCard';
import Link from 'next/link';

interface DomainSectionProps {
  domain: Domain;
  conferences: Conference[];
  searchTerm?: string;
  initialExpanded?: boolean;
  maxDisplay?: number;
}

export default function DomainSection({
  domain,
  conferences,
  searchTerm,
  initialExpanded = true,
  maxDisplay = 6
}: DomainSectionProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // Filter conferences by search term if provided
  const filteredConferences = searchTerm
    ? conferences.filter(conference => {
      const term = searchTerm.toLowerCase();
      return (
        conference.name.toLowerCase().includes(term) ||
        conference.location?.raw?.toLowerCase().includes(term) ||
        conference.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    })
    : conferences;

  const displayedConferences = isExpanded
    ? filteredConferences.slice(0, maxDisplay)
    : [];

  if (filteredConferences.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      {/* Domain Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: domain.color }}
          />

          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {domain.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {domain.description}
            </p>
          </div>
        </div>

        <Link
          href={`/search?domain=${domain.slug}`}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
        >
          View all ({filteredConferences.length})
        </Link>
      </div>

      {/* Conferences Grid */}
      {isExpanded && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedConferences.map((conference, idx) => (
              <ConferenceCard
                key={`${conference.id}-${idx}`}
                conference={conference}
                searchTerm={searchTerm}
              />
            ))}
          </div>

          {filteredConferences.length > maxDisplay && (
            <div className="mt-4 text-center">
              <Link
                href={`/search?domain=${domain.slug}`}
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
              >
                View {filteredConferences.length - maxDisplay} more conferences
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}