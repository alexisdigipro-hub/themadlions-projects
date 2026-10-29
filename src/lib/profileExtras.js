// The rest of a profile (Alex, 29 Oct: "put all six"): skills, a showreel, kudos from the team,
// whether they are free, their birthday, and how complete the profile is.
import { supabase } from './supabase.js'
import { uid } from './store.jsx'

/* ---------- skills ---------- */
export const SKILL_IDEAS = ['Gimbal', 'Steadicam', 'Drone', 'Color grading', 'Editing', 'Lighting', 'Sound', 'Focus pulling', 'Motion graphics', 'VFX', 'Photography', 'Art direction', 'Styling', 'Make-up', 'Driving licence']
export const cleanSkills = (list) => [...new Set((list || []).map((s) => String(s).trim()).filter(Boolean))].slice(0, 20)

/* ---------- showreel: a YouTube or Vimeo link played inside the profile ---------- */
export function reelEmbed(url) {
  const u = (url || '').trim()
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0`
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/)
  if (m) return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ''}`
  return ''
}

/* ---------- birthday ---------- */
export const isBirthday = (profile, iso) => !!profile?.birthday && profile.birthday.slice(5, 10) === iso.slice(5, 10)

/* ---------- availability, from the Calendar ----------
   Not available (their own day off) wins; else a shoot today on a project they are on; else free,
   with the next shoot day if there is one. projectIds: the projects they are on (trackRecord). */
export function availabilityOf(state, person, iso, projectIds) {
  const events = state.events || []
  const off = events
    .filter((e) => e.type === 'unavailable' && (e.personId || e.createdBy) === person.id && e.date && (e.endDate || e.date) >= iso)
    .sort((a, b) => a.date.localeCompare(b.date))
  const now = off.find((e) => e.date <= iso)
  if (now) return { kind: 'off', until: now.endDate || now.date }
  const mine = new Set(projectIds)
  const titleOf = (id) => (state.projects || []).find((p) => p.id === id)?.title || ''
  const shoots = []
  for (const e of events) if (e.type === 'shoot' && e.projectId && mine.has(e.projectId) && e.date) shoots.push({ date: e.date, end: e.endDate || e.date, projectId: e.projectId })
  for (const p of state.projects || []) if (mine.has(p.id)) for (const d of p.shootingDays || []) if (d.date) shoots.push({ date: d.date, end: d.date, projectId: p.id })
  const today = shoots.find((s) => s.date <= iso && s.end >= iso)
  if (today) return { kind: 'shoot', title: titleOf(today.projectId), projectId: today.projectId }
  const next = shoots.filter((s) => s.date > iso).sort((a, b) => a.date.localeCompare(b.date))[0]
  const nextOff = off[0]
  return { kind: 'free', next: next && { date: next.date, title: titleOf(next.projectId), projectId: next.projectId }, nextOff: nextOff && nextOff.date }
}

/* ---------- how complete a profile is ---------- */
const PARTS = [
  ['photo', 'a photo'],
  ['position', 'your position'],
  ['dept', 'your department'],
  ['phone', 'your phone'],
  ['birthday', 'your birthday'],
  ['bio', 'a few words'],
  ['skills', 'your skills'],
  ['reel', 'a showreel'],
]
export function completeness(profile) {
  const p = profile || {}
  const has = (k) => (Array.isArray(p[k]) ? p[k].length > 0 : !!String(p[k] || '').trim())
  const missing = PARTS.filter(([k]) => !has(k)).map(([, label]) => label)
  return { pct: Math.round(((PARTS.length - missing.length) / PARTS.length) * 100), missing }
}

/* ---------- kudos (supabase/kudos.sql; in local mode this browser) ---------- */
const LOCAL = 'tml_kudos'
const localRead = () => { try { return JSON.parse(localStorage.getItem(LOCAL) || '[]') } catch { return [] } }
const localWrite = (rows) => { try { localStorage.setItem(LOCAL, JSON.stringify(rows)) } catch { /* full */ } }
export const KUDOS_EMOJI = ['🔥', '🙌', '🎬', '💪', '🏆', '❤️']

const fail = (error) => new Error(error.code === '42P01' ? 'Run supabase/kudos.sql in the Supabase SQL Editor to switch kudos on.' : error.message)

export async function loadKudos(userId) {
  if (!supabase) return localRead().filter((k) => k.to === userId).sort((a, b) => b.at.localeCompare(a.at))
  const { data, error } = await supabase.from('kudos').select('id, to_user, from_user, data, created_at').eq('to_user', userId).order('created_at', { ascending: false }).limit(100)
  if (error) throw fail(error)
  return data.map((r) => ({ ...r.data, id: r.id, to: r.to_user, from: r.from_user, at: r.created_at }))
}

export async function addKudos({ to, from, text, emoji, projectId }) {
  const k = { id: uid(), to, from, text: text.trim().slice(0, 280), emoji, projectId: projectId || '', at: new Date().toISOString() }
  if (!supabase) { localWrite([...localRead(), k]); return k }
  const { error } = await supabase.from('kudos').insert({ id: k.id, to_user: to, from_user: from, data: { text: k.text, emoji, projectId: k.projectId } })
  if (error) throw fail(error)
  return k
}

export async function removeKudos(id) {
  if (!supabase) { localWrite(localRead().filter((k) => k.id !== id)); return }
  const { error } = await supabase.from('kudos').delete().eq('id', id)
  if (error) throw fail(error)
}
