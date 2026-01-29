'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Conference } from '@/types/conference';

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

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('compare_conferences');
    if (saved) {
      try {
        setSelectedConferences(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved comparisons', e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('compare_conferences', JSON.stringify(selectedConferences));
  }, [selectedConferences]);

  const addToCompare = (conf: Conference) => {
    if (selectedConferences.length >= 4) {
      alert("You can only compare up to 4 conferences.");
      return;
    }
    if (!selectedConferences.find(c => c.id === conf.id)) {
      setSelectedConferences([...selectedConferences, conf]);
    }
  };

  const removeFromCompare = (confId: string) => {
    setSelectedConferences(selectedConferences.filter(c => c.id !== confId));
  };

  const clearCompare = () => setSelectedConferences([]);

  const isInCompare = (confId: string) => selectedConferences.some(c => c.id === confId);

  return (
    <CompareContext.Provider value={{ selectedConferences, addToCompare, removeFromCompare, clearCompare, isInCompare }}>
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