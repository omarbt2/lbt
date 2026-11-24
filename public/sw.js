const CACHE_NAME = 'lbt-social-v3-network-first-shell';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/web/icon-192.png',
  '/web/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase')) return;

  // Always ask the network for the app shell. A cache-first index.html can
  // keep an old landing screen or old JavaScript alive after an APK update.
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match('/index.html') || await caches.match('/');
        return cached || Response.error();
      })
    );
    return;
  }

  // Static hashed assets are safe to serve from cache first; update the cache
  // in the background when a newer response is available.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
      return cached || network;
    })
  );
});
