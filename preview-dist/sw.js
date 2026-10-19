/* THEMADLIONS Projects · service worker, for push notifications only (no offline cache, so a new
   version of the app is never held back by an old copy).

   A push from the "push" Edge Function carries JSON: { type: 'message' | 'call' | 'missed' | 'test',
   title, body, tag, url, room, callId, from }. url is relative to this worker's folder: the app's
   own chat (#/chat/<room>) or TML Chat's page (chat.html#/chat-window/<room>), whichever app on
   this phone asked for notifications.

   The iPhone takes notifications away from a web app that receives a push and shows nothing, so
   every push shows one. When the conversation it is about is already open on the screen, it is
   shown silently and closed straight away. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

const roomOf = (url) => {
  const m = String(url || '').match(/#\/chat(?:-window)?\/([^?#]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { title: 'THEMADLIONS', body: event.data ? event.data.text() : '' } }
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const looking = d.type === 'message' && wins.some((c) => c.visibilityState === 'visible' && c.focused !== false && roomOf(c.url) === d.room)
    const call = d.type === 'call'
    const opts = {
      body: d.body || '',
      tag: d.tag || undefined,
      renotify: !!d.tag && !looking,
      silent: looking,
      icon: new URL('icons/icon-192.png', self.registration.scope).href,
      badge: new URL('icons/icon-192.png', self.registration.scope).href,
      data: { url: d.url || '', type: d.type || '', callId: d.callId || '', from: d.from || '', room: d.room || '' },
      requireInteraction: call,
      vibrate: call ? [400, 200, 400, 200, 400, 200, 400] : [120],
    }
    await self.registration.showNotification(d.title || 'THEMADLIONS', opts)
    if (looking) {
      const shown = await self.registration.getNotifications({ tag: d.tag })
      shown.forEach((n) => n.close())
    }
    // an app window that is open but in the background hears about the call at once
    if (call) wins.forEach((c) => c.postMessage({ type: 'call-wake', callId: d.callId, from: d.from, room: d.room }))
  })())
})

self.addEventListener('notificationclick', (event) => {
  const d = event.notification.data || {}
  event.notification.close()
  const target = new URL(d.url || '', self.registration.scope).href
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // the same app if it is open (TML Chat for a TML Chat link, the app for the app's)
    const chatLink = /chat\.html/.test(target)
    const win = wins.find((c) => /chat\.html/.test(c.url) === chatLink) || wins[0]
    if (win) {
      await win.focus().catch(() => {})
      win.postMessage({ type: 'open', url: target, callId: d.type === 'call' ? d.callId : '', from: d.from, room: d.room })
      return
    }
    await self.clients.openWindow(target)
  })())
})

// the browser renewed this device's address: ask the app to save the new one next time it opens
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => wins.forEach((c) => c.postMessage({ type: 'resubscribe' }))))
})
