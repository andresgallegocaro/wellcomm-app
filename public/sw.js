// Service Worker desactivado — solo mantiene la PWA instalable
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  )
  self.clients.claim()
})
// No intercepta ninguna petición fetch
