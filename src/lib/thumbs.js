/* Small pictures out of the project JSON (Alex, 25 Oct: "the hub still feels heavy"). Covers (coverThumb) and
   the small pictures of photos (photos[].thumb, in projects and the library) were data URLs inside the JSON,
   3.4 of the 3.7 MB the hub downloaded on every open. They go to the public bucket "thumbs"
   (supabase/thumbs.sql) under <workspace>/<sha-256 of the bytes>, and the JSON keeps the link. Pages need no
   change: a link is a picture's src as a data URL was. store.jsx runs this for an administrator, a few
   seconds after the state settles, so old pictures move once and new ones soon after they are added. */
import { supabase } from './supabase.js'

const BUCKET = 'thumbs'
const KEYS = new Set(['coverThumb', 'thumb'])
const isData = (v) => typeof v === 'string' && v.startsWith('data:image/')

// every data URL kept under coverThumb or thumb, in the projects and the library
export function findInline(state) {
  const out = new Set()
  const walk = (v, key) => {
    if (isData(v)) { if (KEYS.has(key)) out.add(v); return }
    if (Array.isArray(v)) { for (const x of v) walk(x, key); return }
    if (v && typeof v === 'object') for (const k in v) walk(v[k], k)
  }
  walk(state.projects, '')
  walk(state.library, '')
  return out
}

// the same value with each found data URL swapped for its link; untouched parts stay the very same objects
export function swapInline(v, map) {
  if (typeof v === 'string') return map.get(v) || v
  if (Array.isArray(v)) {
    let changed = false
    const out = v.map((x) => { const y = swapInline(x, map); if (y !== x) changed = true; return y })
    return changed ? out : v
  }
  if (v && typeof v === 'object') {
    let out = null
    for (const k in v) {
      const y = swapInline(v[k], map)
      if (y !== v[k]) { out = out || { ...v }; out[k] = y }
    }
    return out || v
  }
  return v
}

const bytesOf = (dataUrl) => {
  const [head, body] = dataUrl.split(',', 2)
  const type = /^data:([^;,]+)/.exec(head)?.[1] || 'image/jpeg'
  const bin = /;base64/.test(head) ? atob(body) : decodeURIComponent(body)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
  return { type, u8 }
}

// uploads each picture once; { data URL: link }. Throws when the bucket is not there yet (thumbs.sql not run).
export async function uploadInline(urls, ws) {
  const map = new Map()
  for (const d of urls) {
    const { type, u8 } = bytesOf(d)
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', u8))].map((b) => b.toString(16).padStart(2, '0')).join('')
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : type === 'image/gif' ? 'gif' : 'jpg'
    const path = `${ws}/${hash}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, new Blob([u8], { type }), { contentType: type, upsert: false, cacheControl: '31536000' })
    // already there: the same picture was moved before (a copied project, a second device)
    if (error && !/exists|duplicate/i.test(error.message || '') && String(error.statusCode) !== '409') throw error
    map.set(d, supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
  }
  return map
}
