/* Read-only calendar feeds (.ics): a Google Calendar's "secret address in iCal format", or any
   other published calendar. The browser cannot fetch one itself (no CORS header on Google's
   side), so supabase/functions/ical/index.ts fetches the text and this file turns it into the
   same event shape the app uses everywhere else. Nothing is written back: a feed is something
   the app shows, not something it owns. */
import { supabase } from './supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js'

export const FEED_COLOR = '#6C9BD1'
/* Settings > Integrations > Calendar feeds: [{ id, name, url, color, off }] */
export const feedsOf = (settings) => (settings?.calendarFeeds || []).filter((f) => f && f.url)
/* `calendarFeedsOff` is the one switch over all of them: the Calendar page then reads nothing,
   draws nothing and says nothing, while the addresses stay where they are. */
export const feedsAreOff = (settings) => settings?.calendarFeedsOff === true
export const liveFeeds = (settings) => (feedsAreOff(settings) ? [] : feedsOf(settings).filter((f) => !f.off))

/* ---------------------------------------------------------------- parsing */

/* RFC 5545 folds long lines by starting the next one with a space or tab. Unfold first, or a
   summary breaks in half mid-word. */
const unfold = (text) => String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n')

/* NAME;PARAM=value;PARAM2="a:b":the value — the first colon outside quotes ends the head. */
function prop(line) {
  let at = -1
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') quoted = !quoted
    else if (c === ':' && !quoted) { at = i; break }
  }
  if (at < 0) return null
  const [name, ...rest] = line.slice(0, at).split(';')
  const params = {}
  for (const seg of rest) {
    const eq = seg.indexOf('=')
    if (eq > 0) params[seg.slice(0, eq).toUpperCase()] = seg.slice(eq + 1).replace(/^"|"$/g, '')
  }
  return { name: name.toUpperCase().trim(), params, value: line.slice(at + 1) }
}

const unescape = (v) => String(v || '').replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1')

const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

/* "20261010" | "20261010T180000" | "20261010T150000Z" -> { date, time }. A Z time is the real
   instant, so it is moved to this device's clock; anything else is already a wall clock time
   (Google writes TZID=Europe/Athens for a calendar kept in Athens). */
export function parseWhen(value, params = {}) {
  const v = String(value || '').trim()
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v)
  if (!m) return null
  const [, y, mo, d, hh, mi, , z] = m
  if (params.VALUE === 'DATE' || hh === undefined) return { date: iso(+y, +mo, +d), time: '' }
  if (z) {
    const at = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi))
    return { date: iso(at.getFullYear(), at.getMonth() + 1, at.getDate()), time: `${pad(at.getHours())}:${pad(at.getMinutes())}` }
  }
  return { date: iso(+y, +mo, +d), time: `${hh}:${mi}` }
}

const dayMs = 86400000
const toUTC = (isoDate) => Date.UTC(+isoDate.slice(0, 4), +isoDate.slice(5, 7) - 1, +isoDate.slice(8, 10))
const fromUTC = (ms) => { const d = new Date(ms); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) }
export const addDays = (isoDate, n) => fromUTC(toUTC(isoDate) + n * dayMs)
const weekday = (isoDate) => new Date(toUTC(isoDate)).getUTCDay() // 0 Sun … 6 Sat
const WEEKDAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

function parseRule(value) {
  const out = {}
  for (const part of String(value || '').split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0) out[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1)
  }
  return out
}

/* The dates a repeating event falls on inside [from, to]. A deliberate subset of RFC 5545:
   every day / week (with BYDAY) / month / year, with INTERVAL, COUNT and UNTIL. Rules like
   "the second Tuesday of the month" fall back to the day of the month the series starts on,
   which is what most calendars mean anyway. */
