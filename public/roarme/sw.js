/* RoarMe left the hub on 1 Nov 2026: the old /roarme/ service worker takes itself away on its next update check. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.registration.unregister()))
