const CACHE_NAME = 'wellcomm-v2'

self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') return

  // No interceptar NADA — dejar pasar todo al servidor
  // El SW solo existe para habilitar la instalación PWA
  event.respondWith(fetch(event.request))
})
