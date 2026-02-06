'use client';

import { useState } from 'react';
import { DOMAIN_INFO } from '@/types/conference';
import { secureFetch } from '@/lib/api';

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SubscribeModal({ isOpen, onClose }: SubscribeModalProps) {
    const [email, setEmail] = useState('');
    const [domain, setDomain] = useState('all');
    const [frequency, setFrequency] = useState('weekly');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const res = await secureFetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    preferences: { domain: domain === 'all' ? undefined : domain },
                    frequency
                })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(data.message || 'Subscribed successfully!');
                setTimeout(onClose, 3000);
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong');
            }
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-6 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                >
                    ✕
                </button>

                <h2 className="text-2xl font-bold mb-2 text-white">Get Updates</h2>
                <p className="text-zinc-400 mb-6 text-sm">
                    Receive curated updates of upcoming conferences and CFPs delivered to your inbox.
                </p>

                {status === 'success' ? (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">✨</div>
                        <h3 className="text-xl font-bold text-white mb-2">All set!</h3>
                        <p className="text-zinc-400">{message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Interest</label>
                                <select
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="all">All Domains</option>
                                    {Object.entries(DOMAIN_INFO).map(([slug, info]) => (
                                        <option key={slug} value={slug}>{info.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1">Frequency</label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                        </div>

                        {status === 'error' && (
                            <div className="text-red-400 text-sm">{message}</div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? 'Subscribing...' : 'Get Updates'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
