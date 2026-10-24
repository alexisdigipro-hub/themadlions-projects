// Database > ID sheets (Alex, 25 Oct): photos of people's ID sheets, a folder per person. The rows are in the
// tables id_people and id_sheets (supabase/id_sheets.sql, the permission "idsheets"); the pictures go to pCloud
// exactly as they are, never compressed, into <root>/ID sheets/<name>/, through the pcloud Edge Function with the
// scope { kind: 'ids' }. In the local build (no database) everything stays in this browser, for trying it out.
import { remote, supabase } from './supabase.js'
import { pcloudBlob, pcloudDelete, pcloudUpload } from './pcloud.js'

const SCOPE = { kind: 'ids', id: 'all' }
const byName = (a, b) => a.name.localeCompare(b.name, 'el', { sensitivity: 'base' })

/* the size of a picture, read before it goes up (shown on its card; the file itself is not touched) */
export function imageSize(file) {
  if (!/^image\//.test(file.type)) return Promise.resolve({ width: null, height: null })
  return new Promise((ok) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { ok({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url) }
    img.onerror = () => { ok({ width: null, height: null }); URL.revokeObjectURL(url) }
    img.src = url
  })
}
const titleOf = (name) => String(name || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim()

/* ---------- the database and pCloud ---------- */
const online = {
  async people() {
    const [{ data: ppl, error: e1 }, { data: sh, error: e2 }] = await Promise.all([
      supabase.from('id_people').select('id, name, note, created_at'),
      supabase.from('id_sheets').select('person_id, fileid, name, uploaded_at').order('uploaded_at', { ascending: false }),
    ])
    if (e1 || e2) throw new Error((e1 || e2).message)
    return (ppl || []).map((p) => {
      const mine = (sh || []).filter((s) => s.person_id === p.id)
      const cover = mine.find((s) => /\.(jpe?g|png|webp|gif|heic|heif|tiff?)$/i.test(s.name)) || null
      return { ...p, count: mine.length, last: mine[0]?.uploaded_at || p.created_at, cover: cover?.fileid || null }
    }).sort(byName)
  },
  async sheets(personId) {
    const { data, error } = await supabase.from('id_sheets').select('*').eq('person_id', personId).order('uploaded_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  },
  async addPerson(name) {
    const { data, error } = await supabase.from('id_people').insert({ name }).select().single()
    if (error) throw new Error(error.message)
    return data
  },
  async updatePerson(id, patch) {
    const { error } = await supabase.from('id_people').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async upload(person, file) {
    const dims = await imageSize(file)
    const up = await pcloudUpload({ file, folder: [person.name], scope: SCOPE })
    const row = { person_id: person.id, fileid: up.fileid, name: up.name || file.name, size: up.size || file.size, width: dims.width, height: dims.height, title: titleOf(file.name), folder: up.folder || '' }
    const { data, error } = await supabase.from('id_sheets').insert(row).select().single()
    // the picture is in pCloud by now; without its row the app cannot show it (it stays in the person's pCloud folder)
    if (error) throw new Error(`${file.name} is in pCloud but could not be listed: ${error.message}`)
    return data
  },
  async updateSheet(id, patch) {
    const { error } = await supabase.from('id_sheets').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
  },
  // the picture leaves pCloud first (the function checks it against its row), then the row goes
  async removeSheet(sheet) {
    try { await pcloudDelete(sheet.fileid, SCOPE) } catch (e) { if (!/not found|2009|does not exist/i.test(e.message)) throw e }
    const { error } = await supabase.from('id_sheets').delete().eq('id', sheet.id)
    if (error) throw new Error(error.message)
  },
  async removePerson(person) {
    for (const s of await online.sheets(person.id)) await online.removeSheet(s)
    const { error } = await supabase.from('id_people').delete().eq('id', person.id)
    if (error) throw new Error(error.message)
  },
  /* pCloud's own file links answer only the address that asked for them (the function's), so a browser
     showing one got a broken picture (Alex, 25 Oct). The picture comes through the function instead, as
     its bytes, and the page shows it from memory: the same file, untouched, a few at a time. */
  async urls(fileids) {
    const out = {}
    const todo = fileids.filter((id) => { if (blobs.has(id)) { out[id] = blobs.get(id); return false } return true })
    let i = 0
    const lane = async () => {
      while (i < todo.length) {
        const id = todo[i++]
        try { const url = URL.createObjectURL(await pcloudBlob(id, SCOPE)); blobs.set(id, url); out[id] = url } catch { /* left out: the card says it could not load */ }
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, todo.length) }, lane))
    return out
  },
  async download(sheet) {
    if (!blobs.has(sheet.fileid)) blobs.set(sheet.fileid, URL.createObjectURL(await pcloudBlob(sheet.fileid, SCOPE)))
    return blobs.get(sheet.fileid)
  },
}
const blobs = new Map() // fileid -> an object URL of the picture, kept while the page is open

/* ---------- this browser only (the local build) ---------- */
const KEY = 'tml_idsheets'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { people: [], sheets: [], files: {} } } catch { return { people: [], sheets: [], files: {} } } }
const write = (d) => localStorage.setItem(KEY, JSON.stringify(d))
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))
const asDataUrl = (file) => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(r.error); r.readAsDataURL(file) })
const local = {
  async people() {
    const d = read()
    return d.people.map((p) => {
      const mine = d.sheets.filter((s) => s.person_id === p.id).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
      return { ...p, count: mine.length, last: mine[0]?.uploaded_at || p.created_at, cover: mine.find((s) => s.width)?.fileid || null }
    }).sort(byName)
  },
  async sheets(personId) { return read().sheets.filter((s) => s.person_id === personId).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)) },
  async addPerson(name) { const d = read(); const p = { id: newId(), name, note: '', created_at: new Date().toISOString() }; d.people.push(p); write(d); return p },
  async updatePerson(id, patch) { const d = read(); Object.assign(d.people.find((p) => p.id === id) || {}, patch); write(d) },
  async upload(person, file) {
    const dims = await imageSize(file)
    const d = read()
    const fileid = Date.now() + Math.floor(Math.random() * 1000)
    d.files[fileid] = await asDataUrl(file)
    const row = { id: newId(), person_id: person.id, fileid, name: file.name, size: file.size, width: dims.width, height: dims.height, title: titleOf(file.name), doc_date: null, note: '', folder: `ID sheets/${person.name}`, uploaded_at: new Date().toISOString() }
    d.sheets.push(row); write(d); return row
  },
  async updateSheet(id, patch) { const d = read(); Object.assign(d.sheets.find((s) => s.id === id) || {}, patch); write(d) },
  async removeSheet(sheet) { const d = read(); d.sheets = d.sheets.filter((s) => s.id !== sheet.id); delete d.files[sheet.fileid]; write(d) },
  async removePerson(person) { const d = read(); d.sheets.filter((s) => s.person_id === person.id).forEach((s) => delete d.files[s.fileid]); d.sheets = d.sheets.filter((s) => s.person_id !== person.id); d.people = d.people.filter((p) => p.id !== person.id); write(d) },
  async urls(fileids) { const f = read().files; return Object.fromEntries(fileids.filter((id) => f[id]).map((id) => [id, f[id]])) },
  async download(sheet) { return read().files[sheet.fileid] },
}

export const idApi = remote ? online : local
export const idLocal = !remote
