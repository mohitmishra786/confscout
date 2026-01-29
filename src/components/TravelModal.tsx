'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Conference } from '@/types/conference';

interface TravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  conference: Conference;
}

/**
 * TravelModal Component
 * 
 * Provides deep links to travel booking sites based on conference logistics.
 */
export default function TravelModal({ isOpen, onClose, conference }: TravelModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const destination = encodeURIComponent(`${conference.location.city}, ${conference.location.country}`);

  // Deep links
  const googleFlightsUrl = `https://www.google.com/travel/flights?q=flights+to+${destination}+on+${conference.startDate}`;
  const bookingComUrl = `https://www.booking.com/searchresults.html?ss=${destination}&checkin=${conference.startDate}&checkout=${conference.endDate}`;
  const airbnbUrl = `https://www.airbnb.com/s/${destination}/homes?checkin=${conference.startDate}&checkout=${conference.endDate}`;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative z-10">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400">✈️</span> Travel Logistics
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-zinc-400 mb-4">
              Planning your trip to <span className="text-white font-medium">{conference.name}</span> in {conference.location.city}?
            </p>
            
            <div className="space-y-3">
              <a 
                href={googleFlightsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛫</span>
                  <div>
                    <div className="text-sm font-bold text-white">Find Flights</div>
                    <div className="text-[10px] text-zinc-500">Google Flights</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <a 
                href={bookingComUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏨</span>
                  <div>
                    <div className="text-sm font-bold text-white">Book Hotels</div>
                    <div className="text-[10px] text-zinc-500">Booking.com</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <a 
                href={airbnbUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏠</span>
                  <div>
                    <div className="text-sm font-bold text-white">Search Airbnbs</div>
                    <div className="text-[10px] text-zinc-500">Airbnb</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 text-center">Pro Tip</div>
            <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
              Booking flights early and choosing hotels with flexible cancellation policies is recommended for conference travel.
            </p>
          </div>
        </div>

        <div className="p-4 text-center">
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xs font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}