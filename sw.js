const CACHE = 'benim-v1';
const ASSETS = ['./index.html','./manifest.json',
  './icons/icon-192x192.png','./icons/icon-512x512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a).catch(()=>{}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Skip Firebase, Paystack, EmailJS — always live
  if(e.request.method!=='GET'||
     url.hostname.includes('firebase')||
     url.hostname.includes('firebaseio')||
     url.hostname.includes('googleapis')||
     url.hostname.includes('paystack')||
     url.hostname.includes('emailjs')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res&&res.status===200){
          const clone = res.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return res;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
