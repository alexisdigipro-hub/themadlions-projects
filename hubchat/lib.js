import { createClient } from '@supabase/supabase-js'
import { locale } from './i18n.js'
import { SUPABASE_KEY as HUB_KEY, SUPABASE_URL as HUB_URL } from '../src/lib/supabaseConfig.js'

// The hub's chat (Alex, 1 Nov 2026): RoarMe's chat copied into the hub, on the hub's own Supabase project
// (supabase/hub_chat.sql makes the same roar_* tables there). This page runs in a frame on the hub's own address and
// makes its client exactly as src/lib/supabase.js does (same address, same key, the library's default storage key),
// so it reads the hub's saved sign-in and is signed in with no click. It never signs anyone in by itself.
export const SUPABASE_URL = HUB_URL
export const SUPABASE_KEY = HUB_KEY
export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null

export const appUrl = () => window.location.origin + window.location.pathname

export const USERNAME_RE = /^[a-z0-9_]{3,24}$/
export const cleanUsername = (v) => String(v || '').toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 24)

export const nameOf = (p) => (p ? p.display_name || `@${p.username}` : 'Someone')
export const initialsOf = (s) => String(s || '?').replace(/^@/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

export const onlineNow = (p) => !!p?.last_seen && Date.now() - new Date(p.last_seen).getTime() < 3 * 60 * 1000

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
// one formatter per locale and style, kept: making a new one for every time on screen is slow, above all on an iPhone
const fmts = new Map()
const fmt = (opts) => {
  const k = `${locale() || ''}|${JSON.stringify(opts)}`
  let f = fmts.get(k)
  if (!f) { f = new Intl.DateTimeFormat(locale() || undefined, opts); fmts.set(k, f) }
  return f
}
export const timeOf = (iso) => fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
export const listTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return timeOf(iso)
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (sameDay(d, y)) return 'Yesterday'
  if (now - d < 6 * 864e5) return fmt({ weekday: 'short' }).format(d)
  return fmt({ day: 'numeric', month: 'short' }).format(d)
}
export const dayLabel = (iso) => {
  const d = new Date(iso)
  const now = new Date()
  if (sameDay(d, now)) return 'Today'
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (sameDay(d, y)) return 'Yesterday'
  return fmt({ weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) }).format(d)
}
export const lastSeenText = (p) => {
  if (!p?.last_seen) return ''
  if (onlineNow(p)) return 'online'
  return `last seen ${listTime(p.last_seen).toLowerCase() === 'yesterday' ? 'yesterday' : listTime(p.last_seen)}`
}

export const fmtBytes = (n) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1e3))} KB`)

// a photo made smaller before it is sent, as WhatsApp and Telegram do
export async function shrinkImage(file, max = 1920, quality = 0.85) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url })
    const k = Math.min(1, max / Math.max(img.width, img.height))
    if (k === 1 && file.size < 1.5e6) return file
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', quality))
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}

// signed links to files in a room, kept for the hour they are good for. Takes the message's file
// ({ path, bucket }) or a bare path
const signed = new Map()
// a photo's small copy, for the chat and the media grids; the whole photo opens full screen (Alex, 21 Oct: lighter)
export const thumbOf = (file) => (file?.thumb ? { path: file.thumb, bucket: file.bucket } : file)
export async function fileLink(file, download = '') {
  const path = typeof file === 'string' ? file : file?.path
  if (!path) return ''
  const bucket = (typeof file === 'object' && file?.bucket) || 'roar-files'
  const key = `${bucket}|${path}|${download}`
  const hit = signed.get(key)
  if (hit && hit.until > Date.now()) return hit.url
  if (!download) return batchLink(bucket, path, key)
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
  const url = data?.signedUrl ? withName(data.signedUrl, download) : ''
  if (url) signed.set(key, { url, until: Date.now() + 3500 * 1000 })
  return url
}
/* a download link that saves under the file's real name, Greek, spaces, & and all (Alex, 21 Oct: a RoarTransfer came down
   as "%CE%93%CE%B9…"): the name goes in encoded exactly once. supabase-js leaves it raw or, in the Edge Function, encodes
   it twice; any download= already there is replaced */
export function withName(url, name) {
  if (!url || !name || name === true) return url
  try {
    const u = new URL(url)
    u.searchParams.delete('download')
    return `${u.toString()}${u.search ? '&' : '?'}download=${encodeURIComponent(name)}`
  } catch { return url }
}
/* the links asked for in the same moment (a chat opening with twenty photos) go to the server as one request,
   not twenty (Alex, 21 Oct: RoarMe lighter) */
const waiting = new Map() // bucket -> Map(path -> [{ key, resolve }])
function batchLink(bucket, path, key) {
  return new Promise((resolve) => {
    let q = waiting.get(bucket)
    if (!q) {
      q = new Map()
      waiting.set(bucket, q)
      setTimeout(async () => {
        waiting.delete(bucket)
        const paths = [...q.keys()]
        let rows = []
        try { rows = (await supabase.storage.from(bucket).createSignedUrls(paths, 3600)).data || [] } catch { rows = [] }
        const byPath = Object.fromEntries(rows.filter((r) => r?.signedUrl).map((r) => [r.path, r.signedUrl]))
        q.forEach((list, p) => list.forEach((w) => {
          const url = byPath[p] || ''
          if (url) signed.set(w.key, { url, until: Date.now() + 3500 * 1000 })
          w.resolve(url)
        }))
      }, 30)
    }
    if (!q.has(path)) q.set(path, [])
    q.get(path).push({ key, resolve })
  })
}

export const errText = (e) => {
  const m = e?.message || String(e || 'Something went wrong')
  if (/duplicate key|roar_profiles_username/i.test(m)) return 'That username is taken.'
  if (/Invalid login credentials/i.test(m)) return 'Wrong email or password.'
  if (/Email not confirmed/i.test(m)) return 'Confirm your email first: open the link we sent you.'
  return m
}

/* An upload that tells how far it has got (the Supabase library does not), and can be stopped:
   holder.abort() stops it. onProgress gets 0..1. */
export async function uploadWithProgress(bucket, path, file, type, onProgress, holder = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Not signed in')
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', SUPABASE_KEY)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('Content-Type', type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total) }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress?.(1); resolve() }
      else { let m = `Upload failed (${xhr.status})`; try { m = JSON.parse(xhr.responseText).message || m } catch { /* plain text */ } reject(new Error(m)) }
    }
    xhr.onerror = () => reject(new Error('The upload stopped. Check the connection and try again.'))
    xhr.onabort = () => { const e = new Error('Cancelled'); e.cancelled = true; reject(e) }
    holder.abort = () => xhr.abort()
    xhr.send(file)
  })
}
