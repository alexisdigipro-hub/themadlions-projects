// THEMADLIONS Projects · "New sign-in to the TML Hub" (Edge Function "signin-alert", 26 Nov 2026)
//
// Alex: "when someone signs in to my account, show me who and from where, like Facebook or Instagram". The database
// (supabase/sign_ins.sql, trigger signin_new_device on auth.sessions) calls this when a sign-in comes from a browser
// the account has not used in 90 days; it emails the person. Only the database can call it: the header x-signin-hook
// must be the token in public.signin_hook, which only the service role reads. No place is looked up (Alex: without the
// city), only what the browser says it is and the time. Sent through Resend with the hub's RESEND_API_KEY.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const esc = (s: string) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c])
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/

// "iPhone · Safari", "Mac · Chrome", from the browser's own description
function device(ua: string) {
  const u = String(ua || '')
  const os = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Mac OS X|Macintosh/.test(u) ? 'Mac'
    : /Windows/.test(u) ? 'Windows' : /Linux/.test(u) ? 'Linux' : 'A device'
  const br = /Edg\//.test(u) ? 'Edge' : /OPR\/|Opera/.test(u) ? 'Opera' : /Firefox\/|FxiOS/.test(u) ? 'Firefox' : /CriOS|Chrome\//.test(u) ? 'Chrome'
    : /Safari\//.test(u) ? 'Safari' : /Electron/.test(u) ? 'App' : ''
  return br ? `${os} · ${br}` : os
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false } })
  const { data: hook } = await db.from('signin_hook').select('token').eq('id', 1).maybeSingle()
  const given = req.headers.get('x-signin-hook') || ''
  if (!hook?.token || given !== String(hook.token)) return json({ error: 'No.' }, 403)

  const body = await req.json().catch(() => ({}))
  const to = String(body.email || '').trim()
  if (!EMAIL.test(to)) return json({ error: 'No address.' }, 400)
  const key = Deno.env.get('RESEND_API_KEY') || ''
  if (!key) return json({ error: 'RESEND_API_KEY missing' }, 501)
  const from = Deno.env.get('RESEND_FROM') || 'THE MAD LIONS <noreply@themadlions.com>'
  const what = device(body.ua)
  const when = new Date(body.at || Date.now()).toLocaleString('en-GB', { timeZone: 'Europe/Athens', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  const first = String(body.name || '').trim().split(/\s+/)[0] || 'there'
  const link = 'https://hub.themadlions.com/#/settings?tab=profile'
  const html = `<!doctype html><html><head><meta name="color-scheme" content="light"></head><body style="margin:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:22px;padding:30px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#17181c;">
<tr><td style="font-size:12px;letter-spacing:2px;color:#6b7079;">THEMADLIONS · HUB</td></tr>
<tr><td style="padding-top:14px;font-size:22px;font-weight:700;">New sign-in to your account</td></tr>
<tr><td style="padding-top:10px;font-size:15px;line-height:1.5;color:#3b3e46;">Hi ${esc(first)}, your TML Hub account was just signed in to from a device it has not used before.</td></tr>
<tr><td style="padding-top:18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;border-radius:14px;">
<tr><td style="padding:14px 16px;font-size:12px;color:#6b7079;">Device</td><td style="padding:14px 16px;font-size:15px;font-weight:600;text-align:right;">${esc(what)}</td></tr>
<tr><td style="padding:0 16px 14px;font-size:12px;color:#6b7079;">When</td><td style="padding:0 16px 14px;font-size:15px;font-weight:600;text-align:right;">${esc(when)}</td></tr>
</table></td></tr>
<tr><td style="padding-top:18px;font-size:14px;line-height:1.5;color:#3b3e46;">If this was you, there is nothing to do. If it wasn't, sign that device out and change your password.</td></tr>
<tr><td align="center" style="padding-top:22px;"><a href="${link}" style="display:inline-block;background:#17181c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 26px;border-radius:999px;">Check your devices</a></td></tr>
</table></td></tr></table></body></html>`
  const text = `New sign-in to your TML Hub account\n\nDevice: ${what}\nWhen: ${when}\n\nIf this was you, there is nothing to do. If it wasn't, sign that device out and change your password: ${link}`
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: `New sign-in: ${what}`, html, text }),
  })
  if (!r.ok) return json({ error: `Resend ${r.status}` }, 502)
  return json({ ok: true })
})
