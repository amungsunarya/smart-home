const CACHE = 'smart-home-v1';
const ASSETS = [
  '/', '/index.html', '/style.css', '/app.js',
  '/manifest.json', '/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  // Jangan cache API / websocket
  if (e.request.url.includes('/api/') || e.request.url.includes('/mqtt')) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});