// THEMADLIONS Projects · calendar feed reader (Supabase Edge Function "ical")
//
// Read-only. The app hands it the address of a published calendar (a Google Calendar's "secret
// address in iCal format", or any other .ics link) and it hands back the file's text. The
// browser cannot fetch one itself: Google serves those files without a CORS header, so the
// request has to be made somewhere other than the page.
//
// Deploy: Supabase > Edge Functions > Deploy a new function > via Editor, name "ical", paste
// this file, Deploy. No secrets: the address itself is the credential, and it is kept in the
// workspace settings like the rest of the integrations.
//
// Only signed-in members may call it, and only the hosts below may be fetched, so the function
// cannot be turned into a way to probe the network from the inside.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED = [
  'calendar.google.com',
  'www.google.com',
  'calendar.google.co.uk',
  'outlook.office365.com',
  'outlook.live.com',
  'p01-caldav.icloud.com',
  'webcal.icloud.com',
]
const MAX_BYTES = 8 * 1024 * 1024

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/* webcal:// is the same file over https; anything else must be https to a known calendar host. */
function checkUrl(raw: string) {
  let u: URL
  try { u = new URL(String(raw).trim().replace(/^webcal:\/\//i, 'https://')) } catch { throw new Error('That does not look like a web address.') }
  if (u.protocol !== 'https:') throw new Error('The address has to start with https:// (or webcal://).')
  const host = u.hostname.toLowerCase()
  if (!ALLOWED.includes(host)) throw new Error(`${host} is not one of the calendar services this reads (${ALLOWED.join(', ')}). Ask for it to be added if you use another one.`)
  return u
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const auth = req.headers.get('Authorization') || ''
  const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || ''
  const db = createClient(Deno.env.get('SUPABASE_URL') || '', apikey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: userData } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
  if (!userData?.user?.id) return json({ error: 'Not signed in.' }, 401)

  try {
    const body = await req.json().catch(() => ({}))
    const url = checkUrl(body.url || '')
    const res = await fetch(url, { headers: { Accept: 'text/calendar, text/plain, */*' }, redirect: 'follow' })
    if (!res.ok) {
      if (res.status === 404) return json({ error: 'That calendar address was not found. In Google Calendar, check the "Secret address in iCal format" under the calendar\'s settings — it changes if you reset it.' }, 404)
      return json({ error: `The calendar service answered ${res.status}.` }, 502)
    }
    const text = await res.text()
    if (text.length > MAX_BYTES) return json({ error: 'That calendar is too big to read in one go.' }, 413)
    if (!/BEGIN:VCALENDAR/i.test(text)) return json({ error: 'That address did not give back a calendar file. Use the iCal (.ics) address, not the page you look at the calendar on.' }, 422)
    return json({ ok: true, text })
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 400)
  }
})
