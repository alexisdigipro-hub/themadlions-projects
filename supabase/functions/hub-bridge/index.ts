// THEMADLIONS Projects · the door for other apps (Supabase Edge Function "hub-bridge")
//
// Alex (22 Nov 2026): "a key from the hub, put in RoarMe, and every location made there goes straight into the hub".
// An app sends the key (made in Settings > Integrations > Connected apps; supabase/roarme-bridge.sql) in x-hub-key.
// The hub keeps only its SHA-256; a removed key is refused. What it can do, in this workspace only:
//   hello                      -> the workspace's name
//   location.put { ext, loc, photos: [{ id, url }], from }
//                              -> one entry of the library's locations, the same id for the same ext every time
//                                 (so a change updates it), new photos copied into the public thumbs bucket
//   location.delete { ext }    -> takes that entry away, only if it came from an app
//   projects.list              -> every project: id, title, status, startDate, code, createdAt, the RoarMe group it is tied to,
//                                 whether it was unlinked (from either side; Alex, 22 Nov: a delete or Unlink only unties)
//   project.get { id }         -> the project's title, status, startDate, category, client, artist, tasks, locations (with
//                                 libPhotos, the library's photos, when a location has none of its own), cover (coverThumb) and
//                                 music (each song with a link good for a day: pCloud through the pcloud function, or audio)
//   project.create { title, status, startDate, category, room } -> a new project with the next TML-YYYY-NNN code
//   project.put { id, set, tasks?, locations? } -> sets title / status / startDate / category / roarme ({ room } or
//                                 { unlinked: true }) and, when sent,
//                                 replaces the project's tasks and locations (the caller merged them; Production Hub,
//                                 Alex 22 Nov: every group in RoarMe's PROJECTS is a project of the hub, both ways)
// Photos are fetched only from RoarMe's own storage. Deploy with verify_jwt off (the key is the check).

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const PHOTO_HOSTS = ['bzmjhbnwhdwmncxkqkdl.supabase.co']
const TYPES = ['Interior', 'Exterior', 'Both']

