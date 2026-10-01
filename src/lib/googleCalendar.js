// Google Calendar through the "google-calendar" Edge Function (supabase/functions/google-calendar/index.ts).
// One shared connection for the whole workspace, the same shape as pCloud: the browser never
// holds the long-lived credential, only the member's own Supabase session to call the function.
import { supabase } from './supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js'
import { uid } from './store.jsx'

/* Settings > Integrations > Google Calendar. Off until a calendar has actually been picked. */
export const gcalOn = (settings) => !!settings?.googleCalendarId

async function call(action, body) {
  if (!supabase) throw new Error('Google Calendar needs the online database.')
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in again.')
  let res
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    })
  } catch (e) {
    throw new Error(`Could not reach the Google Calendar function (${e.message}).`)
  }
  let out = null
  try { out = await res.json() } catch {}
  if (!res.ok || !out || out.error) {
    if (res.status === 404) throw new Error('The google-calendar function is not deployed yet: Supabase > Edge Functions > google-calendar.')
    throw new Error(out?.error || out?.message || `The Google Calendar function answered ${res.status}.`)
  }
  return out
}

/* A pull's results folded into the workspace's own events: an event tagged with our own id
   (tmlId) or already carrying a googleEventId from an earlier pull gets its fields refreshed in
   place; anything else is new, made straight in Google Calendar, and lands as its own event
   (type "google", no project) rather than being guessed into one. A past "google" event whose
   id is no longer in the pulled set was removed on Google's side, so it goes here too. */
export function reconcilePulledEvents(existingEvents, remoteEvents) {
  const byId = new Map(existingEvents.map((e) => [e.id, e]))
  const byGoogleId = new Map(existingEvents.filter((e) => e.googleEventId).map((e) => [e.googleEventId, e]))
  const seen = new Set()
  const out = [...existingEvents]
  for (const r of remoteEvents) {
    seen.add(r.googleEventId)
    const local = (r.tmlId && byId.get(r.tmlId)) || byGoogleId.get(r.googleEventId)
    const patch = { title: r.title, date: r.date, endDate: r.endDate, start: r.start, end: r.end, locationText: r.locationText, notes: r.notes, googleEventId: r.googleEventId }
    if (local) {
      const i = out.findIndex((e) => e.id === local.id)
      if (i >= 0) out[i] = { ...out[i], ...patch }
    } else {
      out.push({ id: uid(), type: 'google', projectId: '', createdBy: '', createdByName: 'Google Calendar', ...patch })
    }
  }
  return out.filter((e) => !(e.type === 'google' && e.googleEventId && !seen.has(e.googleEventId)))
}

export const gcalConnect = (code, redirectUri) => call('connect', { code, redirectUri })
export const gcalCalendars = () => call('calendars', {})
export const gcalPull = ({ calendarId, timeMin, timeMax }) => call('pull', { calendarId, timeMin, timeMax })
export const gcalUpsert = ({ calendarId, event }) => call('upsert', { calendarId, event })
export const gcalDelete = ({ calendarId, googleEventId }) => call('delete', { calendarId, googleEventId })

/* The code Google sent back after "Connect Google Calendar" (main.jsx catches the redirect and
   parks it here), so Settings can exchange it once and show the refresh token for copying into
   the function's secrets. */
export const OAUTH_KEY = 'tml_google_oauth'
export function takeOauthCode() {
  try { const raw = sessionStorage.getItem(OAUTH_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
export function clearOauthCode() {
  try { sessionStorage.removeItem(OAUTH_KEY) } catch {}
}
/* The page Google sends the person back to: this app, at its root. Registered in the Google
   Cloud OAuth client too, under Authorized redirect URIs. */
export const redirectUri = () => window.location.origin + window.location.pathname
export const authorizeUrl = (clientId) =>
  `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&response_type=code&access_type=offline&prompt=consent` +
  `&scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&redirect_uri=${encodeURIComponent(redirectUri())}`
