'use client';

import { useEffect } from 'react';

/**
 * Registers the production service worker (issue #74).
 * Skipped in development to avoid stale Turbopack assets.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (err) {
        console.warn('[sw] registration failed', err);
      }
    };

    // Defer until idle so it does not contend with hydration.
    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(() => void register());
    } else {
      globalThis.setTimeout(() => void register(), 2000);
    }
  }, []);

  return null;
}
