// public/sw.js
// Maggino's Service Worker — Cache-First for static assets, Network-First for API calls

// Bump this version string on every deploy to invalidate old caches
const CACHE_NAME = 'magginos-v1';

const MAX_CACHE_SIZE = 50;

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/logo.png',
  '/favicon.svg',
  '/manifest.json',
];

/**
 * Trim cache to MAX_CACHE_SIZE by removing the oldest entries first.
 */
async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxSize) {
    await cache.delete(keys[0]);
    // Recurse until within limit
    await trimCache(cacheName, maxSize);
  }
}

self.addEventListener('install', (event) => {
  console.log('[Magginos SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Magginos SW] Activated');
  // Clean up old caches from previous versions
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. Firestore writes)
  if (request.method !== 'GET') return;

  // Skip Firebase/Firestore API calls — always go to network
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  // For navigation requests (HTML pages) — Network-First with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/').then((root) => {
              if (root) return root;
              // Offline fallback when both network and cache fail
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline – Maggino\'s</title></head>' +
                '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;text-align:center;padding:2rem">' +
                '<div><h1 style="font-size:1.5rem;margin-bottom:0.5rem">You\'re Offline</h1>' +
                '<p style="color:#94a3b8;font-size:0.875rem;margin-bottom:1.5rem">Check your connection and try again.</p>' +
                '<button onclick="location.reload()" style="background:#f97316;color:#fff;border:none;padding:0.75rem 2rem;border-radius:1rem;font-weight:700;cursor:pointer">Retry</button></div>' +
                '</body></html>',
                { status: 503, headers: { 'Content-Type': 'text/html' } }
              );
            });
          })
        )
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts) — Cache-First with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Only cache successful responses from same-origin or known CDNs
        if (response.ok && (url.origin === self.location.origin || url.hostname.includes('fonts.googleapis.com'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
            trimCache(CACHE_NAME, MAX_CACHE_SIZE);
          });
        }
        return response;
      });
    })
  );
});