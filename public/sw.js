/*
 * FullScreenTimer service worker.
 *
 * Hand-rolled on purpose: no build-time plugin, no Workbox, no extra dependency.
 * Vite emits content-hashed asset filenames that a static precache list could not
 * know about, so the strategy is:
 *
 *   - precache the app shell (navigation entry + manifest + icons) at install time
 *   - cache-first for hashed build assets: they are immutable, so a hit is always correct
 *   - network-first for navigations, falling back to the cached shell when offline
 *
 * After the first successful load every asset the app touched lives in the cache,
 * which is what "works fully offline after the first load" requires.
 */

const VERSION = 'v1'
const CACHE = `fullscreentimer-${VERSION}`

const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // Individually, so one 404 cannot abort the whole install.
      await Promise.all(
        SHELL.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined),
        ),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.disable().catch(() => undefined)
      }
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

/** Hashed Vite output: `name-DEADBEEF.js`. Safe to serve from cache forever. */
function isImmutableAsset(url) {
  return /\/assets\/.+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(url.pathname)
}

function isCacheableAsset(url) {
  return (
    isImmutableAsset(url) ||
    /\.(?:css|js|woff2?|png|svg|ico|webmanifest|json)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations: fresh when online, cached shell when not.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put('/index.html', response.clone()).catch(() => undefined)
          return response
        } catch {
          const cache = await caches.open(CACHE)
          return (
            (await cache.match('/index.html')) ??
            (await cache.match('/')) ??
            new Response('Offline', { status: 503, statusText: 'Offline' })
          )
        }
      })(),
    )
    return
  }

  if (!isCacheableAsset(url)) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(request)
      if (cached) {
        // Immutable assets never need revalidating; everything else refreshes in the background.
        if (!isImmutableAsset(url)) {
          event.waitUntil(
            fetch(request)
              .then((response) => (response.ok ? cache.put(request, response) : undefined))
              .catch(() => undefined),
          )
        }
        return cached
      }

      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone()).catch(() => undefined)
      return response
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow('/')
    })(),
  )
})
