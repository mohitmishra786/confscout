'use client';

import { useState } from 'react';
import type { Conference } from '@/types/conference';
import ConferenceCard from '@/components/ConferenceCard';
import { secureFetch } from '@/lib/api';

interface TrackedEvent {
  id: string;
  conferenceId: string;
  status: string; // saved, applied, accepted, rejected
  conference: Conference;
}

interface DashboardClientProps {
  initialEvents: TrackedEvent[];
}

const STATUS_LABELS: Record<string, string> = {
  saved: '🔖 Saved',
  applied: '📝 Applied',
  accepted: '✅ Accepted',
  rejected: '❌ Rejected',
};

export default function DashboardClient({ initialEvents }: DashboardClientProps) {
  const [events, setEvents] = useState<TrackedEvent[]>(initialEvents);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateStatus = async (bookmarkId: string, newStatus: string) => {
    setUpdatingId(bookmarkId);
    try {
      const res = await secureFetch('/api/user/bookmarks/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarkId, status: newStatus }),
      });

      if (!res.ok) throw new Error('Update failed');

      setEvents(prev => 
        prev.map(e => e.id === bookmarkId ? { ...e, status: newStatus } : e)
      );
    } catch {
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const grouped = {
    saved: events.filter(e => e.status === 'saved'),
    applied: events.filter(e => e.status === 'applied'),
    accepted: events.filter(e => e.status === 'accepted'),
    rejected: events.filter(e => e.status === 'rejected'),
  };

  return (
    <div className="space-y-12">
      {/* Kanban Board Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(Object.keys(grouped) as Array<keyof typeof grouped>).map((status) => (
          <div key={status} className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="font-bold text-zinc-500 uppercase tracking-wider text-sm">
                {STATUS_LABELS[status]} ({grouped[status].length})
              </h2>
            </div>
            
            <div className="flex flex-col gap-4 min-h-[200px] p-2 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
              {grouped[status].length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-zinc-700 text-xs italic">
                  No events
                </div>
              ) : (
                grouped[status].map((item) => (
                  <div key={item.id} className="relative group">
                    <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        value={item.status}
                        disabled={updatingId === item.id}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                        className="bg-black border border-zinc-700 text-[10px] rounded px-1 py-0.5 outline-none cursor-pointer"
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className={updatingId === item.id ? 'opacity-50 pointer-events-none' : ''}>
                      <ConferenceCard conference={item.conference} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}