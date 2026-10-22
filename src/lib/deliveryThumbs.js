import { remote, supabase } from './supabase.js'

/* Thumbnails on a delivery link (Alex, 22 Oct): the pictures go up as they are, full quality, into the private photos
   bucket under library/deliveries/<delivery id>/ (the bucket's library rule already lets anyone who edits put them
   there, no SQL), and the client's page reaches them through addresses signed for a year: one to show the picture,
   one that downloads it under its own name. JPEG, PNG or WebP, up to 10 MB each (the bucket's own limits). */

const BUCKET = 'photos'
const YEAR = 365 * 24 * 3600
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

const size = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url) }
  img.onerror = () => { resolve({ w: 0, h: 0 }); URL.revokeObjectURL(url) }
  img.src = url
})

export async function uploadThumbs(files, deliveryId, onStep) {
  if (!remote) throw new Error('Thumbnails need the team workspace on Supabase.')
  const out = []
  const list = [...files]
  for (let i = 0; i < list.length; i++) {
    const file = list[i]
    onStep?.(i + 1, list.length)
    if (!TYPES.includes(file.type)) throw new Error(`${file.name}: only JPEG, PNG or WebP pictures.`)
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is over 10 MB.`)
    const safe = file.name.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'thumbnail'
    // a name of its own even for two pictures picked together with the same file name
    const path = `library/deliveries/${deliveryId}/${Date.now().toString(36)}${i}${Math.random().toString(36).slice(2, 6)}-${safe}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true, cacheControl: '31536000' })
    if (error) throw new Error(error.message.includes('not found') ? 'Storage bucket "photos" is missing. Run supabase/storage.sql in the SQL editor.' : error.message)
    const [view, dl, dims] = await Promise.all([
      supabase.storage.from(BUCKET).createSignedUrl(path, YEAR),
      supabase.storage.from(BUCKET).createSignedUrl(path, YEAR, { download: file.name }),
      size(file),
    ])
    if (view.error || dl.error) throw new Error((view.error || dl.error).message)
    out.push({ name: file.name, path, url: view.data.signedUrl, dl: dl.data.signedUrl, size: file.size, ...dims })
  }
  return out
}
