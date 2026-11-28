/* THEMADLIONS Projects · the hub has no chat and no push notifications any more (Alex, 25 Nov 2026).
   A phone or computer that still has the old worker gets this one on its next visit: it removes itself. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  await self.registration.unregister()
  const wins = await self.clients.matchAll({ type: 'window' })
  wins.forEach((c) => c.navigate(c.url).catch(() => {}))
})()))
