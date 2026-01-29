'use client';
import { useCompare } from '@/context/CompareContext';
import Link from 'next/link';

export default function CompareBar() {
  const { selectedConferences, removeFromCompare, clearCompare } = useCompare();

  if (selectedConferences.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-700 rounded-full shadow-2xl p-2 px-6 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in">
      <div className="flex -space-x-2">
        {selectedConferences.map(c => (
          <div key={c.id} className="relative group">
             <div 
               className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white border-2 border-zinc-900 truncate"
               title={c.name}
             >
               {c.name.substring(0, 2).toUpperCase()}
             </div>
             <button
               onClick={() => removeFromCompare(c.id)}
               className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
             >
               ×
             </button>
          </div>
        ))}
      </div>
      <div className="text-sm text-zinc-300 whitespace-nowrap">
        {selectedConferences.length} selected
      </div>
      <div className="h-6 w-px bg-zinc-700 mx-2"></div>
      <Link href="/compare" className="text-sm font-bold text-blue-400 hover:text-blue-300">
        Compare
      </Link>
      <button onClick={clearCompare} className="text-xs text-zinc-500 hover:text-zinc-300 ml-2">
        Clear
      </button>
    </div>
  );
}