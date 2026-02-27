// ☕ Chai Group Manager — Service Worker
const CACHE_NAME = 'chai-group-v10';
const BASE = '/canteen';

const SHELL_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png',
];

// ── INSTALL ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        SHELL_ASSETS.map(url => cache.add(url).catch(err => console.warn('[SW] Could not cache:', url)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: delete ALL old caches immediately ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Network first for HTML - always get fresh index.html ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase — always network
  if (url.includes('firestore.googleapis.com') || url.includes('firebase') ||
      url.includes('googleapis.com') || url.includes('gstatic.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // index.html — ALWAYS network first (fresh code hamesha mile)
  if (url.endsWith('/canteen/') || url.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Baaki — cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});