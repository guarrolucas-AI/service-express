// Express Service — Service Worker
// Maneja caché offline + notificaciones push

const CACHE = 'express-v1'
const OFFLINE_PAGES = ['/cliente', '/mecanico/login']

// ── Install: cachear páginas clave ─────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(OFFLINE_PAGES).catch(() => {})
    )
  )
})

// ── Activate: limpiar cachés viejos ────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  )
})

// ── Fetch: network-first con fallback a caché ──────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Sólo GET; ignorar extensiones de Next.js y APIs
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/_next/')) return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cachear respuestas OK de páginas propias
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('/cliente')))
  )
})

// ── Push: mostrar notificación ─────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let data
  try { data = event.data.json() } catch { return }

  const options = {
    body:    data.body   || 'Tu servicio fue actualizado',
    icon:    '/icons/192',
    badge:   '/icons/192',
    vibrate: [200, 100, 200],
    tag:     data.tag    || 'express-update',
    renotify: true,
    data:    { url: data.url || '/cliente' },
    actions: [
      { action: 'open', title: 'Ver detalle' },
      { action: 'close', title: 'Cerrar' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Express Service', options)
  )
})

// ── Notification click: abrir URL ─────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'close') return

  const url = event.notification.data?.url || '/cliente'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const match = wins.find(w => w.url.includes(url))
      if (match) return match.focus()
      return clients.openWindow(url)
    })
  )
})
