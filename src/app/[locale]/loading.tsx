import { JSX } from 'react';

/**
 * Global loading state for the homepage
 * Provides a skeleton screen for better UX
 */
export default function Loading(): JSX.Element {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center h-16">
          <div className="w-32 h-8 bg-zinc-800 rounded"></div>
          <div className="flex space-x-4">
            <div className="w-20 h-4 bg-zinc-800 rounded"></div>
            <div className="w-20 h-4 bg-zinc-800 rounded"></div>
            <div className="w-20 h-4 bg-zinc-800 rounded"></div>
          </div>
        </div>

        {/* Hero Skeleton */}
        <div className="text-center space-y-4 py-12">
          <div className="w-3/4 h-12 bg-zinc-800 rounded mx-auto"></div>
          <div className="w-1/2 h-6 bg-zinc-800 rounded mx-auto"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="w-1/2 h-6 bg-zinc-800 rounded"></div>
              <div className="w-3/4 h-4 bg-zinc-800 rounded"></div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl"></div>

        {/* Timeline Skeleton */}
        <div className="space-y-12">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-6">
              <div className="w-40 h-10 bg-zinc-800 rounded-full"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-64 bg-zinc-900 border border-zinc-800 rounded-2xl"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
