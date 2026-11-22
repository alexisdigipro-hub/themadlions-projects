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
