// THEMADLIONS Projects · roarme-work (Supabase Edge Function, verify_jwt off: only RoarMe's server, with the shared secret)
//
// RoarMe shows a member's hub tasks and calendar (Alex, 20 Oct 2026: phase 6; the hub stays the one source).
// Needs supabase/roarme_work.sql. RoarMe's function roar-hub-work calls this for the signed-in RoarMe person's linked
// hub member, with x-roarme-secret = roarme_conf.secret; the answer follows exactly the hub's own rules for that member
// (roarme_member_work: Tasks / Calendar permission, projects they can see, calendar types they may see).
//
// POST { hub_user_id } -> { tasks: [...], events: [...], canTasks, canCalendar }

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'not found' }, 404)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: conf } = await sb.from('roarme_conf').select('secret').eq('id', 1).maybeSingle()
  if (!conf?.secret || !(await same(req.headers.get('x-roarme-secret') || '', conf.secret))) return json({ error: 'not allowed' }, 401)
  let body: any = {}
  try { body = await req.json() } catch { return json({ error: 'bad request' }, 400) }
  const hubUser = String(body.hub_user_id || '')
  if (!UUID.test(hubUser)) return json({ error: 'bad request' }, 400)
  // only for a member whose RoarMe link the hub knows too
  const { data: link } = await sb.from('roarme_links').select('user_id').eq('user_id', hubUser).maybeSingle()
  if (!link) return json({ error: 'not linked' }, 403)
  const { data, error } = await sb.rpc('roarme_member_work', { uid: hubUser })
  if (error) return json({ error: 'Could not read the hub.' }, 500)
  if (!data) return json({ tasks: [], events: [], canTasks: false, canCalendar: false })
  return json(data)
})
