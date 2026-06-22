// public/sw.js

self.addEventListener('install', (event) => {
    console.log('[Magginos] Service Worker Installed');
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
    console.log('[Magginos] Service Worker Activated');
  });
  
  self.addEventListener('fetch', (event) => {
    // Pass through all requests normally
    event.respondWith(fetch(event.request));
  });