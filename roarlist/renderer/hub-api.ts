// ListApi in the hub (Alex, 27 Oct 2026): RoarList's web store (web-api.ts in the roarlist repository) on the hub's
// database: the team's lists in roarlist_lists (one hub project each), pictures in the hub's private bucket
// roarlist-images under <list>/<file>; the database lets a member see and change what the Shot list permission
// allows (supabase/roarlist.sql). PDF goes through the browser's print dialog ("Save as PDF").
import type { ListApi, PrintLabels, PrintMode, Project, ProjectSummary } from '../shared/api'
import { IMG, clean, newScene } from '../shared/clean'
import { printHtml } from '../shared/print'
import { sb, scope } from './hub'

const BUCKET = 'roarlist-images'
const uid = () => crypto.randomUUID()
const urls = new Map<string, string>() // object URLs of pictures already downloaded
const blobs = new Map<string, Blob>()
const path = (pid: string, file: string) => `${pid}/${file}`

function must<T>(r: { data: T; error: any }): T {
  if (r.error) throw r.error
  return r.data
}

async function blobOf(pid: string, file: string): Promise<Blob | undefined> {
  const key = `${pid}/${file}`
  if (blobs.has(key)) return blobs.get(key)
  const { data } = await sb.storage.from(BUCKET).download(path(pid, file))
  if (data) blobs.set(key, data)
  return data || undefined
}
const toDataUrl = (b: Blob) => new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ok(''); r.readAsDataURL(b) })
const b64 = (data: string) => data.slice(data.indexOf(',') + 1)
const imagesIn = (p: Project) => [...new Set(p.scenes.flatMap((sc) => sc.shots.map((s) => s.image)).filter(Boolean))]

function summary(p: Project): ProjectSummary {
  let shots = 0, done = 0, cover = ''
  for (const sc of p.scenes) for (const s of sc.shots) { shots++; if (s.done) done++; if (!cover && s.image) cover = s.image }
  return { id: p.id, projectId: p.projectId, title: p.title, date: p.date, updatedAt: p.updatedAt, shots, done, cover }
}

async function get(id: string): Promise<Project | null> {
  const row = must(await sb.from('roarlist_lists').select('data, project_id').eq('id', id).maybeSingle()) as any
  return row ? { ...clean(row.data, id), projectId: row.project_id || '' } : null
}

async function save(p: Project) {
  const data = { ...clean(p, p.id), updatedAt: Date.now() }
  const project_id = p.projectId || null
  const updated = must(await sb.from('roarlist_lists').update({ data, project_id }).eq('id', p.id).select('id')) as any[]
  if (!updated?.length) must(await sb.from('roarlist_lists').insert({ id: p.id, data, project_id }))
}

async function listFiles(pid: string) {
  const { data } = await sb.storage.from(BUCKET).list(pid, { limit: 1000 })
  return (data || []).map((f: any) => f.name)
}

// pictures no shot uses any more go when the project is opened
async function sweep(p: Project) {
  const used = new Set(imagesIn(p))
  const gone = (await listFiles(p.id)).filter((f) => !used.has(f))
  if (gone.length) await sb.storage.from(BUCKET).remove(gone.map((f) => path(p.id, f)))
}

async function putImage(pid: string, name: string, blob: Blob) {
  must(await sb.storage.from(BUCKET).upload(path(pid, name), blob, { contentType: blob.type, upsert: true }))
  blobs.set(`${pid}/${name}`, blob)
}

function download(name: string, data: BlobPart, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([data], { type }))
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 30e3)
}
const safeName = (s: string) => (s || 'RoarList').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'RoarList'

async function pageFor(id: string, mode: PrintMode, labels: PrintLabels, screen: boolean) {
  const p = await get(id)
  if (!p) return null
  const data: Record<string, string> = {}
  await Promise.all(imagesIn(p).map(async (f) => { const b = await blobOf(id, f); if (b) data[f] = await toDataUrl(b) }))
  return { p, html: printHtml(p, mode, labels, (f) => data[f] || '', screen) }
}

function pickFile(accept: string) {
  return new Promise<File | null>((ok) => {
    const i = document.createElement('input')
    i.type = 'file'; i.accept = accept
    i.onchange = () => ok(i.files?.[0] || null)
    i.click()
  })
}

const mimeOf = (name: string) => `image/${name.split('.').pop()!.replace('jpg', 'jpeg')}`

// a project from a .roarlist file (or from this browser's old storage) becomes a new one in the account
async function adopt(raw: unknown, images: Record<string, Blob>): Promise<Project> {
  const id = uid()
  const p = { ...clean(raw, id), projectId: scope }
  await save({ ...p, scenes: [] }) // the list first: the bucket takes pictures only for a list that is there
  const have = new Set<string>()
  for (const [name, blob] of Object.entries(images)) {
    if (!IMG.test(name)) continue
    await putImage(id, name, blob.type ? blob : new Blob([blob], { type: mimeOf(name) }))
    have.add(name)
  }
  p.scenes = p.scenes.map((sc) => ({ ...sc, id: uid(), shots: sc.shots.map((x) => ({ ...x, id: uid(), image: have.has(x.image) ? x.image : '' })) }))
  await save(p)
  return (await get(id))!
}

