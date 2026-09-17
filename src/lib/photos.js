import { remote, supabase } from './supabase.js'

/*
  Photos: compressed in the browser, stored in the private Supabase bucket "photos"
  under <projectId>/<ownerId>/<photoId>.jpg. The project document keeps only a small
  thumbnail and the storage path. In local mode the compressed image itself is kept
  in the document (fine for a few, heavy for many).
*/

const BUCKET = 'photos'

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => reject(new Error(`Could not read ${file.name}. HEIC from iPhone: pick "Most compatible" in Camera settings or share as JPEG.`))
    img.src = url
  })
}

function draw(img, max, quality) {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * k)
  c.height = Math.round(img.naturalHeight * k)
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return new Promise((resolve) => c.toBlob((b) => resolve({ blob: b, w: c.width, h: c.height, dataUrl: null }), 'image/jpeg', quality))
}

export async function compress(file, { max = 1600, quality = 0.82, thumb = 320 } = {}) {
  const { img, url } = await loadImage(file)
  try {
    const full = await draw(img, max, quality)
    const th = await draw(img, thumb, 0.7)
    const thumbUrl = await new Promise((res) => {
      const r = new FileReader()
      r.onload = () => res(r.result)
      r.readAsDataURL(th.blob)
    })
    return { blob: full.blob, w: full.w, h: full.h, thumb: thumbUrl, originalBytes: file.size, bytes: full.blob.size }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function uploadPhoto({ projectId, ownerId, id, blob }) {
  if (!remote) {
    // local mode: keep the compressed image inline
    return { path: '', inline: await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob) }) }
  }
  const path = `${projectId}/${ownerId}/${id}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(error.message.includes('not found') ? 'Storage bucket "photos" is missing. Run supabase/storage.sql in the SQL editor.' : error.message)
  return { path, inline: '' }
}

export async function deletePhoto(path) {
  if (!remote || !path) return
  await supabase.storage.from(BUCKET).remove([path])
}

const urlCache = new Map() // path -> { url, exp }
export async function photoUrls(photos) {
  const out = {}
  const need = []
  const now = Date.now()
  photos.forEach((p) => {
    if (p.inline) out[p.id] = p.inline
    else if (p.path) {
      const c = urlCache.get(p.path)
      if (c && c.exp > now) out[p.id] = c.url
      else need.push(p)
    }
  })
  if (need.length && remote) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(need.map((p) => p.path), 3600)
    if (!error && data) {
      data.forEach((d, i) => {
        if (d.signedUrl) {
          out[need[i].id] = d.signedUrl
          urlCache.set(need[i].path, { url: d.signedUrl, exp: now + 55 * 60 * 1000 })
        }
      })
    }
  }
  return out
}

export const fmtBytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)
