import { projectProgress } from './progress.js'
import { nameParts } from './projectName.js'
import { publishShare, removeShare, setShareState } from './shares.js'
import { remote, supabase } from './supabase.js'

/* A project for outside collaborators (Alex, 18 Nov: "a link to the project for outside collaborators: they see the
   progress and what we have put in, they may leave comments, and otherwise can do nothing; and safe").

   The link is a share row (kind 'project', ref project:<id>) like a delivery's: a random 12-character token, an
   optional code with five tries then 15 minutes' wait, a closing date and Close (share_get, share_safety.sql). The
   page reads only this snapshot, never the project: what is not written here cannot be seen. Money (budget, fees,
   finance), phone numbers, emails, private notes, files, chat and the script's text are never written. The team
   picks which of the sections below go in; the snapshot is written again by itself while the link is open
   (ProjectShare.jsx), so the page keeps up with the project. Comments come back through share_respond
   ('comment', project_share.sql) into the row's responses. */

export const SECTIONS = [
  ['progress', 'Progress', 'The bar and each stage'],
  ['schedule', 'Schedule', 'Shoot or event days, call and wrap, where'],
  ['tasks', 'Tasks', 'What is to do and what is done, by department'],
  ['team', 'Team', 'Cast and crew: names and roles only'],
  ['locations', 'Locations', 'Names, kind and address'],
  ['scenes', 'Scenes', 'Scene numbers and headings, no script text'],
]
export const DEFAULT_SECTIONS = ['progress', 'schedule', 'tasks', 'team', 'locations']

export const projectRef = (id) => `project:${id}`
const s = (v, n = 300) => String(v ?? '').slice(0, n)

export function projectSnapshot(project, state, sections = DEFAULT_SECTIONS) {
  const on = new Set(sections)
  const p = project || {}
  const { artist, shortTitle } = nameParts(p)
  const locName = (id) => (p.locations || []).find((l) => l.id === id)?.name || ''
  const data = {
    sections: [...on],
    title: s(p.title, 200), artist: s(artist, 120), shortTitle: s(shortTitle, 160),
    client: s(p.client, 160), category: s(p.category, 60), status: s(p.status, 60),
    startDate: s(p.startDate, 10), endDate: s(p.endDate, 10),
    color: s(p.color, 20), cover: /^https:\/\//.test(p.coverThumb || '') ? s(p.coverThumb, 600) : '',
    company: { name: s(state?.workspace?.name, 80) || 'THEMADLIONS' },
    at: new Date().toISOString(),
  }
  if (on.has('progress')) {
    const { pct, stages } = projectProgress(p, state?.settings)
    data.progress = { pct, stages: stages.map((st) => ({ label: s(st.label, 80), done: Math.round((st.done || 0) * 100) })) }
  }
  if (on.has('schedule')) {
    data.days = (p.shootingDays || []).filter((d) => d.date).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 120)
      .map((d) => ({ date: s(d.date, 10), call: s(d.callTime, 5), wrap: s(d.wrapTime, 5), unit: s(d.unit, 60), where: s(locName(d.locationId), 120) }))
  }
  if (on.has('tasks')) {
    data.tasks = (p.tasks || []).slice(0, 300)
      .map((t) => ({ title: s(t.title, 200), done: t.status === 'done', due: s(t.due, 10), dept: s(t.dept, 60) }))
  }
  if (on.has('team')) {
    data.team = (p.contacts || []).filter((c) => c.name).slice(0, 200)
      .map((c) => ({ kind: c.kind === 'cast' ? 'cast' : 'crew', name: s(c.name, 120), role: s(c.role, 120), character: c.kind === 'cast' ? s(c.character, 120) : '', dept: s(c.dept, 60) }))
  }
  if (on.has('locations')) {
    data.locations = (p.locations || []).filter((l) => l.name).slice(0, 100)
      .map((l) => ({ name: s(l.name, 120), type: s(l.type, 60), address: s(l.address, 240) }))
  }
  if (on.has('scenes')) {
    data.scenes = (p.scenes || []).slice(0, 400)
      .map((sc) => ({ number: s(sc.number, 12), heading: s(sc.heading, 200), time: s(sc.timeOfDay, 30) }))
  }
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
