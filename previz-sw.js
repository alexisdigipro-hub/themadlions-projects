// Camera Previz offline: the network first, the last good copy when there is none.
const CACHE = 'previz-v1'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('message', (e) => {
  // the page lists what it loaded before this worker took over, so the first visit is enough
  const urls = (e.data && e.data.cache) || []
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(urls.map((u) => c.add(u).catch(() => {})))))
})
self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(r, copy))
        }
        return res
      })
      .catch(() => caches.match(r, { ignoreSearch: true, ignoreVary: true }).then((m) => m || Response.error())),
  )
})
