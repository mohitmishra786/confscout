/* ConfScouting service worker (issue #74)
 * Cache-first for static shell assets; network-first for HTML navigations.
 * Never caches /api, auth, or private/no-store responses.
 */
const cachePrefix = 'confscout-shell-';
const cacheVersion = `${cachePrefix}v1`;
const precache = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icon.png',
  '/logo.svg',
];

function isCacheableNavigationResponse(response) {
  if (!response || !response.ok) return false;
  // Do not store redirects (may carry auth cookies / session paths)
  if (response.type === 'opaqueredirect' || response.redirected) return false;
  const cc = (response.headers.get('Cache-Control') || '').toLowerCase();
  if (cc.includes('private') || cc.includes('no-store') || cc.includes('no-cache')) {
    return false;
  }
  // Only explicit public or default public shell responses
  if (cc.includes('public') || cc === '') {
    return true;
  }
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(cacheVersion)
      .then((cache) => cache.addAll(precache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          // Only delete our versioned shell caches — leave unrelated caches alone
          keys
            .filter((k) => k.startsWith(cachePrefix) && k !== cacheVersion)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept API / auth / monitoring
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/monitoring') ||
    url.pathname.includes('next-auth') ||
    url.pathname.includes('/auth/')
  ) {
    return;
  }

  // Navigations: network first. Cache only public shell HTML.
  // Fallback uses only the precached public shell ("/") — never a
  // previously cached authenticated page for another user.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheableNavigationResponse(response)) {
            const copy = response.clone();
            // Only ever precache the public home shell, not arbitrary URLs
            // that might reflect account-specific content.
            if (url.pathname === '/' || url.pathname === '/en') {
              caches.open(cacheVersion).then((cache) => cache.put('/', copy));
            }
          }
          return response;
        })
        .catch(() => caches.match('/') )
    );
    return;
  }

  // Static assets: cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(cacheVersion).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});
