'use client';

/**
 * WorldMap Component
 * 
 * Displays conferences on an interactive world map using react-leaflet.
 * Uses dynamic import with SSR disabled.
 */

import { useEffect, useState } from 'react';
import type { Conference } from '@/types/conference';
import 'leaflet/dist/leaflet.css';

type MappableConference = Pick<Conference, 'id' | 'name' | 'location' | 'domain' | 'startDate' | 'endDate' | 'cfp' | 'url'>;

interface WorldMapProps {
    conferences: MappableConference[];
    center?: [number, number];
    zoom?: number;
    onMarkerClick?: (conference: MappableConference) => void;
}

/* eslint-disable @typescript-eslint/consistent-type-imports */
type LeafletModule = typeof import('react-leaflet');
type LeafletClusterModule = typeof import('react-leaflet-cluster');

type LeafletComponents = {
    MapContainer: LeafletModule['MapContainer'];
    TileLayer: LeafletModule['TileLayer'];
    CircleMarker: LeafletModule['CircleMarker'];
    Popup: LeafletModule['Popup'];
    Marker: LeafletModule['Marker'];
    useMap: LeafletModule['useMap'];
};

function MapContainerComponent({ conferences, center, zoom, onMarkerClick }: WorldMapProps) {
    const [components, setComponents] = useState<LeafletComponents | null>(null);
    const [MarkerClusterGroup, setMarkerClusterGroup] = useState<LeafletClusterModule['default'] | null>(null);

    useEffect(() => {
        Promise.all([
            import('react-leaflet'),
            import('react-leaflet-cluster')
        ]).then(([m, c]) => {
            setComponents({
                MapContainer: m.MapContainer,
                TileLayer: m.TileLayer,
                CircleMarker: m.CircleMarker,
                Popup: m.Popup,
                Marker: m.Marker,
                useMap: m.useMap,
            });
            setMarkerClusterGroup(() => c.default);
        });
    }, []);

    if (!components || !MarkerClusterGroup) {
        return (
            <div className="w-full h-[600px] bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-gray-400">Loading map...</div>
            </div>
        );
    }

    const { MapContainer, TileLayer, CircleMarker, Popup, useMap } = components;

    // Inner component to handle view updates using the map instance
    const MapController = ({ center, zoom }: { center?: [number, number]; zoom?: number }) => {
        const map = useMap();
        useEffect(() => {
            if (center) {
                map.flyTo(center, zoom || 6, { duration: 1.5 });
            }
        }, [center, zoom, map]);
        return null;
    };

    // Filter conferences with valid coordinates
    const mappableConferences = conferences.filter(
        c => c.location?.lat && c.location?.lng
    );

    // Get marker color based on domain
    const getDomainColor = (domain: string): string => {
        const colors: Record<string, string> = {
            ai: '#8B5CF6',
            software: '#3B82F6',
            security: '#EF4444',
            web: '#10B981',
            mobile: '#F59E0B',
            cloud: '#06B6D4',
            data: '#EC4899',
            devops: '#8B5CF6',
            opensource: '#22C55E',
            academic: '#6366F1',
            general: '#6B7280',
        };
        return colors[domain] || '#6B7280';
    };

    return (
        <MapContainer
            center={center || [20, 0]}
            zoom={zoom || 2.5}
            minZoom={2}
            style={{ height: '600px', width: '100%', borderRadius: '0.5rem', zIndex: 0 }}
            scrollWheelZoom={true}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />

            <MapController center={center} zoom={zoom} />

            <MarkerClusterGroup
                chunkedLoading
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
                maxClusterRadius={40}
            >
                {mappableConferences.map((conf, idx) => (
                    <CircleMarker
                        key={`${conf.id}-${idx}`}
                        center={[conf.location.lat!, conf.location.lng!]}
                        radius={8}
                        pathOptions={{
                            fillColor: getDomainColor(conf.domain),
                            fillOpacity: 0.8,
                            color: '#fff',
                            weight: 2,
                        }}
                        eventHandlers={{
                            click: () => onMarkerClick?.(conf),
                        }}
                    >
                        <Popup className="custom-popup" closeButton={false}>
                            <div className="p-3 min-w-[200px] text-zinc-900">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-white mb-2`} style={{ backgroundColor: getDomainColor(conf.domain) }}>
                                    {conf.domain.toUpperCase()}
                                </span>
                                <h3 className="font-bold text-lg leading-tight mb-1">{conf.name}</h3>
                                <p className="text-sm text-gray-600 mb-2 truncate">{conf.location.raw}</p>

                                <div className="flex items-center gap-2 mb-3 text-xs font-medium text-gray-500">
                                    <span>{conf.startDate}</span>
                                    {conf.cfp?.status === 'open' && (
                                        <span className="text-green-600">Consider submitting</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <a
                                        href={conf.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-center px-3 py-1.5 bg-zinc-900 text-white text-xs rounded hover:bg-zinc-700 transition-colors"
                                    >
                                        Website
                                    </a>
                                    <a
                                        href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(conf.name)}&dates=${conf.startDate?.replace(/-/g, '')}/${conf.endDate?.replace(/-/g, '')}&details=${encodeURIComponent(conf.url)}&location=${encodeURIComponent(conf.location.raw)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-center px-3 py-1.5 border border-zinc-200 text-zinc-600 text-xs rounded hover:bg-zinc-50 transition-colors"
                                    >
                                        Add to Cal
                                    </a>
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
}

export default function WorldMap(props: WorldMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <div className="w-full h-[600px] bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-gray-400">Loading map...</div>
            </div>
        );
    }

    return <MapContainerComponent {...props} />;
}
