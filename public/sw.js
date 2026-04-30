const CACHE_PREFIX = "powerhouse"
const STATIC_CACHE_PREFIX = `${CACHE_PREFIX}-static`
const VERSION_URL = "/version.json"
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
]

async function currentVersion() {
  try {
    const response = await fetch(VERSION_URL, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    })

    if (!response.ok) return "dev"

    const data = await response.json()
    return typeof data.version === "string" ? data.version : "dev"
  } catch {
    return "dev"
  }
}

async function staticCacheName() {
  return `${STATIC_CACHE_PREFIX}-${await currentVersion()}`
}

async function cleanupOutdatedCaches() {
  const activeStaticCache = await staticCacheName()
  const cacheNames = await caches.keys()

  await Promise.all(
    cacheNames
      .filter(
        (cacheName) =>
          cacheName.startsWith(CACHE_PREFIX) && cacheName !== activeStaticCache
      )
      .map((cacheName) => caches.delete(cacheName))
  )
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(await staticCacheName())

      await cache.addAll(
        PRECACHE_ASSETS.map(
          (asset) => new Request(asset, { cache: "reload" })
        )
      )
      await self.skipWaiting()
    })()
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await cleanupOutdatedCaches()
      await self.clients.claim()
    })()
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil(cleanupOutdatedCaches())
  }
})

self.addEventListener("fetch", (event) => {
  const request = event.request

  if (request.method !== "GET") return

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(fetch(request))
    return
  }

  if (
    url.pathname === VERSION_URL ||
    url.pathname === "/sw.js" ||
    url.pathname === "/manifest.json" ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(fetch(request))
    return
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request)

      if (cachedResponse) return cachedResponse

      const response = await fetch(request)

      if (response.ok && PRECACHE_ASSETS.includes(url.pathname)) {
        const cache = await caches.open(await staticCacheName())
        await cache.put(request, response.clone())
      }

      return response
    })()
  )
})
