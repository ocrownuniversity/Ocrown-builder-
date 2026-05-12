// BENIM Trade Service Worker
const CACHE_NAME = 'benim-trade-v1';
const STATIC_CACHE = 'benim-static-v1';

// Core assets to cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// ===== INSTALL =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache what we can, ignore failures (CDN etc)
      return Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Skip Firebase, Paystack, EmailJS — always go network
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firebaseio') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('paystack') ||
    url.hostname.includes('emailjs') ||
    url.hostname.includes('api.')
  ) {
    return; // Let browser handle it normally
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        // Cache fonts and CDN assets
        if (
          url.hostname.includes('fonts.googleapis') ||
          url.hostname.includes('fonts.gstatic') ||
          url.hostname.includes('cdnjs.cloudflare')
        ) {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, cloned));
        }

        // Cache the main index.html
        if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
        }

        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ===== PUSH NOTIFICATIONS (future use) =====
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'BENIM Trade', {
    body: data.body || 'You have a new update',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    data: { url: data.url || './' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || './')
  );
});
