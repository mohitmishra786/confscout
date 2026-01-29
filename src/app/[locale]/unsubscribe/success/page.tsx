'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function UnsubscribeSuccessPage() {
    return (
        <div className="min-h-screen bg-black flex flex-col">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-lg max-w-md w-full shadow-xl">
                    <div className="text-4xl mb-6">👋</div>
                    <h1 className="text-2xl font-bold text-white mb-4">Unsubscribed</h1>
                    <p className="text-zinc-400 mb-8">
                        You have been successfully unsubscribed. You will no longer receive emails from us.
                    </p>
                    <p className="text-zinc-500 text-sm mb-6">
                        We sent you a confirmation email just to be sure.
                    </p>
                    <Link
                        href="/"
                        className="inline-block bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-6 rounded-lg transition-colors border border-zinc-700"
                    >
                        Return Home
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
}
