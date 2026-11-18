import { projectProgress } from './progress.js'
import { nameParts } from './projectName.js'
import { publishShare, removeShare, setShareState } from './shares.js'
import { remote, supabase } from './supabase.js'

/* A project for outside collaborators (Alex, 18 Nov: "a link to the project for outside collaborators: they see the
   progress and what we have put in, they may leave comments, and otherwise can do nothing; and safe"; then "almost as
   we see it, everything we have put in, all but the budget").

   The link is a share row (kind 'project', ref project:<id>) like a delivery's: a random 12-character token, an
   optional code with five tries then 15 minutes' wait, a closing date and Close (share_get, share_safety.sql). The
   page reads only this snapshot, never the project: what is not written here cannot be seen. Never written: the
   budget and any money, phone numbers and emails of people, places and vendors, rates. Songs and photos are listed in
   data.media and reach the page only through the share-media function, for this link, to see and hear, not to
   download. The team may switch sections off; the snapshot is written again by itself while the link is open
   (ProjectShare.jsx). Comments come back through share_respond ('comment', project_share.sql). */

export const SECTIONS = [
  ['progress', 'Progress', 'The bar and each stage'],
  ['music', 'Song', 'The song to listen to, the song map and the lyrics'],
  ['schedule', 'Schedule', 'Shoot or event days and the run of show'],
  ['tasks', 'Tasks', 'What is to do and what is done'],
  ['notes', 'Files & notes', 'Production notes and links'],
  ['script', 'Script & Breakdown', 'The script and its scenes'],
  ['team', 'Team', 'Cast and crew: names, roles and photos, no phones or emails'],
  ['locations', 'Locations', 'Names, address, notes and photos'],
  ['gear', 'Gear', 'What is needed, how many, its state'],
]
// everything is shown unless switched off (Alex, 18 Nov: "almost as we see it, everything we have put in, all but the budget")
export const DEFAULT_SECTIONS = SECTIONS.map(([k]) => k)

export const projectRef = (id) => `project:${id}`
/* the sections a link shows: a link made before 18 Nov's "everything" (no data.v) shows everything now */
export const sectionsOf = (row) => (row?.data?.v >= 2 && Array.isArray(row.data.sections) ? row.data.sections : DEFAULT_SECTIONS)
const s = (v, n = 300) => String(v ?? '').slice(0, n)

/* A file the page may play or show, by the server (share-media): only what is listed here, for this link. */
const mediaOf = (f, b) => (f?.fileid ? { fileid: Number(f.fileid) } : f?.path ? { b, path: s(f.path, 400) } : null)
const photosOf = (list, media) => (list || []).slice(0, 24).map((ph) => {
  if (ph?.inline && String(ph.inline).length < 300000) return { id: s(ph.id, 60), inline: ph.inline }
  const m = mediaOf(ph, 'photos')
  if (!m) return null
  media.push(m)
  return { id: s(ph.id, 60), ...m }
}).filter(Boolean)

