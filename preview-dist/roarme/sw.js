/* RoarMe as its own app (Alex, 20 Oct): the service worker for /roarme/ only, so the phone can install it.
   No cache: every page and file comes from the network as usual, so a new version is never held back.
   Only when the phone is offline does opening the app show a short note instead of the browser's error. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RoarMe</title>'
  + '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#1f2328;color:#e8eaed;font:16px system-ui,sans-serif;text-align:center">'
  + '<div><strong style="font-size:20px">RoarMe</strong><p style="color:#9aa0a6">No connection. RoarMe opens again as soon as you are back online.</p></div>'

self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
})
