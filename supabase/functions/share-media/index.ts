// share-media: a file of a project shared with collaborators (Alex, 18 Nov 2026; src/lib/projectShare.js).
// The collaborator's page (pages/PublicProject.jsx), signed in to nothing, asks for one file of the link it has: the
// song to listen to, a photo to look at. It gets a short-lived address only if the link is a project link, open, not
// past its date, with its code when it has one (five wrong codes lock it for 15 minutes, as share_get does), and only
// for a file that link's snapshot lists in data.media. Files are shown and played, never offered for download.
// Supabase files: a signed URL for 10 minutes from the private bucket. pCloud files: pCloud's own file link.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const HOST = Deno.env.get('PCLOUD_HOST') || 'eapi.pcloud.com'
const TOKENS = [Deno.env.get('PCLOUD_FULL_TOKEN') || '', Deno.env.get('PCLOUD_TOKEN') || ''].filter(Boolean)
const BUCKETS = new Set(['audio', 'photos'])

async function pcloudLink(fileid: number) {
  for (const token of TOKENS) {
    const url = new URL(`https://${HOST}/getfilelink`)
    url.searchParams.set('access_token', token)
    url.searchParams.set('fileid', String(fileid))
    const r = await fetch(url).then((x) => x.json()).catch(() => null)
    if (r && r.result === 0 && r.path) return `https://${Array.isArray(r.hosts) && r.hosts.length ? r.hosts[0] : HOST}${r.path}`
  }
  return ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const body = await req.json().catch(() => ({}))
  const token = String(body.token || '')
  if (!/^[A-Za-z0-9-]{6,80}$/.test(token)) return json({ error: 'No link.' }, 400)
  const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false } })
  const { data: row } = await db.from('shares').select('kind, data, closed, expires_at, pin, pin_fails, pin_locked_until').eq('token', token).maybeSingle()
  if (!row || row.kind !== 'project') return json({ error: 'No link.' }, 404)
  const today = new Date().toISOString().slice(0, 10)
  if (row.closed || (row.expires_at && String(row.expires_at).slice(0, 10) < today)) return json({ error: 'This link is closed.' }, 403)
  if (String(row.pin || '') !== '') {
    if (row.pin_locked_until && new Date(row.pin_locked_until) > new Date()) return json({ error: 'Too many tries. Wait a few minutes.' }, 429)
    if (String(row.pin) !== String(body.pin || '').trim()) {
      const fails = (row.pin_fails || 0) + 1
      await db.from('shares').update(fails >= 5 ? { pin_fails: 0, pin_locked_until: new Date(Date.now() + 15 * 60000).toISOString() } : { pin_fails: fails }).eq('token', token)
      return json({ error: 'The code is not right.' }, 403)
    }
  }
  const media = Array.isArray(row.data?.media) ? row.data.media : []
  const fileid = Number(body.fileid) || 0
  const path = String(body.path || '')
  const bucket = String(body.b || '')
  const item = media.find((m: any) => (fileid && Number(m.fileid) === fileid) || (!fileid && path && m.path === path && m.b === bucket))
  if (!item) return json({ error: 'Not a file of this link.' }, 403)
  if (item.fileid) {
    const url = await pcloudLink(Number(item.fileid))
    return url ? json({ url }) : json({ error: 'pCloud did not give the file.' }, 502)
  }
  if (!BUCKETS.has(item.b)) return json({ error: 'Not a file of this link.' }, 403)
  const { data, error } = await db.storage.from(item.b).createSignedUrl(item.path, 600)
  if (error || !data?.signedUrl) return json({ error: 'The file could not be opened.' }, 502)
  return json({ url: data.signedUrl })
})
