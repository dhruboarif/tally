/* ============================================================
   TALLY PWA — Service Worker
   Caches app files for offline use.
   ============================================================ */

const CACHE_NAME = 'tally-v17';

// Files to cache for offline use (Firebase data still syncs when online)
const STATIC_FILES = [
    './',
    './index.html',
    './index.css',
    './app.js',
    './store.js',
    './voice.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
];

// ---- Install: cache all static files ----
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static files');
            return cache.addAll(STATIC_FILES);
        }).then(() => self.skipWaiting())
    );
});

// ---- Activate: clean old caches ----
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => {
                    console.log('[SW] Deleting old cache:', k);
                    return caches.delete(k);
                })
            )
        ).then(() => self.clients.claim())
    );
});

// ---- Fetch: Network first, fallback to cache ----
self.addEventListener('fetch', (event) => {
    // Skip Firebase requests — they handle their own caching
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('firebase') ||
        event.request.url.includes('gstatic.com') ||
        event.request.url.includes('googleapis.com')) {
        return;
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        // Try network first
        fetch(event.request)
            .then((response) => {
                // Cache the fresh response
                if (response && response.status === 200) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                }
                return response;
            })
            .catch(() => {
                // Network failed — serve from cache
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    // Final fallback
                    return caches.match('./index.html');
                });
            })
    );
});
