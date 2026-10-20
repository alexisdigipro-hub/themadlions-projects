// THEMADLIONS Projects · roarme-link (Supabase Edge Function)
//
// Links a member's own RoarMe account (Settings > My profile > RoarMe). Phase 1 of moving the hub's chat onto
// RoarMe (Alex, 20 Oct 2026). Needs supabase/roarme_link.sql. Every call carries the signed-in member's own
// Supabase token; the function checks it is an active member, then does the work with the service key.
//
// It talks to RoarMe's function roar-hub-link with the shared secret in roarme_conf. It never sees a RoarMe
// password or sign-in token: RoarMe hands the hub window a one-time code, made only after the person pressed
// Approve in RoarMe, and this function redeems it.
//
// Actions (POST JSON):
//   start  -> { state }                    a fresh state for the RoarMe window, good for 10 minutes
//   finish { state, code } -> { link }     redeem RoarMe's code; the state must be this member's own
//   status -> { link | null }              also drops the link here if the person removed it in RoarMe
//   unlink -> { ok }                       removes it on both sides

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const ROARME = 'https://bzmjhbnwhdwmncxkqkdl.supabase.co/functions/v1/roar-hub-link'
const CORS = {
  'Access-Control-Allow-Origin': 'https://hub.themadlions.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const STATE = /^[A-Za-z0-9_-]{24,64}$/

const newState = () => {
  const b = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'not found' }, 404)

  const url = Deno.env.get('SUPABASE_URL')!
  const auth = req.headers.get('Authorization') || ''
  const asMember = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: who } = await asMember.auth.getUser()
  const user = who?.user
  if (!user) return json({ error: 'Sign in again.' }, 401)

  const sb = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: member } = await sb.from('members').select('workspace_id, name, active').eq('user_id', user.id).maybeSingle()
  if (!member || member.active === false) return json({ error: 'Only team members can link RoarMe.' }, 403)

  const { data: conf } = await sb.from('roarme_conf').select('secret').eq('id', 1).maybeSingle()
  if (!conf?.secret) return json({ error: 'RoarMe linking is not set up yet.' }, 500)
  const roarme = async (body: any) => {
    const res = await fetch(ROARME, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hub-secret': conf.secret }, body: JSON.stringify({ ...body, hub_user_id: user.id }) })
    let out: any = null
    try { out = await res.json() } catch { /* keep null */ }
    if (!res.ok || !out || out.error) throw new Error(out?.error || `RoarMe answered ${res.status}.`)
    return out
  }

  let body: any = {}
  try { body = await req.json() } catch { return json({ error: 'bad request' }, 400) }

  try {
    if (body.action === 'start') {
      await sb.from('roarme_link_states').delete().lt('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      const { count } = await sb.from('roarme_link_states').select('state', { count: 'exact', head: true })
        .eq('user_id', user.id).gt('created_at', new Date(Date.now() - 3600 * 1000).toISOString())
      if ((count || 0) >= 10) return json({ error: 'Too many tries. Wait a while and try again.' }, 429)
      const state = newState()
      const { error } = await sb.from('roarme_link_states').insert({ state, user_id: user.id })
      if (error) return json({ error: 'Could not start linking.' }, 500)
      return json({ state })
    }

    if (body.action === 'finish') {
      const state = String(body.state || ''), code = String(body.code || '')
      if (!STATE.test(state) || !/^[0-9a-f]{48}$/.test(code)) return json({ error: 'bad request' }, 400)
      // the state is used up here whatever happens next, and only counts if this member started it in the last 10 minutes
      const { data: st } = await sb.from('roarme_link_states').delete().eq('state', state).eq('user_id', user.id)
        .gt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()).select('state').maybeSingle()
      if (!st) return json({ error: 'This link request expired. Press Connect again.' }, 400)
      const r = await roarme({ action: 'redeem', state, code, hub_name: member.name || user.email || '' })
      // one RoarMe account, one hub member
      await sb.from('roarme_links').delete().eq('roar_user_id', r.user_id).neq('user_id', user.id)
      const link = { user_id: user.id, workspace_id: member.workspace_id, roar_user_id: r.user_id, roar_username: r.username || '', roar_name: r.display_name || '', linked_at: new Date().toISOString() }
      const { error } = await sb.from('roarme_links').upsert(link)
      if (error) return json({ error: 'Could not save the link.' }, 500)
      return json({ link })
    }

    if (body.action === 'status') {
      const { data: link } = await sb.from('roarme_links').select('*').eq('user_id', user.id).maybeSingle()
      if (!link) return json({ link: null })
      const r = await roarme({ action: 'status' })
      if (!r.linked || r.user_id !== link.roar_user_id) {
        await sb.from('roarme_links').delete().eq('user_id', user.id)
        return json({ link: null, removed: true })
      }
      if (r.username !== link.roar_username || r.display_name !== link.roar_name) {
        await sb.from('roarme_links').update({ roar_username: r.username, roar_name: r.display_name }).eq('user_id', user.id)
      }
      return json({ link: { ...link, roar_username: r.username, roar_name: r.display_name } })
    }

    if (body.action === 'unlink') {
      // the hub's side goes first, so the link is off here even if RoarMe cannot be reached right now
      await sb.from('roarme_links').delete().eq('user_id', user.id)
      await roarme({ action: 'unlink' })
      return json({ ok: true })
    }
  } catch (e) {
    return json({ error: (e as Error).message || 'Something went wrong.' }, 502)
  }

  return json({ error: 'bad request' }, 400)
})
