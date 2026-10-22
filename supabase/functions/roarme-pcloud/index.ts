// THEMADLIONS Projects · roarme-pcloud (Supabase Edge Function, verify_jwt off: only RoarMe's server, with the shared secret)
//
// RoarTransfer into Alex's pCloud (Alex, 22 Oct 2026: "a tick on my own profile only, to upload to the pCloud we have
// connected"). RoarMe's function roar-pcloud calls this for its signed-in admin, with x-roarme-secret = roarme_conf.secret,
// the hub member linked to that RoarMe account, and a short-lived download address of the file (RoarTransfer's R2 bucket
// or RoarMe's storage).
// pCloud fetches the file itself from that address (downloadfileasync), so no bytes pass through here and a 3 GB file
// fits; it lands in ROOT/RoarTransfer/<YYYY-MM>. Only a linked hub member who is an administrator of the hub.
// The pCloud token is this project's secret PCLOUD_TOKEN (the same the pcloud function uses).
//
// POST { hub_user_id, url, name } -> { ok: true, path }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const HOST = Deno.env.get('PCLOUD_HOST') || 'eapi.pcloud.com'
const TOKEN = Deno.env.get('PCLOUD_TOKEN') || ''
const ROOT = '/' + (Deno.env.get('PCLOUD_ROOT') || '/TML HUB').replace(/^\/+|\/+$/g, '')
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const enc = new TextEncoder()

async function same(a: string, b: string) {
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))))
  const u = new Uint8Array(x), v = new Uint8Array(y)
  let d = 0
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i]
  return d === 0 && a.length === b.length
}

async function pc(method: string, params: Record<string, any> = {}) {
  const url = new URL(`https://${HOST}/${method}`)
  url.searchParams.set('access_token', TOKEN)
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  const res = await fetch(url)
  const data = await res.json().catch(() => ({ result: -1, error: `pCloud answered ${res.status}` }))
  if (data.result !== 0) throw new Error(data.error ? `pCloud: ${data.error}` : `pCloud error ${data.result}`)
  return data
}
const segment = (s: any) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'file'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'not found' }, 404)
  if (!TOKEN) return json({ error: 'pCloud is not connected in the hub.' }, 500)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: conf } = await sb.from('roarme_conf').select('secret').eq('id', 1).maybeSingle()
  if (!conf?.secret || !(await same(req.headers.get('x-roarme-secret') || '', conf.secret))) return json({ error: 'not allowed' }, 401)
  let body: any = {}
  try { body = await req.json() } catch { return json({ error: 'bad request' }, 400) }
  const hubUser = String(body.hub_user_id || '')
  const src = String(body.url || '')
  if (!UUID.test(hubUser) || !/^https:\/\/(bzmjhbnwhdwmncxkqkdl\.supabase\.co\/storage\/v1\/object\/sign\/|[0-9a-f]{32}\.r2\.cloudflarestorage\.com\/roartransfer\/)/.test(src)) return json({ error: 'bad request' }, 400)
  const { data: link } = await sb.from('roarme_links').select('user_id').eq('user_id', hubUser).maybeSingle()
  if (!link) return json({ error: 'not linked' }, 403)
  const { data: m } = await sb.from('members').select('role').eq('user_id', hubUser).eq('active', true).limit(1).maybeSingle()
  if (m?.role !== 'admin') return json({ error: 'Only the hub administrator can save to pCloud.' }, 403)
  try {
    const month = new Date().toISOString().slice(0, 7)
    let path = ROOT
    let meta = (await pc('createfolderifnotexists', { path })).metadata
    for (const p of ['RoarTransfer', month]) { path += '/' + p; meta = (await pc('createfolderifnotexists', { path })).metadata }
    await pc('downloadfileasync', { url: src, folderid: Number(meta?.folderid), target: segment(body.name) })
    return json({ ok: true, path })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 502)
  }
})