export function occurrences(startDate, rule, from, to, cap = 400) {
  const freq = String(rule.FREQ || '').toUpperCase()
  if (!freq) return [startDate]
  const step = Math.max(1, Number(rule.INTERVAL) || 1)
  const until = rule.UNTIL ? parseWhen(rule.UNTIL)?.date : ''
  const count = Number(rule.COUNT) || 0
  const stop = until && until < to ? until : to
  const out = []
  let made = 0 // occurrences since the series began, so COUNT is counted from its real start
  // A daily series that began years ago needs thousands of steps before it reaches the window,
  // so the walk is bounded separately from how many events can come out of it.
  let guard = 20000

  const take = (d) => { if (d >= from && d >= startDate && out.length < cap) out.push(d) }

  if (freq === 'WEEKLY') {
    const days = String(rule.BYDAY || '').split(',').map((x) => WEEKDAYS[x.trim().slice(-2).toUpperCase()]).filter((n) => n !== undefined)
    const wanted = (days.length ? days : [weekday(startDate)]).slice().sort()
    let weekStart = addDays(startDate, -((weekday(startDate) - 1 + 7) % 7)) // the Monday of the first week
    while (weekStart <= stop && guard-- > 0 && out.length < cap) {
      for (const wd of wanted) {
        const d = addDays(weekStart, (wd - 1 + 7) % 7)
        if (d < startDate) continue
        if (count && made >= count) return out
        if (d > stop) break
        made += 1
        take(d)
      }
      weekStart = addDays(weekStart, 7 * step)
    }
    return out
  }

  let d = startDate
  while (d <= stop && guard-- > 0 && out.length < cap && (!count || made < count)) {
    made += 1
    take(d)
    if (freq === 'DAILY') d = addDays(d, step)
    else if (freq === 'MONTHLY') {
      const first = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1 + step, 1))
      const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
      d = iso(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(+startDate.slice(8, 10), last))
    } else if (freq === 'YEARLY') d = iso(+d.slice(0, 4) + step, +d.slice(5, 7), +d.slice(8, 10))
    else break
  }
  return out
}

/* An .ics file -> the app's events, one per occurrence inside [from, to] (ISO dates). */
export function parseIcs(text, { from, to, feed = {} } = {}) {
  const raw = []
  let cur = null
  for (const line of unfold(text)) {
    const p = prop(line)
    if (!p) continue
    if (p.name === 'BEGIN' && p.value === 'VEVENT') { cur = { exdates: [] }; continue }
    if (p.name === 'END' && p.value === 'VEVENT') { if (cur) raw.push(cur); cur = null; continue }
    if (!cur) continue
    switch (p.name) {
      case 'UID': cur.uid = p.value.trim(); break
      case 'SUMMARY': cur.title = unescape(p.value); break
      case 'LOCATION': cur.locationText = unescape(p.value); break
      case 'DESCRIPTION': cur.notes = unescape(p.value); break
      case 'STATUS': cur.status = p.value.trim().toUpperCase(); break
      case 'TRANSP': break
      case 'DTSTART': cur.start = parseWhen(p.value, p.params); break
      case 'DTEND': cur.end = parseWhen(p.value, p.params); break
      case 'RRULE': cur.rule = parseRule(p.value); break
      case 'RECURRENCE-ID': cur.recurrenceId = parseWhen(p.value, p.params)?.date || ''; break
      case 'EXDATE': for (const one of p.value.split(',')) { const w = parseWhen(one, p.params); if (w) cur.exdates.push(w.date) } break
      default: break
    }
  }

  // An occurrence changed on its own (RECURRENCE-ID) comes as its own VEVENT; the series must
  // not also draw the original on that date.
  const moved = new Set()
  for (const e of raw) if (e.recurrenceId && e.uid) moved.add(`${e.uid}@${e.recurrenceId}`)

  const out = []
  for (const e of raw) {
    if (!e.start || e.status === 'CANCELLED') continue
    const allDay = !e.start.time
    // DTEND is exclusive for all-day events: a one-day event ends the next morning.
    const endDate = e.end ? (allDay ? addDays(e.end.date, -1) : e.end.date) : e.start.date
    const span = Math.max(0, Math.round((toUTC(endDate) - toUTC(e.start.date)) / dayMs))
    const dates = e.rule && !e.recurrenceId ? occurrences(e.start.date, e.rule, from, to) : [e.start.date]
    for (const date of dates) {
      if (e.exdates.includes(date)) continue
      if (e.uid && !e.recurrenceId && moved.has(`${e.uid}@${date}`)) continue
      const last = span ? addDays(date, span) : ''
      if ((last || date) < from || date > to) continue
      out.push({
        id: `feed:${feed.id || 'x'}:${e.uid || date}:${date}`,
        feed: true,
        feedId: feed.id || '',
        feedName: feed.name || 'Calendar feed',
        type: 'feed',
        projectId: '',
        title: e.title || '(untitled)',
        date,
        endDate: last,
        start: e.start.time || '',
        end: e.end?.time || '',
        locationText: e.locationText || '',
        notes: e.notes || '',
        createdByName: feed.name || 'Calendar feed',
      })
    }
  }
  return out
}

