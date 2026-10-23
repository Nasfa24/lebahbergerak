/* Service worker Lebah Bergerak
   Aturan: halaman HTML selalu ambil dari jaringan dulu supaya perbaikan
   langsung terpakai, cache hanya jadi cadangan saat offline.
   Permintaan ke Supabase tidak pernah disimpan di cache. */

const CACHE = 'lebah-shell-v3';
const SHELL = [
  './dashboard.html',
  './index.html',
  './leaderboard.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Jangan pernah cache API Supabase, data harus selalu segar
  if (url.hostname.includes('supabase.co')) return;

  // Halaman: network first, fallback cache
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const salinan = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, salinan)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./dashboard.html')))
    );
    return;
  }

  // Aset statis: cache first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const salinan = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, salinan)).catch(() => {});
        return res;
      }).catch(() => hit))
    );
  }
});
