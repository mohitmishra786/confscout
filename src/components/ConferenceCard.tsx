'use client';

/**
 * ConferenceCard Component
 *
 * Displays a single conference with CFP status, domain badge, location, and tags.
 * SECURITY FIX: Removed dangerouslySetInnerHTML usage to prevent XSS attacks.
 * Now uses SafeHighlightedText component for search term highlighting.
 */

import { useState } from 'react';
import Image from 'next/image';
import { Conference, DOMAIN_INFO } from '@/types/conference';
import { useCompare } from '@/context/CompareContext';
import { SafeHighlightedText } from './SafeHighlightedText';
import VisaModal from './VisaModal';
import TravelModal from './TravelModal';
import { secureFetch } from '@/lib/api';

interface ConferenceCardProps {
  conference: Conference;
  searchTerm?: string;
}

export default function ConferenceCard({ conference, searchTerm }: ConferenceCardProps) {
  const [isVisaOpen, setIsVisaOpen] = useState(false);
  const [isTravelOpen, setIsTravelOpen] = useState(false);
  const [isAttending, setIsAttending] = useState(conference.isAttending || false);
  const [attendeeCount, setAttendeeCount] = useState(conference.attendeeCount || 0);
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const isCompared = isInCompare(conference.id);

  const toggleAttendance = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Optimistic update
    const prevAttending = isAttending;
    setIsAttending(!prevAttending);
    setAttendeeCount(prev => prevAttending ? prev - 1 : prev + 1);

    try {
      const res = await secureFetch('/api/conferences/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conferenceId: conference.id })
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on error
      setIsAttending(prevAttending);
      setAttendeeCount(prev => prevAttending ? prev + 1 : prev - 1);
      alert('Failed to update attendance');
    }
  };

  const toggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCompared) removeFromCompare(conference.id);
    else addToCompare(conference);
  };

  // CFP status
  const cfp = conference.cfp;
  const cfpIsOpen = cfp?.status === 'open';
  const daysRemaining = cfp?.daysRemaining ?? -1;

  // SECURITY FIX: Removed highlightText function that used dangerouslySetInnerHTML
  // Now using SafeHighlightedText component which safely renders highlighted text
  // This prevents XSS attacks from malicious search terms or conference data

  // CFP badge styling based on urgency
  const getCfpBadgeStyle = () => {
    if (!cfpIsOpen) return 'text-zinc-500 bg-zinc-800 border-zinc-700';
    if (daysRemaining <= 3) return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (daysRemaining <= 7) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    if (daysRemaining <= 14) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-green-400 bg-green-400/10 border-green-400/20';
  };

  const getCfpText = () => {
    if (!cfpIsOpen) return 'CFP Closed';
    if (daysRemaining === 0) return 'Closes Today';
    if (daysRemaining === 1) return '1 Day Left';
    if (daysRemaining <= 7) return `${daysRemaining} Days Left`;
    return 'CFP Open';
  };

  // Domain color
  const domainInfo = DOMAIN_INFO[conference.domain] || DOMAIN_INFO.general;
  const domainColor = domainInfo.color;

  // Format date range
  const formatDate = (start: string | null, end: string | null) => {
    if (!start) return 'TBD';
    const s = new Date(start);
    const e = end ? new Date(end) : null;

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = s.toLocaleDateString('en-US', options);

    if (!e || s.getTime() === e.getTime()) return startStr;

    // Same month
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${startStr}-${e.getDate()}`;
    }

    return `${startStr} - ${e.toLocaleDateString('en-US', options)}`;
  };

  // Location text
  const locationText = conference.location?.raw || (conference.online ? 'Online' : 'TBD');

  return (
    <article
      className="card group flex flex-col h-full relative overflow-hidden hover:shadow-lg transition-all duration-300"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none"
        style={{ background: `linear-gradient(to bottom right, ${domainColor}, transparent)` }}
      />

      <div className="p-5 flex flex-col h-full relative z-10">
        {/* Top Row: Domain & CFP */}
        <div className="flex items-center justify-between mb-3 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
              style={{ color: domainColor, backgroundColor: domainColor }}
            />
            <span className="text-zinc-400 uppercase tracking-wider">{conference.domain}</span>
          </div>

          {cfp?.url ? (
            <a
              href={cfp.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-2 py-0.5 rounded border ${getCfpBadgeStyle()} transition-colors hover:bg-opacity-20`}
            >
              {getCfpText()}
            </a>
          ) : (
            <span className="text-zinc-600 px-2 py-0.5 border border-zinc-800 rounded bg-zinc-900/50">
              No CFP
            </span>
          )}
        </div>

        {/* Title - SECURITY FIX: Using SafeHighlightedText instead of dangerouslySetInnerHTML */}
        <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-blue-400 transition-colors">
          <a
            href={conference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline decoration-blue-400/30 focus:outline-none"
          >
            <SafeHighlightedText text={conference.name} searchTerm={searchTerm || ''} />
          </a>
        </h3>

        {/* Meta: Date & Location */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-sm text-zinc-400 mb-4">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(conference.startDate, conference.endDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <SafeHighlightedText text={locationText} searchTerm={searchTerm || ''} />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-auto pt-3 flex items-end justify-between gap-4 border-t border-dashed border-zinc-800/50">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {/* Attendees / Who's Going */}
            {attendeeCount > 0 && (
              <div className="flex items-center gap-2 mb-1">
                <div className="flex -space-x-2">
                  {conference.attendees?.map((a, i) => (
                    <div key={i} className="w-5 h-5 rounded-full border border-zinc-900 overflow-hidden bg-zinc-800">
                      {a.image ? (
                        <Image src={a.image} alt={a.name || ''} width={20} height={20} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-500">
                          {a.name?.[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-zinc-500 font-medium">
                  {attendeeCount} going
                </span>
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-[1.5rem]">
              {conference.financialAid?.available && (
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20">
                  Fin Aid
                </span>
              )}
              {conference.online && (
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20">
                  Online
                </span>
              )}
              {conference.tags?.slice(0, 2).map(tag => (
                <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            {/* Attendance Toggle */}
            <button
              onClick={toggleAttendance}
              className={`p-1.5 rounded-lg transition-all border ${isAttending ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800'}`}
              title={isAttending ? "I'm not going" : "I'm going!"}
            >
              <svg className="w-4 h-4" fill={isAttending ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>

            {/* Compare Toggle */}
            <button
              onClick={toggleCompare}
              className={`p-1.5 transition-colors ${isCompared ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title={isCompared ? "Remove from comparison" : "Add to comparison"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>

            {/* Visa Support Button */}
            {!conference.online && (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsTravelOpen(true);
                  }}
                  className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors"
                  title="Travel Logistics (Flights/Hotels)"
                >
                  <span className="text-sm" aria-hidden="true">✈️</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsVisaOpen(true);
                  }}
                  className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors"
                  title="Visa Support Letter Request"
                >
                  <span className="text-sm" aria-hidden="true">🛂</span>
                </button>
              </>
            )}

            {/* Calendar Button */}
            {conference.startDate && (
              <a
                href={`/api/calendar/${conference.id}`}
                title="Add to Calendar"
                className="p-1.5 text-zinc-500 hover:text-green-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </a>
            )}
            {/* Visit Link */}
            <a
              href={conference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-medium text-white hover:text-blue-400 transition-colors pl-2"
              onClick={(e) => e.stopPropagation()}
            >
              Visit
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <TravelModal
        isOpen={isTravelOpen}
        onClose={() => setIsTravelOpen(false)}
        conference={conference}
      />

      <VisaModal 
        isOpen={isVisaOpen} 
        onClose={() => setIsVisaOpen(false)} 
        conference={conference} 
      />
    </article>
  );
}