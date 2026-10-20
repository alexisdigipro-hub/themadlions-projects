/* RoarMe as its own app on a phone (Alex, 20 Oct). The page roarme/index.html is RoarMe on its own, with its own
   manifest, icon and service worker, so a phone can put it on the home screen next to the hub. The hub's RoarMe tab
   on a phone opens it; on a computer nothing changes (the tab stays the hub's own RoarMe page).

   What a phone can do:
   - Android / Chrome: the hub's manifest names RoarMe in related_applications, so getInstalledRelatedApps() tells
     whether it is installed. Installed: open /roarme/ and Chrome hands it to the app. Not installed: /roarme/ shows
     an Install RoarMe button on Chrome's own install offer (beforeinstallprompt, caught as early as possible here).
   - iPhone / iPad: Safari has no install offer and cannot tell or open an installed web app, so /roarme/ opens in
     the same tab with a card showing how to Add to Home Screen.
   Nothing about installing ever shows while RoarMe already runs as an app. */

export const isStandalone = () => {
  try { return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true } catch { return false }
}

// iPadOS reports itself as a Mac: a "Mac" with a touch screen is an iPad
export const isIOS = () => {
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1)
}

// this page is roarme/index.html, RoarMe on its own
export const isRoarMeApp = () => /\/roarme\/(index\.html)?$/.test(window.location.pathname)

// /roarme/ next to the hub, wherever the hub lives (hub.themadlions.com/ or a folder on GitHub Pages)
export const roarmeAppUrl = () => `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}roarme/`

/* Chrome's install offer for RoarMe. It can come before React is up, so main.jsx calls this first thing. */
let offer = null
const listeners = new Set()
const tell = () => listeners.forEach((fn) => fn(offer))
export function catchInstallOffer() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); offer = e; tell() })
  window.addEventListener('appinstalled', () => { offer = null; tell() })
}
export const installOffer = () => offer
export const onInstallOffer = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export async function install() {
  const e = offer
  if (!e) return false
  offer = null
  tell()
  e.prompt()
  const choice = await e.userChoice.catch(() => null)
  return choice?.outcome === 'accepted'
}

/* only on /roarme/: the service worker that makes it installable, scoped to /roarme/ */
export function registerRoarMeWorker() {
  if (!isRoarMeApp() || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {})
}

/* Is RoarMe installed on this phone? Chrome on Android only; everywhere else the answer is "can't tell" (false). */
export async function roarmeInstalled() {
  try {
    if (!navigator.getInstalledRelatedApps) return false
    const apps = await navigator.getInstalledRelatedApps()
    return apps.some((a) => a.platform === 'webapp' && /\/roarme\/manifest\.webmanifest$/.test(a.url || ''))
  } catch { return false }
}

/* The install card's "Done" (never again) and "Not now" (a week) */
const HIDE_KEY = 'roarme_install_card'
const WEEK = 7 * 24 * 60 * 60 * 1000
export function cardHidden() {
  try {
    const v = localStorage.getItem(HIDE_KEY)
    if (!v) return false
    if (v === 'done') return true
    return Date.now() < Number(v)
  } catch { return false }
}
export function hideCard(forGood) {
  try { localStorage.setItem(HIDE_KEY, forGood ? 'done' : String(Date.now() + WEEK)) } catch {}
}
