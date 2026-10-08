// Push notifications on this device: the service worker (public/sw.js), the subscription saved in
// push_subscriptions (supabase/push.sql), and the "push" Edge Function that sends
// (supabase/functions/push/index.ts). A message or a call asks the function to ring the others;
// the function checks, with the sender's own token, that it is really theirs.
import { remote, supabase } from './supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js'

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const isIos = () => typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
/* An iPhone only lets a web app ring when it is opened from the home screen. */
export const needsHomeScreen = () => isIos() && !standalone()
const app = () => (/chat\.html$/.test(window.location.pathname) ? 'chat' : 'main')

let missing = false // the function is not deployed: stop asking for this session
async function call(action, body = {}) {
  if (!remote || !supabase || missing) return null
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return null
  const res = await fetch(`${SUPABASE_URL}/functions/v1/push`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
    keepalive: true,
  })
  if (res.status === 404) { missing = true; throw new Error('The push function is not deployed yet: Supabase > Edge Functions > push.') }
  const out = await res.json().catch(() => null)
  if (!res.ok || out?.error) throw new Error(out?.error || `The push function answered ${res.status}.`)
  return out
}

let reg = null
/* The worker, registered once per page load. Harmless when push is never switched on. */
export async function registerWorker() {
  if (!pushSupported()) return null
  if (reg) return reg
  try {
    reg = await navigator.serviceWorker.register('./sw.js')
    return reg
  } catch {
    return null
  }
}

const keyBytes = (b64) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

/* 'on' | 'off' | 'blocked' | 'unsupported' | 'homescreen' for this device. */
export async function pushStatus() {
  if (!pushSupported()) return needsHomeScreen() ? 'homescreen' : 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const r = await registerWorker()
  const sub = await r?.pushManager.getSubscription().catch(() => null)
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

async function save(sub) {
  const j = sub.toJSON()
  const { error } = await supabase.rpc('push_claim', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_app: app(), p_ua: navigator.userAgent.slice(0, 200) })
  if (error) throw new Error(/push_claim/.test(error.message) ? 'Run supabase/push.sql in the SQL editor first.' : error.message)
}

/* Asks for permission (must follow a tap), subscribes and saves this device. */
export async function enablePush() {
  if (!remote) throw new Error('Notifications need the online database.')
  if (needsHomeScreen()) throw new Error('On an iPhone, add the app to the home screen first (Share > Add to Home Screen) and open it from there.')
  if (!pushSupported()) throw new Error('This browser cannot show notifications.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked for this site. Allow them in the browser or phone settings.' : 'Notifications were not allowed.')
  const r = await registerWorker()
  if (!r) throw new Error('The notification worker could not start.')
  await navigator.serviceWorker.ready
  const { publicKey } = await call('key')
  let sub = await r.pushManager.getSubscription()
  // an address made with another key (an old function) cannot be used: start again
  if (sub && sub.options?.applicationServerKey) {
    const had = new Uint8Array(sub.options.applicationServerKey)
    const want = keyBytes(publicKey)
    if (had.length !== want.length || had.some((b, i) => b !== want[i])) { await sub.unsubscribe().catch(() => {}); sub = null }
  }
  if (!sub) sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
  await save(sub)
  return true
}

export async function disablePush() {
  const r = await registerWorker()
  const sub = await r?.pushManager.getSubscription().catch(() => null)
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

export const testPush = () => call('test')

/* After a chat message is saved: ring the others in that room. Never throws. */
export function pushMessage(id) {
  call('message', { id }).catch(() => {})
}
/* A call starting, or one that nobody answered. Never throws. */
export function pushCall(chatId, callId, video, missed = false) {
  call(missed ? 'call_missed' : 'call', { chatId, callId, video: !!video }).catch(() => {})
}

/* The device's subscription saved again when it changed or another account signed in here. */
export async function refreshPush() {
  if (!remote || !pushSupported() || Notification.permission !== 'granted') return
  const r = await registerWorker()
  const sub = await r?.pushManager.getSubscription().catch(() => null)
  if (sub) await save(sub).catch(() => {})
}

/* Calls and taps arriving from the worker: { type: 'open' | 'call-wake' | 'resubscribe', ... }. */
export function onWorkerMessage(fn) {
  if (!pushSupported()) return () => {}
  const h = (e) => fn(e.data || {})
  navigator.serviceWorker.addEventListener('message', h)
  return () => navigator.serviceWorker.removeEventListener('message', h)
}

/* Closes this device's notification for a call once it is answered or over here. */
export async function closeCallNotice(callId) {
  try {
    const r = await registerWorker()
    const list = await r?.getNotifications({ tag: `call:${callId}` })
    list?.forEach((n) => n.close())
  } catch { /* nothing to close */ }
}