async function unpack(text: string): Promise<Project> {
  const data = JSON.parse(text)
  if (data?.format !== 'roarlist' || !data.project) throw new Error('not a RoarList file')
  const images: Record<string, Blob> = {}
  for (const [name, enc] of Object.entries(data.images || {})) {
    if (typeof enc !== 'string') continue
    images[name] = new Blob([Uint8Array.from(atob(enc), (c) => c.charCodeAt(0))], { type: mimeOf(name) })
  }
  return adopt(data.project, images)
}

const noop = () => () => {}

export const hubApi: ListApi & { update: any } = {
  platform: 'web',
  imageSrc(pid, file) {
    const key = `${pid}/${file}`
    const u = urls.get(key)
    if (u) return u
    return blobOf(pid, file).then((b) => {
      if (!b) return ''
      const url = URL.createObjectURL(b)
      urls.set(key, url)
      return url
    })
  },
  async list() {
    let q = sb.from('roarlist_lists').select('id, data, project_id').order('updated_at', { ascending: false })
    if (scope) q = q.eq('project_id', scope)
    const rows = must(await q) as any[]
    return (rows || []).map((r: any) => summary({ ...clean(r.data, r.id), projectId: r.project_id || '' })).sort((a, b) => b.updatedAt - a.updatedAt)
  },
  async get(id) {
    const p = await get(id)
    if (p) sweep(p).catch(() => {})
    return p
  },
  async create(title) {
    const now = Date.now()
    const p: Project = { id: uid(), projectId: scope, title, client: '', director: '', dop: '', date: '', aspect: '16:9', notes: '', scenes: [newScene(1)], createdAt: now, updatedAt: now }
    await save(p)
    return p
  },
  save,
  saveNow(p) { save(p).catch(() => {}) },
  async duplicate(id, title) {
    const src = await get(id)
    if (!src) throw new Error('not found')
    const copy = { ...src, id: uid(), title, createdAt: Date.now() }
    await save(copy) // the list first: the bucket takes pictures only for a list that is there
    for (const f of imagesIn(src)) await sb.storage.from(BUCKET).copy(path(id, f), path(copy.id, f))
    return (await get(copy.id))!
  },
  async remove(id) {
    // the pictures first: the bucket lets them go only while their list is there
    const files = await listFiles(id)
    if (files.length) await sb.storage.from(BUCKET).remove(files.map((f) => path(id, f)))
    must(await sb.from('roarlist_lists').delete().eq('id', id))
  },
  async saveImage(pid, bytes, ext) {
    const e = String(ext).toLowerCase().replace('jpeg', 'jpg')
    if (!/^(png|jpg|webp|gif)$/.test(e)) throw new Error('unsupported image')
    const name = `${uid()}.${e}`
    const blob = new Blob([bytes], { type: mimeOf(name) })
    await putImage(pid, name, blob)
    urls.set(`${pid}/${name}`, URL.createObjectURL(blob))
    return name
  },
  // the printed page goes into a hidden frame and the browser's print dialog makes the PDF
  async exportPdf(id, mode, labels) {
    const page = await pageFor(id, mode, labels, false)
    if (!page) return false
    const f = document.createElement('iframe')
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    f.srcdoc = page.html
    document.body.appendChild(f)
    await new Promise((ok) => { f.onload = ok })
    await new Promise((ok) => setTimeout(ok, 300))
    const title = document.title
    document.title = safeName(`${page.p.title}${mode === 'board' ? ' storyboard' : ''}`) // Chrome names the PDF after it
    f.contentWindow!.focus()
    f.contentWindow!.print()
    document.title = title
    setTimeout(() => f.remove(), 1000)
    return true
  },
  async exportHtml(id, mode, labels) {
    const page = await pageFor(id, mode, labels, true)
    if (!page) return false
    download(`${safeName(page.p.title)}.html`, page.html, 'text/html')
    return true
  },
  async exportFile(id) {
    const p = await get(id)
    if (!p) return false
    const images: Record<string, string> = {}
    for (const f of imagesIn(p)) { const b = await blobOf(id, f); if (b) images[f] = b64(await toDataUrl(b)) }
    download(`${safeName(p.title)}.roarlist`, JSON.stringify({ format: 'roarlist', version: 1, project: p, images }), 'application/json')
    return true
  },
  async importFile() {
    const f = await pickFile('.roarlist,application/json')
    return f ? unpack(await f.text()) : null
  },
  onMenu: noop,
  onOpened: noop,
  update: {
    state: async () => ({ status: 'idle', version: '', progress: 0 }),
    install: async () => false,
    on: noop,
  },
}
