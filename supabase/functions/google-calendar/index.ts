// THEMADLIONS Projects · Google Calendar door (Supabase Edge Function "google-calendar")
//
// One shared Google account connects its calendars to the whole workspace (several read, one
// written to), the same shape as the "pcloud" function: a single secret the function holds, nothing the browser
// ever sees except what it is explicitly handed back once (the refresh token, during setup).
//
// Deploy: Supabase > Edge Functions > Deploy a new function > via Editor, name
// "google-calendar", paste this file, Deploy. Secrets (Edge Functions > Secrets):
//   GOOGLE_CLIENT_ID       from Google Cloud Console > APIs & Services > Credentials
//   GOOGLE_CLIENT_SECRET   same place, the OAuth client's secret
//   GOOGLE_REFRESH_TOKEN   from "Connect Google Calendar" in Settings > Integrations, pasted in
//                          here once; this is the long-lived credential, like PCLOUD_TOKEN
//
// Actions (POST, JSON): connect · calendars · pull · upsert · delete. See src/lib/googleCalendar.js.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || ''
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
const REFRESH_TOKEN = Deno.env.get('GOOGLE_REFRESH_TOKEN') || ''
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/calendar/v3'
// A call time is a wall clock time, same convention as the app's own .ics export; this one city
// is the only one that matters here, so it is simpler than a setting nobody would ever change.
const TIME_ZONE = 'Europe/Athens'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const addDaysISO = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/* A fresh access token from the one long-lived refresh token. Minted on every call rather than
   cached: at this app's scale a handful of extra token requests costs nothing, and it means
   there is no cache to get stale or to reason about across function instances. */
async function accessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set in the function secrets.')
  if (!REFRESH_TOKEN) throw new Error('GOOGLE_REFRESH_TOKEN is not set yet — connect in Settings > Integrations first.')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: REFRESH_TOKEN, grant_type: 'refresh_token' }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) throw new Error(data.error_description || data.error || `Google refused the token refresh (${res.status}).`)
  return data.access_token as string
}

async function gcal(method: string, path: string, token: string, body?: any) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return {}
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `Google Calendar answered ${res.status}.`)
  return data
}

/* Our event -> Google's shape. All-day uses the same inclusive-start/exclusive-end convention
   the app's own .ics export already uses, so the two never disagree about where a multi-day
   event ends. */
function toGoogleEvent(e: any) {
  const last = e.endDate && e.endDate > e.date ? e.endDate : e.date
  const body: any = {
    summary: e.title || '(untitled)',
    extendedProperties: { private: { tmlId: e.id } },
  }
  if (e.locationText) body.location = e.locationText
  if (e.notes) body.description = e.notes
  if (e.start) {
    const endTime = last === e.date && (!e.end || e.end < e.start) ? e.start : (e.end || e.start)
    body.start = { dateTime: `${e.date}T${e.start}:00`, timeZone: TIME_ZONE }
    body.end = { dateTime: `${last}T${endTime}:00`, timeZone: TIME_ZONE }
  } else {
    body.start = { date: e.date }
    body.end = { date: addDaysISO(last, 1) }
  }
  return body
}

/* Google's shape -> ours. A tmlId in extendedProperties means we created it; its absence means
   someone added it straight in Google Calendar, so the app shows it as its own, separate event. */
function fromGoogleEvent(g: any) {
  const allDay = !!g.start?.date
  const startDate = g.start?.date || g.start?.dateTime?.slice(0, 10) || ''
  const endExclusive = g.end?.date || g.end?.dateTime?.slice(0, 10) || startDate
  const endDate = allDay ? (endExclusive > addDaysISO(startDate, 1) ? addDaysISO(endExclusive, -1) : '') : (endExclusive !== startDate ? endExclusive : '')
  return {
    googleEventId: g.id,
    tmlId: g.extendedProperties?.private?.tmlId || '',
    title: g.summary || '(untitled)',
    date: startDate,
    endDate,
    start: allDay ? '' : (g.start?.dateTime || '').slice(11, 16),
    end: allDay ? '' : (g.end?.dateTime || '').slice(11, 16),
    locationText: g.location || '',
    notes: g.description || '',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const auth = req.headers.get('Authorization') || ''
  const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || ''
  const db = createClient(Deno.env.get('SUPABASE_URL') || '', apikey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: userData } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
  const uid = userData?.user?.id
  if (!uid) return json({ error: 'Not signed in.' }, 401)

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')

    // Setup only: connecting the account and choosing which calendar is an administrator's call,
    // same as pCloud's own ping.
    if (action === 'connect' || action === 'calendars') {
      const { data: adm } = await db.rpc('is_admin')
      if (!adm) return json({ error: 'Administrators only.' }, 403)
    }

    if (action === 'connect') {
      if (!CLIENT_ID || !CLIENT_SECRET) return json({ error: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set in the function secrets yet.' }, 500)
      if (!body.code || !body.redirectUri) return json({ error: 'No authorization code.' }, 400)
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code: body.code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: body.redirectUri, grant_type: 'authorization_code' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return json({ error: data.error_description || data.error || `Google refused the exchange (${res.status}).` }, 502)
      if (!data.refresh_token) return json({ error: 'Google did not send a refresh token. Remove the app\'s access at myaccount.google.com/permissions and connect again — Google only hands one out the first time, or when access was revoked first.' }, 502)
      return json({ ok: true, refreshToken: data.refresh_token })
    }

    if (action === 'calendars') {
      const token = await accessToken()
      const data = await gcal('GET', '/users/me/calendarList', token)
      const items = (data.items || []).map((c: any) => ({ id: c.id, summary: c.summary, primary: !!c.primary, color: c.backgroundColor || '' }))
      return json({ ok: true, calendars: items })
    }

    if (action === 'pull') {
      if (!body.calendarId) return json({ error: 'No calendar chosen yet.' }, 400)
      const token = await accessToken()
      const params = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', maxResults: '2500' })
      if (body.timeMin) params.set('timeMin', body.timeMin)
      if (body.timeMax) params.set('timeMax', body.timeMax)
      const data = await gcal('GET', `/calendars/${encodeURIComponent(body.calendarId)}/events?${params}`, token)
      const events = (data.items || []).filter((g: any) => g.status !== 'cancelled').map(fromGoogleEvent)
      return json({ ok: true, events })
    }

    if (action === 'upsert') {
      if (!body.calendarId) return json({ error: 'No calendar chosen yet.' }, 400)
      if (!body.event?.id) return json({ error: 'No event.' }, 400)
      const token = await accessToken()
      const gBody = toGoogleEvent(body.event)
      const data = body.event.googleEventId
        ? await gcal('PATCH', `/calendars/${encodeURIComponent(body.calendarId)}/events/${encodeURIComponent(body.event.googleEventId)}`, token, gBody)
        : await gcal('POST', `/calendars/${encodeURIComponent(body.calendarId)}/events`, token, gBody)
      return json({ ok: true, googleEventId: data.id })
    }

    if (action === 'delete') {
      if (!body.calendarId || !body.googleEventId) return json({ error: 'Nothing to delete.' }, 400)
      const token = await accessToken()
      try {
        await gcal('DELETE', `/calendars/${encodeURIComponent(body.calendarId)}/events/${encodeURIComponent(body.googleEventId)}`, token)
      } catch (e) {
        // Already gone on Google's side is not a failure from here.
        if (!/404|410|not\s*found/i.test((e as Error).message)) throw e
      }
      return json({ ok: true })
    }

    return json({ error: `Unknown action "${action}".` }, 400)
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 500)
  }
})
