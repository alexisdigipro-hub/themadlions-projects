import { SUPABASE_URL, supabase } from './lib.js'

/* Notifications with the chat closed (from RoarMe, Alex 18 Oct): Web Push on phones and browsers (the Edge Function
   roar-push and the table roar_push_subs). In the hub (Alex, 1 Nov 2026) the chat has a service worker of its own,
   public/hubchat/sw.js with the scope /hubchat/, so it never touches the hub's own worker (/sw.js) or the hub's own
   push sign-up. Until roar-push and its VAPID key are set up in the hub's Supabase, turning it on only says that the
   server did not answer; nothing breaks. */

const FN = `${SUPABASE_URL}/functions/v1/roar-push`
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))

export const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const onPhone = () => isIOS() || /Android/i.test(navigator.userAgent)
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
export const pushSupported = () => typeof window !== 'undefined' && !window.roarDesktop && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined'
export const badgeSupported = () => typeof navigator !== 'undefined' && 'setAppBadge' in navigator && !window.roarDesktop

const SW = './hubchat/sw.js'
const SCOPE = './hubchat/'
// the chat's own worker, running (this page is not in its scope, so navigator.serviceWorker.ready is not waited on)
const registration = async () => {
  const reg = await navigator.serviceWorker.register(SW, { scope: SCOPE })
  const w = reg.installing || reg.waiting
  if (w && !reg.active) {
    await new Promise((ok) => {
      const t = setTimeout(ok, 10000)
      w.addEventListener('statechange', () => { if (w.state === 'activated' || w.state === 'redundant') { clearTimeout(t); ok() } })
    })
  }
  return reg
}
const current = async () => {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration(SCOPE)
  return reg ? reg.pushManager.getSubscription() : null
}
const keep = async (sub, preview) => {
  const j = sub.toJSON()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('roar_push_subs').upsert({ endpoint: j.endpoint, user_id: user.id, p256dh: j.keys.p256dh, auth: j.keys.auth, preview: !!preview, ua: navigator.userAgent.slice(0, 290) })
  if (error) throw error
}

export async function pushIsOn() {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  return !!(await current())
}

export async function pushOn(preview) {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked for the hub. Allow them in the settings of this phone or browser.' : 'Notifications were not allowed.')
  // the server's public key first: without it (roar-push not set up in the hub yet) nothing is touched
  let key = ''
  try { const res = await fetch(`${FN}?key`); if (res.ok) key = (await res.json())?.key || '' } catch { /* no server */ }
  if (!key) throw new Error('The notification server did not answer. Notifications with the chat closed are not set up in the hub yet.')
  const reg = await registration()
  // a fresh sign-up each time, so an old one (another account on this browser) never lingers
  const old = await reg.pushManager.getSubscription()
  if (old) { try { await old.unsubscribe() } catch { /* already gone */ } }
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(key) })
  await keep(sub, preview)
}

export async function pushOff() {
  const sub = await current()
  if (!sub) return
  await supabase.from('roar_push_subs').delete().eq('endpoint', sub.endpoint)
  try { await sub.unsubscribe() } catch { /* already gone */ }
}

// on every start: the server still knows this browser (and whether the text may show)
export async function pushSync(preview) {
  try {
    if (Notification.permission !== 'granted') return
    const sub = await current()
    if (sub) { await registration(); await keep(sub, preview) }
  } catch { /* offline, or not signed in yet */ }
}

// the unread count on the Home Screen icon while RoarMe is open (the service worker sets it while closed)
export function setBadge(n) {
  if (!badgeSupported()) return
  try { if (n > 0) navigator.setAppBadge(n); else navigator.clearAppBadge() } catch { /* not here */ }
}

// Settings > Send Test: after 5 seconds a test notification to each of your devices; says what each push service answered
export async function pushTest() {
  const { data, error } = await supabase.functions.invoke('roar-push', { body: { test: true } })
  if (error) {
    let msg = error.message
    try { msg = (await error.context.json()).error || msg } catch { /* plain error */ }
    throw new Error(msg)
  }
  return data?.results || []
}
