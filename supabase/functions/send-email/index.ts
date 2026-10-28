// THEMADLIONS Projects · send an email from the hub (Supabase Edge Function "send-email", 28 Oct 2026)
//
// Alex: the invoice and delivery emails should arrive the way they look in the hub, like the newsletters he gets.
// A pasted email loses its look in some mail apps, so the hub sends it itself, through Resend (resend.com).
//
// Secrets (Supabase > Edge Functions > Secrets), set by Alex, never in the repo:
//   RESEND_API_KEY   the API key from resend.com > API Keys
//   RESEND_FROM      optional, who it comes from; without it THE MAD LIONS <noreply@themadlions.com> (themadlions.com is
//                    verified in the same Resend account RoarTransfer sends from)
//
// Only a signed-in team member may send: an administrator, or someone with the Share permission. At most 10
// recipients a message and 40 messages an hour a person, so a lost session cannot be turned into a spam cannon.
// Replies go to the person who sent it.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/
const sent = new Map<string, number[]>() // per person, the times of the last hour (kept while the function is warm)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const auth = req.headers.get('Authorization') || ''
  const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || ''
  const db = createClient(Deno.env.get('SUPABASE_URL') || '', apikey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: u } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
  const user = u?.user
  if (!user?.id) return json({ error: 'Not signed in.' }, 401)
  const [{ data: ws }, { data: adm }, { data: perm }] = await Promise.all([db.rpc('my_ws'), db.rpc('is_admin'), db.rpc('my_perm', { p_module: 'share' })])
  if (!ws) return json({ error: 'Not a team member.' }, 403)
  if (!adm && perm !== 'edit' && perm !== 'view') return json({ error: 'Sending emails needs the Share permission.' }, 403)

  const key = Deno.env.get('RESEND_API_KEY') || ''
  const from = Deno.env.get('RESEND_FROM') || 'THE MAD LIONS <noreply@themadlions.com>'
  if (!key) return json({ error: 'Sending is not set up yet: RESEND_API_KEY is missing in Supabase > Edge Functions > Secrets.' }, 501)

  let body: any = {}
  try { body = await req.json() } catch { return json({ error: 'bad request' }, 400) }
  const list = (x: any) => (Array.isArray(x) ? x : String(x || '').split(/[,;\s]+/)).map((s: string) => String(s).trim()).filter(Boolean)
  const to = list(body.to), cc = list(body.cc), bcc = body.copyMe && user.email ? [user.email] : []
  const all = [...to, ...cc]
  if (!to.length) return json({ error: 'Write who it goes to.' }, 400)
  const bad = all.find((e) => !EMAIL.test(e))
  if (bad) return json({ error: `"${bad}" is not an email address.` }, 400)
  if (all.length > 10) return json({ error: 'At most 10 people at a time.' }, 400)
  const subject = String(body.subject || '').trim().slice(0, 200)
  const html = String(body.html || '')
  const text = String(body.text || '').slice(0, 50000)
  if (!subject || !html) return json({ error: 'The email is empty.' }, 400)
  if (html.length > 400000) return json({ error: 'The email is too big.' }, 413)

  const now = Date.now()
  const mine = (sent.get(user.id) || []).filter((t) => now - t < 3600e3)
  if (mine.length >= 40) return json({ error: 'That is a lot of emails in one hour. Try again a little later.' }, 429)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, cc: cc.length ? cc : undefined, bcc: bcc.length ? bcc : undefined, reply_to: user.email || undefined, subject, html, text: text || undefined }),
  })
  const out: any = await res.json().catch(() => ({}))
  if (!res.ok) return json({ error: out?.message || `The email service answered ${res.status}.` }, 502)
  mine.push(now)
  sent.set(user.id, mine)
  return json({ ok: true, id: out?.id || '' })
})
