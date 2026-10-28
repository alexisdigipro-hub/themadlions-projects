// Database > Logos (Alex, 28 Oct): the logos of clients, labels and brands, a folder a brand with its versions (white,
// black, horizontal, the icon). The rows are in the tables logo_brands and logos (supabase/logos.sql, the permission
// "logos"); the files go to pCloud exactly as they are into <root>/Logos/<brand>/ through the pcloud Edge Function with
// the scope { kind: 'logos' }. The page shows a small PNG made at upload (thumb), so a logo on a transparent background
// stays transparent. In the local build (no database) everything stays in this browser, for trying it out.
import { remote, supabase } from './supabase.js'
import { pcloudBlob, pcloudDelete, pcloudUpload } from './pcloud.js'
import { imageSize } from './idsheets.js'

const SCOPE = { kind: 'logos', id: 'all' }
const byName = (a, b) => a.name.localeCompare(b.name, 'el', { sensitivity: 'base' })
export const extOf = (name) => (String(name || '').match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'file').toUpperCase()
export const isPicture = (name) => /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(name || '')
const titleOf = (name) => String(name || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
const sizeOf = (file) => (isPicture(file.name) && !/\.svg$/i.test(file.name) ? imageSize(file) : Promise.resolve({ width: null, height: null }))

/* the small picture: at most 400 px on its long side, a PNG so transparency stays; an SVG is drawn through an <img> */
export async function logoThumb(blob, name = '') {
  if (!blob || !isPicture(name || blob.name)) return ''
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = url })
    const w = img.naturalWidth || 400, h = img.naturalHeight || 400
    const k = Math.min(1, 400 / Math.max(w, h)) || 1
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k))
    const g = c.getContext('2d')
    g.imageSmoothingQuality = 'high'
    g.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/png')
  } catch { return '' } finally { URL.revokeObjectURL(url) }
}

const missing = (e) => new Error(/relation .*logo|does not exist|42P01|PGRST205/.test(`${e?.code} ${e?.message}`) ? 'Run supabase/logos.sql in the SQL editor to switch Logos on.' : e?.message || 'Logos could not be reached.')

const online = {
  async brands() {
    const { data, error } = await supabase.from('logo_brands').select('id, name, note, created_at')
    if (error) throw missing(error)
    return (data || []).sort(byName)
  },
  async all() {
    const { data, error } = await supabase.from('logos').select('*').order('uploaded_at', { ascending: false })
    if (error) throw missing(error)
    return data || []
  },
  async addBrand(name) {
    const { data, error } = await supabase.from('logo_brands').insert({ name }).select().single()
    if (error) throw missing(error)
    return data
  },
  async updateBrand(id, patch) {
    const { error } = await supabase.from('logo_brands').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async upload(brand, file) {
    const dims = await sizeOf(file)
    const thumb = await logoThumb(file, file.name).catch(() => '')
    const up = await pcloudUpload({ file, folder: [brand.name], scope: SCOPE })
    const row = { brand_id: brand.id, fileid: up.fileid, name: up.name || file.name, size: up.size || file.size, width: dims.width, height: dims.height, title: titleOf(file.name), folder: up.folder || '', thumb }
    const { data, error } = await supabase.from('logos').insert(row).select().single()
    // the file is in pCloud by now; without its row the app cannot show it (it stays in the brand's pCloud folder)
    if (error) throw new Error(`${file.name} is in pCloud but could not be listed: ${error.message}`)
    return data
  },
  async update(id, patch) {
    const { error } = await supabase.from('logos').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
  },
  // the file leaves pCloud first (the function checks it against its row), then the row goes
  async remove(logo) {
    try { await pcloudDelete(logo.fileid, SCOPE) } catch (e) { if (!/not found|2009|does not exist/i.test(e.message)) throw e }
    const { error } = await supabase.from('logos').delete().eq('id', logo.id)
    if (error) throw new Error(error.message)
  },
  async removeBrand(brand, mine) {
    for (const l of mine) await online.remove(l)
    const { error } = await supabase.from('logo_brands').delete().eq('id', brand.id)
    if (error) throw new Error(error.message)
  },
  // the original, as it was uploaded (through the function: pCloud's own links answer only the function)
  async original(logo) {
    if (!blobs.has(logo.fileid)) blobs.set(logo.fileid, URL.createObjectURL(await pcloudBlob(logo.fileid, SCOPE)))
    return blobs.get(logo.fileid)
  },
}
const blobs = new Map() // fileid -> an object URL of the file, kept while the page is open

/* ---------- this browser only (the local build) ---------- */
const KEY = 'tml_logos'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { brands: [], logos: [], files: {} } } catch { return { brands: [], logos: [], files: {} } } }
const write = (d) => localStorage.setItem(KEY, JSON.stringify(d))
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))
const asDataUrl = (file) => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(r.error); r.readAsDataURL(file) })
const local = {
  async brands() { return read().brands.slice().sort(byName) },
  async all() { return read().logos.slice().sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)) },
  async addBrand(name) { const d = read(); const b = { id: newId(), name, note: '', created_at: new Date().toISOString() }; d.brands.push(b); write(d); return b },
  async updateBrand(id, patch) { const d = read(); Object.assign(d.brands.find((b) => b.id === id) || {}, patch); write(d) },
  async upload(brand, file) {
    const dims = await sizeOf(file)
    const d = read()
    const fileid = Date.now() + Math.floor(Math.random() * 1000)
    d.files[fileid] = await asDataUrl(file)
    const row = { id: newId(), brand_id: brand.id, fileid, name: file.name, size: file.size, width: dims.width, height: dims.height, title: titleOf(file.name), note: '', folder: `Logos/${brand.name}`, thumb: await logoThumb(file, file.name).catch(() => ''), uploaded_at: new Date().toISOString() }
    d.logos.push(row); write(d); return row
  },
  async update(id, patch) { const d = read(); Object.assign(d.logos.find((x) => x.id === id) || {}, patch); write(d) },
  async remove(logo) { const d = read(); d.logos = d.logos.filter((x) => x.id !== logo.id); delete d.files[logo.fileid]; write(d) },
  async removeBrand(brand) { const d = read(); d.logos.filter((x) => x.brand_id === brand.id).forEach((x) => delete d.files[x.fileid]); d.logos = d.logos.filter((x) => x.brand_id !== brand.id); d.brands = d.brands.filter((b) => b.id !== brand.id); write(d) },
  async original(logo) { return read().files[logo.fileid] },
}

export const logoApi = remote ? online : local
export const logoLocal = !remote
