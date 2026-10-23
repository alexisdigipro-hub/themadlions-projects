/* The credits of a Final Deliverables page (Alex, 23 Oct): written as plain text, one line each, "Role: Name",
   so they read well and are easy to add to. "Fill from project" writes them from what the project already has: its
   director and producer, the company, the cast, then the crew grouped by role in the order of a film's credits, two
   people in the same role on one line. Placeholders (a name with TBC in it) and the client's own people stay out. */

// the order the crew's departments come in, the way credits are usually read
const DEPT_ORDER = ['Direction', 'Production', 'Camera', 'Lighting', 'Grip', 'Art', 'Costume', 'Makeup & hair', 'Sound', 'Post', 'Locations', 'Casting', 'Transport', 'Catering', 'Other']
const real = (name) => !!name && !/\bTBC\b/i.test(name)

export function creditsFromProject(project, company = '') {
  if (!project) return ''
  const groups = new Map() // role (lower case) -> { role, names, rank }
  const add = (role, name, rank) => {
    role = (role || '').trim()
    name = (name || '').trim()
    if (!role || !real(name)) return
    const key = role.toLowerCase()
    const g = groups.get(key) || { role, names: [], rank }
    if (!g.names.some((n) => n.toLowerCase() === name.toLowerCase())) g.names.push(name)
    g.rank = Math.min(g.rank, rank)
    groups.set(key, g)
  }
  add('Director', project.director, 0)
  add('Producer', project.producer, 2)
  if (company) add('Production Company', company, 3)
  const people = project.contacts || []
  people.filter((c) => c.kind === 'cast').forEach((c) => add(project.category === 'Event' ? 'Talent' : 'Cast', c.name, 4))
  people.filter((c) => c.kind === 'crew' && c.dept !== 'Client').forEach((c, i) => {
    const role = c.role || c.dept
    // the director and the producers lead, whatever department they were put in
    const rank = /^director$/i.test(role) ? 0 : /producer/i.test(role) && !/assistant|coordinator/i.test(role) ? 1
      : 10 + (DEPT_ORDER.indexOf(c.dept) < 0 ? DEPT_ORDER.length : DEPT_ORDER.indexOf(c.dept)) * 1000 + i
    add(role, c.name, rank)
  })
  return [...groups.values()].sort((a, b) => a.rank - b.rank).map((g) => `${g.role}: ${g.names.join(', ')}`).join('\n')
}

// "Role: Name" lines into the page's rows; a line with no role is shown on its own
export const parseCredits = (text) => String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const m = l.match(/^([^:]{1,60}?)\s*(?::|\s[-–]\s)\s*(.+)$/)
  return m ? { role: m[1].trim(), name: m[2].trim() } : { role: '', name: l }
})
