import { nameParts } from './projectName.js'

/* Roardino inside the hub (Alex, 23 Oct 2026). The page itself is roardino/ (a copy of themadlions.com/roardino on
   the hub's database, table roardino_ordinos, supabase/roardino.sql); the hub opens it in a frame. This file holds
   what both sides need: the frame's address, the crew's link, and an ordino made from a project of the hub
   (used by the page's New ordino and Fill from project, and by the one-time move of the old project ordinos). */

// the page, next to the app's index.html (the build's base is './')
export const roardinoSrc = ({ project = '', see = false } = {}) => {
  const q = new URLSearchParams({ embed: 'hub' })
  if (project) q.set('project', project)
  if (see) q.set('see', '1')
  return `${import.meta.env.BASE_URL}roardino/?${q}`
}

// the crew's link: go.themadlions.com/?o/<token> on the live app (the short-link site sends it to #/o/<token>,
// which opens the page with ?t=), else straight to the page
const LIVE = ['alexisdigipro-hub.github.io', 'hub.themadlions.com']
export const roardinoLink = (token, here = location) =>
  LIVE.includes(here.hostname) ? `https://go.themadlions.com/?o/${token}` : `${here.origin}${here.pathname.replace(/[^/]*$/, '')}?t=${token}`

const MAPS = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+|(www\.)?google\.[a-z.]+\/maps)\//i

// a project with the company library's shared fields filled in (as lib/library.js hydrateProject)
export function withLibrary(project, library = {}) {
  const by = (list) => Object.fromEntries((list || []).map((x) => [x.id, x]))
  const lc = by(library.contacts), ll = by(library.locations)
  return {
    ...project,
    contacts: (project.contacts || []).map((c) => (c.libraryId && lc[c.libraryId] ? { ...lc[c.libraryId], ...c, name: lc[c.libraryId].name || c.name, phone: lc[c.libraryId].phone || c.phone } : c)),
    locations: (project.locations || []).map((l) => (l.libraryId && ll[l.libraryId] ? { ...ll[l.libraryId], ...l, name: ll[l.libraryId].name || l.name, address: ll[l.libraryId].address || l.address } : l)),
  }
}

const addMin = (hhmm, min) => {
  if (!/^\d{1,2}:\d{2}$/.test(hhmm || '') || !min) return hhmm || ''
  const [h, m] = hhmm.split(':').map(Number)
  const t = (((h * 60 + m + Number(min)) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

// the project's shoot days in date order (its own, and its Shoot days in the Calendar, `shootDates`), and the one
// an ordino is for: the next to come, else the last
export const daysOf = (project) => {
  const own = (project?.shootingDays || []).filter((d) => d.date)
  const cal = (project?.shootDates || []).filter((d) => !own.some((x) => x.date === d)).map((date) => ({ id: `cal:${date}`, date }))
  return [...own, ...cal].sort((a, b) => a.date.localeCompare(b.date))
}
// a project's Shoot days in the Calendar, day by day (as lib/shootDays.js ordinoDates)
export function shootDatesOf(projectId, events = []) {
  const out = new Set()
  const next = (d) => { const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10) }
  events.filter((e) => e.projectId === projectId && e.type === 'shoot' && e.date).forEach((e) => {
    const last = e.endDate && e.endDate > e.date ? e.endDate : e.date
    for (let d = e.date, i = 0; d <= last && i < 62; d = next(d), i += 1) out.add(d)
  })
  return [...out].sort()
}
export const nextDay = (project, today = new Date().toISOString().slice(0, 10)) => {
  const days = daysOf(project)
  return days.find((d) => d.date >= today) || days[days.length - 1] || null
}

function locOf(l, sheet = {}) {
  const link = [l?.mapLink, l?.link, l?.coordsText].find((x) => MAPS.test(String(x || '').trim())) || ''
  const lat = l?.lat ? String(l.lat) : '', lon = l?.lon ? String(l.lon) : ''
  return {
    name: sheet.locName || l?.name || '',
    address: sheet.locAddress || l?.address || '',
    link: link || (lat && lon ? `https://www.google.com/maps?q=${lat},${lon}` : ''),
    contact: sheet.locContact || l?.contact || '',
    phone: sheet.locPhone || l?.phone || '',
    parking: sheet.parking || '',
    hospital: sheet.weather || '', // the old ordino kept the hospital in `weather`
    lat, lon,
  }
}

/* What a project gives an ordino: the name, cover, the day (date, call, wrap, day X of Y), the day's location,
   and its cast, crew and production people with their calls. Only the fields Roardino has; the page's
   normalize() fills in the rest. `day` is a shoot day of the project, by default the next to come. */
export function fromProject(project, { day = nextDay(project), company = 'THEMADLIONS' } = {}) {
  const { artist, shortTitle } = nameParts(project)
  const days = daysOf(project)
  const call = day?.callTime || ''
  const loc = (project.locations || []).find((l) => l.id === day?.locationId) || (project.locations || [])[0]
  const people = (project.contacts || []).filter((c) => c.name)
  const roleOf = (c) => (c.kind === 'cast' ? c.character || c.role || '' : c.role || c.dept || '')
  return {
    project: { title: shortTitle || project.title || '', artist, company, cover: project.coverThumb || '' },
    day: { date: day?.date || project.startDate || '', callTime: call, wrapTime: day?.wrapTime || '', index: Math.max(1, days.findIndex((d) => d.date === day?.date) + 1), count: Math.max(1, days.length) },
    loc: locOf(loc, day?.callSheet),
    cast: people.filter((c) => c.kind === 'cast').map((c) => ({ name: c.name, role: roleOf(c), time: addMin(call, c.callOffset) })),
    crew: people.filter((c) => c.kind === 'crew').map((c) => ({ name: c.name, role: roleOf(c), time: addMin(call, c.callOffset) })),
    contacts: people.filter((c) => c.kind !== 'cast' && c.kind !== 'crew').map((c) => ({ name: c.name, role: roleOf(c), phone: c.phone || '' })),
  }
}

/* The old project Ordino (until 23 Oct: one per shoot day, its fields in day.callSheet) as a Roardino ordino,
   for the one-time move (src/pages/RoardinoPage.jsx). Cast and crew were not on the old ordino, so they stay out. */
export function fromOldOrdino(project, day, company) {
  const base = fromProject(project, { day, company })
  const sheet = day.callSheet || {}
  const rows = (list, keys) => (list || []).map((r) => Object.fromEntries(keys.map((k) => [k, r?.[k] || '']))).filter((r) => keys.some((k) => r[k]))
  return {
    project: { ...base.project, title: sheet.title?.trim() || base.project.title, cover: project.coverThumb || '' },
    day: { ...base.day, wrapTime: '' },
    loc: base.loc,
    extraLocs: rows(sheet.extraLocs, ['name', 'address', 'link']),
    groupCalls: rows(sheet.groupCalls, ['who', 'time']),
    program: rows(sheet.program, ['from', 'to', 'what']),
    notes: sheet.notes || '',
    tagline: sheet.tagline || '',
    lunch: '',
    scenes: [], cast: [], crew: [], contacts: [],
  }
}
