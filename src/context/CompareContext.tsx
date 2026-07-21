'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import type { Conference } from '@/types/conference';
import { isValidConference } from '@/lib/validation';
import { safeGetItem, safeSetItem, safeParseJson } from '@/lib/safeStorage';

interface CompareContextType {
  selectedConferences: Conference[];
  addToCompare: (conf: Conference) => void;
  removeFromCompare: (confId: string) => void;
  clearCompare: () => void;
  isInCompare: (confId: string) => boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selectedConferences, setSelectedConferences] = useState<Conference[]>([]);

  // Load from session storage on mount (more secure than localStorage for ephemeral data)
  useEffect(() => {
    const saved = safeGetItem('session', 'compare_conferences');
    const parsed = safeParseJson<unknown>(saved, null);
    if (Array.isArray(parsed)) {
      setSelectedConferences(parsed.filter(isValidConference));
    }
  }, []);

  // Save to session storage on change (quota-safe — issue #223)
  useEffect(() => {
    safeSetItem('session', 'compare_conferences', JSON.stringify(selectedConferences));
  }, [selectedConferences]);

  // Functional updater so rapid sequential adds (e.g. deep-link ?ids= hydration)
  // never drop conferences due to a stale selectedRef snapshot.
  const addToCompare = useCallback((conf: Conference) => {
    setSelectedConferences((current) => {
      if (current.some((c) => c.id === conf.id)) {
        return current;
      }
      if (current.length >= 4) {
        // Defer alert so we stay pure inside the updater
        queueMicrotask(() => {
          alert('You can only compare up to 4 conferences.');
        });
        return current;
      }
      return [...current, conf];
    });
  }, []);

  const removeFromCompare = useCallback((confId: string) => {
    setSelectedConferences((current) => current.filter(c => c.id !== confId));
  }, []);

  const clearCompare = useCallback(() => setSelectedConferences([]), []);

  const isInCompare = useCallback(
    (confId: string) => selectedConferences.some(c => c.id === confId),
    [selectedConferences]
  );

  // Memoized so consumers don't re-render on every provider render.
  const value = useMemo(
    () => ({ selectedConferences, addToCompare, removeFromCompare, clearCompare, isInCompare }),
    [selectedConferences, addToCompare, removeFromCompare, clearCompare, isInCompare]
  );

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
}

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};