/* The hub's chat · its own service worker, for notifications with the chat closed (RoarMe's sw.js, Alex 1 Nov 2026).
   Registered by hubchat/push.js with the scope /hubchat/, apart from the hub's own worker (/sw.js), so the two never
   meet. A push (from the Edge Function roar-push, once it is set up in the hub's Supabase) shows the message and puts
   the unread count on the icon; a tap opens the hub's Chat page at that chat (#/chat?c=<chat>). No files are cached. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data ? e.data.text() : '' } }
  e.waitUntil((async () => {
    if (typeof d.count === 'number' && self.navigator && 'setAppBadge' in self.navigator) {
      try { if (d.count > 0) await self.navigator.setAppBadge(d.count); else await self.navigator.clearAppBadge() } catch { /* no badge here */ }
    }
    await self.registration.showNotification(d.title || 'THEMADLIONS Chat', {
      body: d.body || 'New message',
      tag: d.tag || 'hubchat',
      renotify: true,
      icon: new URL('../icons/icon-192.png', self.registration.scope).href,
      badge: new URL('../icons/icon-192.png', self.registration.scope).href,
      data: { room: d.room || '' },
    })
  })())
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const room = (e.notification.data && e.notification.data.room) || ''
  const hub = new URL('../', self.registration.scope).href
  const url = `${hub}#/chat${/^[0-9a-f-]{36}$/.test(room) ? `?c=${room}` : ''}`
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = list.find((c) => c.url.startsWith(hub) && !/hubchat\.html/.test(c.url))
    if (open) {
      await open.focus().catch(() => {})
      open.postMessage({ type: 'hubchat:open', room })
      return
    }
    await self.clients.openWindow(url)
  })())
})