// a link to a pCloud file that plays without signing in, made the same way as the pcloud function's own (supabase/functions/pcloud,
// sig / signed): that function passes the file on, since a pCloud link works only from the address that asked for it
const FULL = Deno.env.get('PCLOUD_FULL_TOKEN') || ''
let signKey: CryptoKey | null = null
async function pcloudSigned(fileid: number | string, hours = 24) {
  if (!FULL) return ''
  const enc = new TextEncoder()
  signKey ||= await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', enc.encode('pcloud-stream:' + FULL)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const t = `file.${fileid}.${Math.floor(Date.now() / 1000) + hours * 3600}`
  const b = new Uint8Array(await crypto.subtle.sign('HMAC', signKey, enc.encode(t)))
  const sig = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 32)
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/pcloud?s=${t}.${sig}`
}

const hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('')
const str = (v: any, n = 300) => (typeof v === 'string' ? v.slice(0, n) : v == null ? '' : String(v).slice(0, n))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const key = req.headers.get('x-hub-key') || ''
  if (!/^tmlhub_[0-9a-f]{48}$/.test(key)) return json({ error: 'This key is not right.' }, 401)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: k } = await db.from('hub_keys').select('id, workspace_id, revoked_at').eq('key_hash', await hex(key)).maybeSingle()
  if (!k || k.revoked_at) return json({ error: 'This key was removed in the hub, or never made there.' }, 401)
  const ws = k.workspace_id as string
  db.from('hub_keys').update({ last_used_at: new Date().toISOString() }).eq('id', k.id).then(() => {})
  let body: any
  try { body = await req.json() } catch { return json({ error: 'Nothing sent' }, 400) }
  const action = str(body?.action, 40)

  if (action === 'hello') {
    const { data: w } = await db.from('workspaces').select('name').eq('id', ws).maybeSingle()
    return json({ ok: true, workspace: w?.name || 'Hub' })
  }

  if (action === 'projects.list') {
    const { data: rows, error } = await db.from('projects').select('id, data, updated_at').eq('workspace_id', ws)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, projects: (rows || []).map((r: any) => ({ id: r.id, title: r.data?.title || '', status: r.data?.status || '', startDate: r.data?.startDate || '', code: r.data?.code || '', createdAt: r.data?.createdAt || '', room: r.data?.roarme?.room || '', request: r.data?.roarme?.request || '', unlinked: !!r.data?.roarme?.unlinked, delivered: r.data?.status === 'Delivered', updatedAt: r.updated_at })) })
  }
  if (action === 'project.get' || action === 'project.put') {
    const pid = str(body?.id, 40)
    const { data: row } = await db.from('projects').select('data, updated_at').eq('id', pid).eq('workspace_id', ws).maybeSingle()
    if (!row) return json({ error: 'That project is not in the hub any more.' }, 404)
    const d = row.data || {}
    if (action === 'project.get') {
      // a location tied to the library with no photos of its own shows the library's (RoarMe's Location Scout shows them)
      const locs: any[] = Array.isArray(d.locations) ? d.locations : []
      const libIds = locs.filter((l) => l.libraryId && !(l.photos || []).length).map((l) => l.libraryId)
      const lib: Record<string, any[]> = {}
      if (libIds.length) {
        const { data: rows } = await db.from('library').select('id, data').eq('workspace_id', ws).in('id', libIds)
        for (const r of rows || []) lib[r.id] = (r.data?.photos || [])
      }
      // the project's songs, each with a link that plays for a day (Alex, 22 Nov: "the song should be in RoarMe too")
      const music: any[] = []
      for (const t of ((d.music?.tracks || []) as any[]).slice(0, 30)) {
        let url = ''
        if (t.fileid) url = await pcloudSigned(t.fileid)
        else if (t.path) { const { data: su } = await db.storage.from('audio').createSignedUrl(t.path, 86400); url = su?.signedUrl || '' }
        if (!url) continue
        const pk: number[] = Array.isArray(t.peaks) ? t.peaks : []
        const peaks = pk.length > 240 ? Array.from({ length: 240 }, (_, i) => pk[Math.floor(i * pk.length / 240)]) : pk
        music.push({ id: t.id, name: `${t.name || 'Song'}.${t.ext || 'mp3'}`, ext: t.ext || '', kind: t.kind || '', bytes: t.bytes || 0, duration: t.duration || 0, peaks, url, addedAt: t.addedAt || '', until: Date.now() + 86000 * 1000 })
      }
      return json({ ok: true, project: { id: pid, title: d.title || '', status: d.status || '', startDate: d.startDate || '', category: d.category || '', client: d.client || '', artist: d.artist || '', code: d.code || '', tasks: d.tasks || [], locations: locs.map((l) => (lib[l.libraryId] ? { ...l, libPhotos: lib[l.libraryId] } : l)), cover: d.coverThumb || '', music, roarme: d.roarme || null, updatedAt: row.updated_at } })
    }
    const set = body?.set || {}
    const next: any = { ...d, updatedAt: new Date().toISOString() }
    for (const k of ['title', 'status', 'startDate', 'category']) if (typeof set[k] === 'string') next[k] = set[k].slice(0, 300)
    if (set.roarme && typeof set.roarme === 'object') next.roarme = set.roarme.unlinked ? { unlinked: new Date().toISOString() } : { room: str(set.roarme.room, 60) }
    if (Array.isArray(body?.tasks)) next.tasks = body.tasks.slice(0, 2000)
    if (Array.isArray(body?.locations)) next.locations = body.locations.slice(0, 500)
    const { error } = await db.from('projects').update({ data: next }).eq('id', pid).eq('workspace_id', ws)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }
  if (action === 'project.create') {
    const { data: rows } = await db.from('projects').select('data').eq('workspace_id', ws)
    const { data: w } = await db.from('workspaces').select('settings').eq('id', ws).maybeSingle()
    const prefix = String(w?.settings?.projectCodePrefix ?? 'TML').trim()
    const year = new Date().getFullYear()
    const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${year}-(\\d+)$`, 'i')
    const used = (rows || []).map((r: any) => re.exec(r.data?.code || '')).filter(Boolean).map((m: any) => Number(m[1]))
    const code = prefix ? `${prefix}-${year}-${String(Math.max(0, ...used) + 1).padStart(3, '0')}` : ''
    const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')
    const now = new Date().toISOString()
    const data = {
      id, title: str(body?.title, 300) || 'Untitled project', category: str(body?.category, 60) || 'Music Video', status: str(body?.status, 60) || 'Development',
      client: '', director: '', producer: '', startDate: str(body?.startDate, 20), endDate: '', notes: '', code, color: '#C8503F', createdAt: now, updatedAt: now,
      script: { text: '', fileName: '', format: '', importedAt: '' }, scenes: [], shootingDays: [], locations: [], contacts: [], shots: [], tasks: [],
      budget: { lines: [], contingencyPct: 10, currency: 'EUR', cap: '' }, gear: [], vendors: [], post: { cuts: [], deliverables: [] }, scriptVersions: [],
      music: { tracks: [], activeTrackId: '', sections: [], notes: '' }, breakdownStatus: 'none', hiddenTabs: [],
      roarme: { room: str(body?.room, 60) },
    }
    const { error } = await db.from('projects').insert({ id, workspace_id: ws, data })
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, id, code })
  }

  const ext = str(body?.ext, 200)
  if (!ext) return json({ error: 'No ext' }, 400)
  const id = 'rm' + (await hex(`${ws}|${ext}`)).slice(0, 12)

  if (action === 'location.delete') {
    const { data: row } = await db.from('library').select('data').eq('id', id).eq('workspace_id', ws).maybeSingle()
    if (row?.data?.source?.app) await db.from('library').delete().eq('id', id).eq('workspace_id', ws)
    return json({ ok: true })
  }

  if (action === 'location.put') {
    const l = body?.loc || {}
    const { data: row } = await db.from('library').select('data').eq('id', id).eq('workspace_id', ws).maybeSingle()
    const old = row?.data || {}
    const had: Record<string, any> = Object.fromEntries((old.photos || []).map((p: any) => [p.id, p]))
    const photos: any[] = []
    for (const p of (Array.isArray(body?.photos) ? body.photos : []).slice(0, 40)) {
      const pid = 'rm' + str(p?.id, 80).replace(/[^\w-]/g, '').slice(0, 40)
      if (had[pid]) { photos.push(had[pid]); continue }
      let u: URL
      try { u = new URL(str(p?.url, 2000)) } catch { continue }
      if (u.protocol !== 'https:' || !PHOTO_HOSTS.includes(u.hostname)) continue
      try {
        const r = await fetch(u)
        if (!r.ok) continue
        const type = r.headers.get('content-type') || 'image/jpeg'
        if (!/^image\/(jpeg|png|webp|gif)/.test(type)) continue
        const buf = new Uint8Array(await r.arrayBuffer())
        if (buf.byteLength > 2_000_000) continue
        const path = `${ws}/${pid}.${type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'}`
        const up = await db.storage.from('thumbs').upload(path, buf, { contentType: type, upsert: true })
        if (up.error) continue
        const thumb = db.storage.from('thumbs').getPublicUrl(path).data.publicUrl
        photos.push({ id: pid, path: '', inline: '', thumb, w: Number(p?.w) || 0, h: Number(p?.h) || 0, bytes: buf.byteLength, caption: '', scope: { id: 'library', kind: 'library' }, addedAt: new Date().toISOString() })
      } catch { /* a photo that cannot be read is left out */ }
    }
    const data = {
      ...old,
      id,
      name: str(l.name, 200) || 'Location',
      address: str(l.address, 300),
      type: TYPES.includes(l.type) ? l.type : (old.type || 'Interior'),
      contact: str(l.contact, 200),
      phone: str(l.phone, 60),
      notes: str(l.notes, 4000),
      mapsUrl: str(l.mapsUrl, 1000),
      lat: str(l.lat, 30),
      lon: str(l.lon, 30),
      coordsText: old.coordsText || '',
      tags: (Array.isArray(l.tags) ? l.tags : []).map((t: any) => str(t, 40)).filter(Boolean).slice(0, 20),
      photos,
      createdAt: old.createdAt || new Date().toISOString(),
      source: { app: str(body?.from?.app, 30) || 'roarme', project: str(body?.from?.project, 200), ext },
    }
    const { error } = await db.from('library').upsert({ id, workspace_id: ws, kind: 'location', data })
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, id })
  }

  return json({ error: 'Unknown action' }, 400)
})
