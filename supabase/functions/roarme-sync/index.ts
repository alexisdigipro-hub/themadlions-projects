// THEMADLIONS Projects · roarme-sync (Supabase Edge Function, verify_jwt off: it checks its callers itself)
//
// Phase 3 of the chat moving onto RoarMe (Alex, 20 Oct 2026). Needs supabase/roarme_sync.sql. Keeps every
// switched-on project's RoarMe group in step with the hub, through RoarMe's function roar-hub-bridge (shared
// secret in roarme_conf.secret). Only two kinds of caller get in:
//   * the database itself (triggers -> roarme_kick, header x-sync-token = roarme_conf.sync_token);
//   * a signed-in active administrator (Sync now), with their own Supabase token.
//
// One run looks at every project in roarme_sync_plan(): a switched-on project gets project_sync (its group made if
// needed, its members exactly the linked people who belong; anyone else out); a project switched off or deleted
// gets project_close. The outcome of each lands in roarme_groups. Runs are idempotent, so two at once are harmless.
//
// POST { action: 'run' } -> { projects: [{ project_id, enabled, members?, added?, removed?, error? }] }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const BRIDGE = 'https://bzmjhbnwhdwmncxkqkdl.supabase.co/functions/v1/roar-hub-bridge'
const CORS = {
  'Access-Control-Allow-Origin': 'https://hub.themadlions.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const enc = new TextEncoder()

async function same(a: string, b: string) {
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))))
  const u = new Uint8Array(x), v = new Uint8Array(y)
  let d = 0
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i]
  return d === 0 && a.length === b.length
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'not found' }, 404)
  const url = Deno.env.get('SUPABASE_URL')!
  const sb = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const { data: conf } = await sb.from('roarme_conf').select('secret, sync_token').eq('id', 1).maybeSingle()
  if (!conf?.secret || !conf?.sync_token) return json({ error: 'RoarMe sync is not set up yet.' }, 500)

  // who is calling: the database's own token, or an active administrator
  const token = req.headers.get('x-sync-token') || ''
  let allowed = token.length > 0 && await same(token, conf.sync_token)
  if (!allowed) {
    const auth = req.headers.get('Authorization') || ''
    if (auth) {
      const asMember = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
      const { data: who } = await asMember.auth.getUser()
      if (who?.user) {
        const { data: m } = await sb.from('members').select('role, active').eq('user_id', who.user.id).maybeSingle()
        allowed = !!m && m.active !== false && m.role === 'admin'
      }
    }
  }
  if (!allowed) return json({ error: 'not allowed' }, 401)

  const bridge = async (body: any) => {
    const res = await fetch(BRIDGE, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hub-secret': conf.secret }, body: JSON.stringify(body) })
    let out: any = null
    try { out = await res.json() } catch { /* keep null */ }
    if (!res.ok || !out || out.error) throw new Error(out?.error || `RoarMe answered ${res.status}.`)
    return out
  }

  const { data: plan, error } = await sb.rpc('roarme_sync_plan')
  if (error) return json({ error: error.message }, 500)

  const results: any[] = []
  for (const p of plan || []) {
    const now = new Date().toISOString()
    try {
      if (p.enabled) {
        const r = await bridge({ action: 'project_sync', project: p.project_id, title: p.title, hub_users: p.people || [] })
        await sb.from('roarme_groups').upsert({ project_id: p.project_id, workspace_id: p.workspace_id, room_id: r.room, members: r.members, synced_at: now, closed_at: null, last_error: '' })
        results.push({ project_id: p.project_id, enabled: true, members: r.members, added: r.added, removed: r.removed })
      } else {
        const r = await bridge({ action: 'project_close', project: p.project_id })
        await sb.from('roarme_groups').update({ members: 0, synced_at: now, closed_at: now, last_error: '' }).eq('project_id', p.project_id)
        results.push({ project_id: p.project_id, enabled: false, removed: r.removed })
      }
    } catch (e) {
      const msg = ((e as Error).message || 'failed').slice(0, 300)
      await sb.from('roarme_groups').upsert({ project_id: p.project_id, workspace_id: p.workspace_id, last_error: msg, synced_at: now }, { onConflict: 'project_id' })
      results.push({ project_id: p.project_id, enabled: p.enabled, error: msg })
    }
  }
  return json({ projects: results })
})
