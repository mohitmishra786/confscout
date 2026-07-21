'use client';

/**
 * TimelineView Component
 * 
 * Month-grouped timeline display of conferences with sticky headers.
 */

import type { Conference } from '@/types/conference';
import ConferenceCard from './ConferenceCard';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Hoisted to module level — was re-created on every sort comparison.
function parseMonthYear(str: string): number {
    if (str === 'TBD') return Number.MAX_SAFE_INTEGER;
    const [mName, year] = str.split(' ');
    return new Date(parseInt(year), MONTH_NAMES.indexOf(mName), 1).getTime();
}

interface TimelineViewProps {
    months: Record<string, Conference[]>;
    speakerMode?: boolean;
}

export default function TimelineView({ months, speakerMode = false }: TimelineViewProps) {
    // Get sorted month keys
    const sortedMonths = Object.keys(months).sort((a, b) => parseMonthYear(a) - parseMonthYear(b));

    // Filter for speaker mode (only open CFPs)
    const filteredMonths = speakerMode
        ? sortedMonths.reduce((acc, month) => {
            const filtered = months[month].filter(c => c.cfp?.status === 'open');
            if (filtered.length > 0) {
                acc[month] = filtered;
            }
            return acc;
        }, {} as Record<string, Conference[]>)
        : months;

    const displayMonths = speakerMode
        ? Object.keys(filteredMonths).sort((a, b) => parseMonthYear(a) - parseMonthYear(b))
        : sortedMonths;

    if (displayMonths.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                No conferences found matching your criteria.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {displayMonths.map(month => {
                const confs = filteredMonths[month] || months[month];
                if (!confs || confs.length === 0) return null;

                return (
                    <div key={month} className="relative">
                        {/* Month Header - Sticky */}
                        <div className="sticky top-16 z-10 py-2 mb-4">
                            <div className="inline-flex items-center gap-3 bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700">
                                <h2 className="text-xl font-bold text-white">{month}</h2>
                                <span className="text-sm text-gray-400 tabular-nums">
                                    {confs.length} conference{confs.length !== 1 ? 's' : ''}
                                </span>
                                {speakerMode && (
                                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                        Open CFPs
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Conference Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {confs.map((conf) => (
                                <ConferenceCard key={conf.id} conference={conf} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
