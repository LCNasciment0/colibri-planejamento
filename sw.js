const CACHE_NAME = 'colibri-v1';
const ASSETS_ESTATICOS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/supabase.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/planejamentos.js',
  '/js/agenda.js',
  '/js/calendario.js',
  '/js/pdf.js',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_ESTATICOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith('http')) return;

  // Requisições Supabase: network-first (dados sempre frescos)
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets estáticos: cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
