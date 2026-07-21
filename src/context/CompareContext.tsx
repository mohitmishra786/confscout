'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Conference } from '@/types/conference';
import { isValidConference } from '@/lib/validation';

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
    try {
      const saved = sessionStorage.getItem('compare_conferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validated = parsed.filter(isValidConference);
          setSelectedConferences(validated);
        }
      }
    } catch {
      console.warn('Failed to load compare data from storage');
    }
  }, []);

  // Save to session storage on change
  useEffect(() => {
    try {
      sessionStorage.setItem('compare_conferences', JSON.stringify(selectedConferences));
    } catch {
      console.warn('Failed to save compare data to storage');
    }
  }, [selectedConferences]);

  // Latest-value ref so addToCompare stays stable without stale closures.
  const selectedRef = useRef(selectedConferences);
  useEffect(() => {
    selectedRef.current = selectedConferences;
  }, [selectedConferences]);

  const addToCompare = useCallback((conf: Conference) => {
    const current = selectedRef.current;
    if (current.length >= 4) {
      alert("You can only compare up to 4 conferences.");
      return;
    }
    if (current.find(c => c.id === conf.id)) return;
    setSelectedConferences([...current, conf]);
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