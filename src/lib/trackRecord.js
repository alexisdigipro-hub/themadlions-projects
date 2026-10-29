// A member's track record for their profile (Alex, 29 Oct): every project they took part in, as a
// badge, and a score out of 100 with a level. Nothing is entered by hand; it is read from the
// projects this viewer can see. A person is on a project when they are its director or producer,
// in its crew or cast (same email, or same name), a task of it is theirs, a budget line pays them,
// or their My work has a job on it.
import { nameParts } from './projectName.js'

const norm = (x) => (x || '').trim().toLowerCase()
const DAY = 86400000

export const LEVELS = [
  { min: 75, name: 'Pride leader' },
  { min: 50, name: 'Lion' },
  { min: 25, name: 'Young lion' },
  { min: 0, name: 'Cub' },
]

const whenOf = (p) => p.endDate || p.startDate || (p.shootingDays || []).map((d) => d.date).filter(Boolean).sort().pop() || (p.updatedAt || p.createdAt || '').slice(0, 10)

export function trackRecord(state, person) {
  const name = norm(person?.name)
  const email = norm(person?.email)
  const jobs = (state.worklog || []).filter((e) => e.userId === person?.id && e.projectId)
  const list = []
  let tasks = 0
  let tasksDone = 0
  for (const p of state.projects || []) {
    if (p.deletedAt) continue
    const roles = []
    if (name && norm(p.director) === name) roles.push('Director')
    if (name && norm(p.producer) === name) roles.push('Producer')
    for (const c of p.contacts || []) {
      if ((email && norm(c.email) === email) || (name && norm(c.name) === name)) roles.push(c.kind === 'cast' ? (c.character ? `Cast · ${c.character}` : 'Cast') : (c.role || c.dept || 'Crew'))
    }
    const mine = (p.tasks || []).filter((t) => !t.deletedAt && (t.assigneeId ? t.assigneeId === person.id : !!name && norm(t.assignee) === name))
    const lines = (p.budget?.lines || []).filter((l) => l.memberId && l.memberId === person.id)
    for (const l of lines) if (l.category) roles.push(l.category)
    const worked = jobs.some((e) => e.projectId === p.id)
    if (!roles.length && !mine.length && !lines.length && !worked) continue
    const done = mine.filter((t) => t.status === 'done').length
    tasks += mine.length
    tasksDone += done
    const { artist, shortTitle } = nameParts(p)
    list.push({
      id: p.id,
      title: shortTitle || p.title || 'Untitled',
      artist,
      color: p.color,
      category: p.category || '',
      role: [...new Set(roles)][0] || '',
      delivered: p.status === 'Delivered',
      when: whenOf(p),
      tasks: mine.length,
      done,
    })
  }
  list.sort((a, b) => (b.when || '').localeCompare(a.when || ''))

  // The score, out of 100, in four parts the profile shows one by one:
  // projects up to 40 (5 a delivered one, 3 one still running), tasks up to 25 (the share of their
  // tasks that are done), range up to 20 (5 a kind of project), and being active up to 15.
  const delivered = list.filter((x) => x.delivered).length
  const projects = Math.min(40, delivered * 5 + (list.length - delivered) * 3)
  const taskPts = tasks ? Math.round((tasksDone / tasks) * 25) : 0
  const kinds = new Set(list.map((x) => x.category).filter(Boolean)).size
  const range = Math.min(20, kinds * 5)
  const last = list.reduce((m, x) => (x.when > m ? x.when : m), '')
  const ago = last ? (Date.now() - new Date(last).getTime()) / DAY : Infinity
  const active = ago <= 90 ? 15 : ago <= 365 ? 8 : 0
  const score = projects + taskPts + range + active
  const level = LEVELS.find((l) => score >= l.min)
  return {
    list,
    score,
    level: level.name,
    parts: [
      { key: 'projects', label: 'Projects', pts: projects, max: 40, note: `${list.length} in all, ${delivered} delivered` },
      { key: 'tasks', label: 'Tasks', pts: taskPts, max: 25, note: tasks ? `${tasksDone} of ${tasks} done` : 'None assigned yet' },
      { key: 'range', label: 'Range', pts: range, max: 20, note: `${kinds} kind${kinds === 1 ? '' : 's'} of project` },
      { key: 'active', label: 'Active', pts: active, max: 15, note: !last ? 'No projects yet' : ago <= 90 ? 'On a project lately' : ago <= 365 ? 'This past year' : 'Over a year ago' },
    ],
  }
}