/* ---------------------------------------------------------------- fetching */

async function call(body) {
  if (!supabase) throw new Error('Calendar feeds need the online database.')
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in again.')
  let res
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/ical`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error(`Could not reach the calendar feed function (${e.message}).`)
  }
  let out = null
  try { out = await res.json() } catch { /* not JSON */ }
  // The function answers 404 itself when the calendar address is wrong, so its own words come
  // first; only a 404 with no message of ours is Supabase saying the function is not there.
  if (out?.error) throw new Error(out.error)
  if (res.status === 404) throw new Error('The ical function is not deployed yet: Supabase > Edge Functions > ical.')
  if (!res.ok || !out) throw new Error(`The calendar feed function answered ${res.status}.`)
  return out
}

/* Google answers 429 when the same secret address is read a few times in quick succession, and
   the function can only pass the number on. Said plainly, because it is not a fault to go and
   fix: the calendar is fine and it clears itself. */
const human = (message) => (/\b429\b/.test(message)
  ? 'Google is not handing this calendar out right now because it was read too many times in a row. It clears itself in about half an hour, and the calendar keeps working in the meantime.'
  : message)

/* One read, now. Test in Settings uses this: pressing it means "go and look". */
export const fetchFeedText = (url) => call({ url }).then((r) => r.text || '').catch((e) => { throw new Error(human(e.message)) })

/* The Calendar page asked on every visit, and a few feeds times a few visits is exactly what
   makes Google start refusing. What came back is kept for half an hour per feed, so moving
   around the app costs nothing and a day's work is a few reads instead of dozens. When Google
   does refuse, what was read last is used anyway rather than emptying the page. */
const KEEP_MS = 30 * 60 * 1000
const STALE_MS = 7 * 24 * 60 * 60 * 1000
const cacheKey = (feed) => `tml_ical_${feed.id || feed.url}`

const kept = (feed) => {
  try {
    const { at, text } = JSON.parse(localStorage.getItem(cacheKey(feed)) || 'null') || {}
    return text ? { at, text } : null
  } catch { return null }
}

const keep = (feed, text) => {
  try { localStorage.setItem(cacheKey(feed), JSON.stringify({ at: Date.now(), text })) } catch { /* full, or a private window */ }
}

/* The feed's text, from the last half hour if it is there. `fresh` skips that (Refresh feeds).
   A read that fails still answers with anything kept from the last week, and says what went
   wrong alongside it, so a calendar that Google is holding back still draws. */
export async function readFeedText(feed, { fresh = false } = {}) {
  const old = kept(feed)
  if (!fresh && old && Date.now() - old.at < KEEP_MS) return { text: old.text }
  try {
    const text = await fetchFeedText(feed.url)
    keep(feed, text)
    return { text }
  } catch (e) {
    const error = `${feed.name || 'Calendar feed'}: ${e.message}`
    if (old && Date.now() - old.at < STALE_MS) return { text: old.text, error }
    return { error }
  }
}
