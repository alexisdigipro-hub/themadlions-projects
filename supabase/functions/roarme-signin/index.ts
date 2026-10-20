// THEMADLIONS Projects · roarme-signin (Supabase Edge Function, verify_jwt off: it checks every caller itself)
//
// "Sign in with THEMADLIONS Hub" in RoarMe, and a RoarMe account for the whole team (Alex, 20 Oct 2026: one account,
// the hub's email and password). Needs supabase/roarme_signin.sql and roarme_link.sql. No password ever leaves the hub.
//
// Actions (POST JSON):
//   code      { state }  member's own token  -> { code }   a one-time code (2 min) for the RoarMe tab that sent them here
//   redeem    { code, state }  x-roarme-secret -> { hub_user_id, email, name }   RoarMe's server, never a browser
//   confirm   { hub_user_id, roar_user_id, username, display_name }  x-roarme-secret -> { ok }   RoarMe made / found the account
//   provision  administrator's token -> { people: [{ name, username, created }] }   a RoarMe account for every active member

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const ROARME_SIGNIN = 'https://bzmjhbnwhdwmncxkqkdl.supabase.co/functions/v1/roar-hub-signin'
const CORS = {
  'Access-Control-Allow-Origin': 'https://hub.themadlions.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const STATE = /^[A-Za-z0-9_-]{24,64}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const enc = new TextEncoder()

async function same(a: string, b: string) {
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))))
  const u = new Uint8Array(x), v = new Uint8Array(y)
  let d = 0
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i]
  return d === 0 && a.length === b.length
}
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'not found' }, 404)
  const url = Deno.env.get('SUPABASE_URL')!
  const sb = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: conf } = await sb.from('roarme_conf').select('secret').eq('id', 1).maybeSingle()
  if (!conf?.secret) return json({ error: 'RoarMe is not set up yet.' }, 500)

  let body: any = {}
  try { body = await req.json() } catch { return json({ error: 'bad request' }, 400) }

  // ---- calls from RoarMe's server: the shared secret
  if (body.action === 'redeem' || body.action === 'confirm') {
    if (!(await same(req.headers.get('x-roarme-secret') || '', conf.secret))) return json({ error: 'not allowed' }, 401)
    if (body.action === 'redeem') {
      const code = String(body.code || ''), state = String(body.state || '')
      if (!/^[0-9a-f]{48}$/.test(code) || !STATE.test(state)) return json({ error: 'bad request' }, 400)
      const { data: row } = await sb.from('roarme_signin_codes').update({ used_at: new Date().toISOString() })
        .eq('code', code).is('used_at', null).gt('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
        .select('user_id, state').maybeSingle()
      if (!row || !(await same(row.state, state))) return json({ error: 'This sign-in expired. Try again.' }, 400)
      const { data: m } = await sb.from('members').select('name, email, active').eq('user_id', row.user_id).maybeSingle()
      if (!m || m.active === false) return json({ error: 'Only active team members can sign in with the hub.' }, 403)
      const { data: u } = await sb.auth.admin.getUserById(row.user_id)
      const email = u?.user?.email || m.email
      if (!email) return json({ error: 'This hub account has no email.' }, 400)
      return json({ hub_user_id: row.user_id, email, name: m.name || '' })
    }
    // confirm: RoarMe found or made the account and linked it on its side; the hub writes its own row
    const hubUser = String(body.hub_user_id || ''), roarUser = String(body.roar_user_id || '')
    if (!UUID.test(hubUser) || !UUID.test(roarUser)) return json({ error: 'bad request' }, 400)
    const { data: m } = await sb.from('members').select('workspace_id').eq('user_id', hubUser).maybeSingle()
    if (!m) return json({ error: 'not a member' }, 400)
    await sb.from('roarme_links').delete().eq('roar_user_id', roarUser).neq('user_id', hubUser)
    await sb.from('roarme_links').upsert({ user_id: hubUser, workspace_id: m.workspace_id, roar_user_id: roarUser, roar_username: String(body.username || ''), roar_name: String(body.display_name || ''), linked_at: new Date().toISOString() })
    return json({ ok: true })
  }

  // ---- calls from the hub's own pages: the member's token
  const auth = req.headers.get('Authorization') || ''
  const asMember = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: who } = await asMember.auth.getUser()
  const user = who?.user
  if (!user) return json({ error: 'Sign in again.' }, 401)
  const { data: me } = await sb.from('members').select('workspace_id, role, active').eq('user_id', user.id).maybeSingle()
  if (!me || me.active === false) return json({ error: 'Only active team members can use RoarMe through the hub.' }, 403)

  if (body.action === 'code') {
    const state = String(body.state || '')
    if (!STATE.test(state)) return json({ error: 'bad request' }, 400)
    await sb.from('roarme_signin_codes').delete().lt('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    const { count } = await sb.from('roarme_signin_codes').select('code', { count: 'exact', head: true })
      .eq('user_id', user.id).gt('created_at', new Date(Date.now() - 3600 * 1000).toISOString())
    if ((count || 0) >= 20) return json({ error: 'Too many tries. Wait a while and try again.' }, 429)
    const code = hex(24)
    const { error } = await sb.from('roarme_signin_codes').insert({ code, user_id: user.id, state })
    if (error) return json({ error: 'Could not start the sign-in.' }, 500)
    return json({ code })
  }

  if (body.action === 'provision') {
    if (me.role !== 'admin') return json({ error: 'Only administrators can do this.' }, 403)
    const { data: members } = await sb.from('members').select('user_id, name, email').eq('workspace_id', me.workspace_id).eq('active', true)
    const people = []
    for (const m of members || []) {
      const { data: u } = await sb.auth.admin.getUserById(m.user_id)
      const email = u?.user?.email || m.email
      if (email) people.push({ hub_user_id: m.user_id, email, name: m.name || '' })
    }
    const res = await fetch(ROARME_SIGNIN, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hub-secret': conf.secret }, body: JSON.stringify({ action: 'provision', people }) })
    let out: any = null
    try { out = await res.json() } catch { /* keep null */ }
    if (!res.ok || !out || out.error) return json({ error: out?.error || `RoarMe answered ${res.status}.` }, 502)
    const byHub = new Map(people.map((p) => [p.hub_user_id, p]))
    const summary = []
    for (const r of out.people || []) {
      const p = byHub.get(r.hub_user_id)
      if (!p) continue
      if (r.roar_user_id) {
        await sb.from('roarme_links').delete().eq('roar_user_id', r.roar_user_id).neq('user_id', r.hub_user_id)
        await sb.from('roarme_links').upsert({ user_id: r.hub_user_id, workspace_id: me.workspace_id, roar_user_id: r.roar_user_id, roar_username: r.username || '', roar_name: r.display_name || '', linked_at: new Date().toISOString() })
      }
      summary.push({ name: p.name, username: r.username || '', created: !!r.created, error: r.error || '' })
    }
    return json({ people: summary })
  }

  return json({ error: 'bad request' }, 400)
})
