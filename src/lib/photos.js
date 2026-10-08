import { remote, supabase } from './supabase.js'
import { pcloudBlob, pcloudDelete, pcloudLinks, pcloudUpload } from './pcloud.js'

/*
  Photos: compressed in the browser, stored in the private Supabase bucket "photos"
  under <projectId>/<ownerId>/<photoId>.jpg. The project document keeps only a small
  thumbnail and the storage path. In local mode the compressed image itself is kept
  in the document (fine for a few, heavy for many).
  With Settings > Integrations > File storage = pCloud, new photos go to Alex's pCloud instead
  (a folder per project, Library for the Database page) and the record keeps `fileid` + `scope`
  in place of the path. Photos uploaded before stay where they are and keep opening.
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

export async function uploadPhoto({ projectId, ownerId, id, blob, pcloud }) {
  if (remote && pcloud) {
    const file = new File([blob], `${id}.jpg`, { type: 'image/jpeg' })
    const r = await pcloudUpload({ file, folder: pcloud.folder, scope: pcloud.scope })
    return { path: '', inline: '', fileid: r.fileid, scope: pcloud.scope }
  }
  if (!remote) {
    // local mode: keep the compressed image inline
    return { path: '', inline: await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob) }) }
  }
  const path = `${projectId}/${ownerId}/${id}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(error.message.includes('not found') ? 'Storage bucket "photos" is missing. Run supabase/storage.sql in the SQL editor.' : error.message)
  return { path, inline: '' }
}

/* Takes the photo record (or, from older code, its storage path). */
export async function deletePhoto(p) {
  if (!remote || !p) return
  if (typeof p === 'object') {
    if (p.fileid) return void (await pcloudDelete(p.fileid, p.scope))
    p = p.path
  }
  if (!p) return
  await supabase.storage.from(BUCKET).remove([p])
}

/* The photo's bytes, for drawing it on a canvas (presentation slides, the cover crop). A pCloud
   photo comes through the pcloud function, which answers from this site's own address. */
export async function photoBlob(p) {
  if (p?.fileid) return pcloudBlob(p.fileid, p.scope)
  const url = (await photoUrls([p]))[p.id]
  if (!url) throw new Error('No picture.')
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Could not load a picture (${r.status}).`)
  return r.blob()
}

const urlCache = new Map() // path -> { url, exp }
export async function photoUrls(photos) {
  const out = {}
  const need = []
  const now = Date.now()
  const fromPcloud = []
  photos.forEach((p) => {
    if (p.inline) out[p.id] = p.inline
    else if (p.fileid) {
      const c = urlCache.get(`pc:${p.fileid}`)
      if (c && c.exp > now) out[p.id] = c.url
      else fromPcloud.push(p)
    } else if (p.path) {
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
  if (fromPcloud.length && remote) {
    // one call per project (or the library), however many photos it has
    const byScope = new Map()
    fromPcloud.forEach((p) => { const k = JSON.stringify(p.scope || null); if (!byScope.has(k)) byScope.set(k, []); byScope.get(k).push(p) })
    await Promise.all([...byScope.values()].map(async (list) => {
      try {
        const urls = await pcloudLinks(list.map((p) => p.fileid), list[0].scope)
        list.forEach((p) => {
          const u = urls[p.fileid]
          if (u) { out[p.id] = u; urlCache.set(`pc:${p.fileid}`, { url: u, exp: now + 50 * 60 * 1000 }) }
        })
      } catch { /* the small picture kept in the record stands in */ }
    }))
  }
  return out
}

export const fmtBytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)
