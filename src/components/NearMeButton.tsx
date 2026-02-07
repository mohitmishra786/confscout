'use client';

import { useState } from 'react';

interface NearMeButtonProps {
    onLocationFound: (lat: number, lng: number) => void;
}

export default function NearMeButton({ onLocationFound }: NearMeButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleClick = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onLocationFound(position.coords.latitude, position.coords.longitude);
                setLoading(false);
            },
            (error) => {
                setLoading(false);
                const errorMessages: Record<number, string> = {
                    1: 'Location access denied. Please enable location permissions.',
                    2: 'Location unavailable. Please try again.',
                    3: 'Location request timed out. Please try again.',
                };
                alert(`GEO_ERROR_${error.code}: ${errorMessages[error.code] || 'Unknown error'}`);
            }
        );
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-zinc-700 flex items-center gap-2"
        >
            {loading ? (
                <>
                    <span className="animate-spin">⌛</span> Locating...
                </>
            ) : (
                <>
                    📍 Near Me
                </>
            )}
        </button>
    );
}