export function projectSnapshot(project, state, sections = DEFAULT_SECTIONS) {
  const on = new Set(sections)
  const p = project || {}
  const { artist, shortTitle } = nameParts(p)
  const media = []
  const locName = (id) => (p.locations || []).find((l) => l.id === id)?.name || ''
  let look = 'glassdark'
  try { look = localStorage.getItem('tml_theme') || look } catch { /* private window */ }
  const cover = String(p.coverThumb || '')
  const data = {
    v: 2,
    sections: [...on],
    title: s(p.title, 200), artist: s(artist, 120), shortTitle: s(shortTitle, 160),
    client: s(p.client, 160), category: s(p.category, 60), status: s(p.status, 60), code: s(p.code, 40),
    director: s(p.director, 120), producer: s(p.producer, 120),
    startDate: s(p.startDate, 10), endDate: s(p.endDate, 10),
    color: s(p.color, 20), look: s(look, 30),
    cover: /^https:\/\//.test(cover) || (/^data:image\//.test(cover) && cover.length < 400000) ? cover : '',
    company: { name: s(state?.workspace?.name, 80) || 'THEMADLIONS' },
    at: new Date().toISOString(),
  }
  if (on.has('progress')) {
    const { pct, stages } = projectProgress(p, state?.settings)
    data.progress = { pct, stages: stages.map((st) => ({ label: s(st.label, 80), done: Math.round((st.done || 0) * 100) })) }
  }
  if (on.has('music') && p.music) {
    const tracks = (p.music.tracks || []).slice(0, 12).map((t) => {
      const m = mediaOf(t, 'audio')
      if (m) media.push(m)
      return { id: s(t.id, 60), name: s(t.name, 160), kind: s(t.kind, 20), duration: Number(t.duration) || 0, peaks: Array.isArray(t.peaks) ? t.peaks.slice(0, 700).map((x) => Math.round(x * 1000) / 1000) : [], ...(m || {}) }
    })
    data.music = {
      active: s(p.music.activeTrackId, 60), tracks,
      sections: (p.music.sections || []).slice(0, 80).map((x) => ({ name: s(x.name, 60), start: Number(x.start) || 0, end: Number(x.end) || 0, lyrics: s(x.lyrics, 3000) })),
    }
  }
  if (on.has('schedule')) {
    data.days = (p.shootingDays || []).filter((d) => d.date).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 120)
      .map((d) => ({ date: s(d.date, 10), call: s(d.callTime, 5), wrap: s(d.wrapTime, 5), unit: s(d.unit, 60), where: s(locName(d.locationId), 120),
        blocks: (d.blocks || []).slice(0, 80).map((b) => ({ time: s(b.time, 5), end: s(b.end, 5), item: s(b.item, 200), owner: s(b.owner, 120) })) }))
  }
  if (on.has('tasks')) {
    data.tasks = (p.tasks || []).slice(0, 300)
      .map((t) => ({ title: s(t.title, 200), done: t.status === 'done', due: s(t.due, 10), dept: s(t.dept, 60), who: s(t.assignee, 80), notes: s(t.notes, 1000) }))
  }
  if (on.has('notes')) {
    data.notes = s(p.productionNotes, 20000)
    data.links = (p.links || []).slice(0, 100).filter((l) => /^https?:\/\//.test(l.url || '')).map((l) => ({ title: s(l.title, 160), url: s(l.url, 600), kind: s(l.kind, 40), note: s(l.note, 400) }))
  }
  if (on.has('script')) {
    data.script = s(p.script?.text, 200000)
    data.scenes = (p.scenes || []).slice(0, 400).map((sc) => ({ number: s(sc.number, 12), heading: s(sc.heading, 200), time: s(sc.timeOfDay, 30), synopsis: s(sc.synopsis, 400), characters: (sc.characters || []).slice(0, 30).map((c) => s(c, 60)) }))
  }
  if (on.has('team')) {
    data.team = (p.contacts || []).filter((c) => c.name).slice(0, 200)
      .map((c) => ({ kind: c.kind === 'cast' ? 'cast' : 'crew', name: s(c.name, 120), role: s(c.role, 120), character: c.kind === 'cast' ? s(c.character, 120) : '', dept: s(c.dept, 60), photos: photosOf(c.photos, media).slice(0, 6) }))
  }
  if (on.has('locations')) {
    data.locations = (p.locations || []).filter((l) => l.name).slice(0, 100)
      .map((l) => ({ name: s(l.name, 120), type: s(l.type, 60), address: s(l.address, 240), notes: s(l.notes, 1000), photos: photosOf(l.photos, media) }))
  }
  if (on.has('gear')) {
    data.gear = (p.gear || []).filter((g) => g.item).slice(0, 300).map((g) => ({ item: s(g.item, 160), category: s(g.category, 60), qty: Number(g.qty) || 1, status: s(g.status, 30) }))
  }
  data.media = media.slice(0, 400)
  return data
}

/* write the snapshot again, keeping the link's token, code, date and replies */
export async function publishProjectShare({ project, state, sections, userId }) {
  return publishShare({ workspaceId: state.workspace.id, kind: 'project', ref: projectRef(project.id), data: projectSnapshot(project, state, sections), userId })
}

/* the link's whole row (token, code, date, closed, opens, replies), or null while there is none */
export async function getProjectShare(state, projectId) {
  if (!remote) return null
  const { data, error } = await supabase.from('shares').select('*').eq('workspace_id', state.workspace.id).eq('ref', projectRef(projectId)).maybeSingle()
  if (error) throw error
  return data || null
}
export const setProjectShare = (state, projectId, patch) => setShareState({ workspaceId: state.workspace.id, ref: projectRef(projectId), one: true, ...patch })
export const removeProjectShare = (state, projectId) => removeShare({ workspaceId: state.workspace.id, ref: projectRef(projectId) })
