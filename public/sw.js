// RainSweep service worker: installable shell, offline reading of recently viewed
// mail, and notification clicks. Mail is cached only on this device and is
// wiped on sign-out (see clearOfflineMail in the app).

const VERSION = 'v1'
const SHELL_CACHE = `mc-shell-${VERSION}`
const STATIC_CACHE = `mc-static-${VERSION}`
const API_CACHE = 'mc-api'

const SHELL_URLS = ['/icon.svg', '/manifest.webmanifest']

// Read-only API routes worth keeping for offline reading.
const CACHEABLE_API = [/^\/api\/labels$/, /^\/api\/threads(\/[^/]+)?$/, /^\/api\/account$/]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE, API_CACHE])
    for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key)
    await self.clients.claim()
  })())
})

self.addEventListener('message', event => {
  if (event.data?.type === 'clear-user-data') {
    event.waitUntil(Promise.all([caches.delete(API_CACHE), caches.delete(SHELL_CACHE)]))
  }
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Hashed build assets never change: cache-first.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  if (CACHEABLE_API.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // The app page: network-first, so the last good copy opens offline.
  if (request.mode === 'navigate' && url.pathname === '/mail') {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/mail'))
  }
})

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone())
  return response
}

async function networkFirst(request, cacheName, cacheKey) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    // Never cache redirects (signed out) or errors.
    if (response.ok && !response.redirected) await cache.put(cacheKey ?? request, response.clone())
    return response
  } catch (err) {
    const cached = await cache.match(cacheKey ?? request, { ignoreSearch: Boolean(cacheKey) })
    if (cached) return cached
    throw err
  }
}

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/mail'
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(w => new URL(w.url).pathname === '/mail')
    if (existing) {
      await existing.focus()
      return existing.navigate(target)
    }
    return self.clients.openWindow(target)
  })())
})
