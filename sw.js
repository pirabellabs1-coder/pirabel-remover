// Service Worker minimal - network-first pour éviter les problèmes de cache
const CACHE_NAME = 'pirabel-v3-supabase';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Pas de cache du tout - toujours network
  // Ça évite tout problème de version obsolète
  return;
});
