/* The credits of a Final Deliverables page (Alex, 23 Oct): written as plain text, one line each, "Role: Name",
   so they read well and are easy to add to. "Fill from project" writes them from what the project already has: its
   director and producer, the company, the cast, the team members the project's Budget pays (Alex, 23 Oct: "the rest of
   the team who worked on it, you can see them in the budget"), each under the line's category, in the order of the
   categories in Settings > Budget, then the project's crew grouped by role in the order of a film's credits, two
   people in the same role on one line. Placeholders (a name with TBC in it) and the client's own people stay out. */
import { budgetCategories, finCatFor } from './budgetCats.js'

// the order the crew's departments come in, the way credits are usually read
const DEPT_ORDER = ['Direction', 'Production', 'Camera', 'Lighting', 'Grip', 'Art', 'Costume', 'Makeup & hair', 'Sound', 'Post', 'Locations', 'Casting', 'Transport', 'Catering', 'Other']
const real = (name) => !!name && !/\bTBC\b/i.test(name)
// a category as a credit: "Gaffer / Ηλεκτρολόγος" keeps its English half, "Film Director" reads Director
const asRole = (cat) => {
  const parts = String(cat || '').split('/').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean)
  const role = parts.find((x) => !/[\u0370-\u03ff]/.test(x)) || parts[0] || ''
  return /^film director$/i.test(role) ? 'Director' : role
}

export function creditsFromProject(project, company = '', { users = [], settings } = {}) {
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
  // the company closes the list (Alex, 23 Oct)
  if (company) add('Production Company', company, 1e9)
  const people = project.contacts || []
  people.filter((c) => c.kind === 'cast').forEach((c) => add(project.category === 'Event' ? 'Talent' : 'Cast', c.name, 4))
  // the director and the producers lead, wherever they were filed, the director's assistant straight after the director
  const lead = (role) => (/^director$/i.test(role) ? 0 : /^director'?s?\s+assist/i.test(role) ? 0.5
    : /producer/i.test(role) && !/assistant|coordinator/i.test(role) ? 1 : null)
  // the team on the Budget: a line paying a member (a refund of their expenses aside), its category as the role
  const cats = budgetCategories(settings)
  /* and a person typed in by name (Alex, 23 Oct: the director's assistant was missing): a line with no member whose
     category pays crew or post-production in Finance, so rentals, props or a location stay out. A line paying one of
     the project's crew takes that person into the budget's order (their own entry below is then skipped); one paying
     the cast is left to the Cast line; AI or software credits are not people. */
  const linked = new Set()
  const credited = (l) => {
    if (l.reimburse) return false
    if (l.memberId) return true
    if (!l.vendor?.trim() || /credit|licen|software/i.test(l.category || '')) return false
    if (l.contactId && people.find((c) => c.id === l.contactId)?.kind === 'cast') return false
    return ['crew', 'post-production', 'postproduction'].includes(finCatFor(settings, l.category).toLowerCase().replace(/\s+/g, ''))
  }
  const rankOf = (cat, i) => 10 + (cats.indexOf(cat) < 0 ? cats.length : cats.indexOf(cat)) * 1000 + i
  ;(project.budget?.lines || []).filter(credited).forEach((l, i) => {
    const role = asRole(l.category || l.description)
    const name = (l.memberId && users.find((u) => u.id === l.memberId)?.name) || l.vendor
    if (l.contactId) linked.add(l.contactId)
    add(role, name, lead(role) ?? rankOf(l.category, i))
  })
  people.filter((c) => c.kind === 'crew' && c.dept !== 'Client' && !linked.has(c.id)).forEach((c, i) => {
    const role = c.role || c.dept
    const rank = lead(role) ?? 1e6 + (DEPT_ORDER.indexOf(c.dept) < 0 ? DEPT_ORDER.length : DEPT_ORDER.indexOf(c.dept)) * 1000 + i
    add(role, c.name, rank)
  })
  // an Editing line always, left empty to fill in when nobody is down for it (Alex, 23 Oct)
  if (![...groups.keys()].some((k) => /^edit/.test(k))) groups.set('editing', { role: 'Editing', names: [], rank: rankOf('Editing', 999) })
  return [...groups.values()].sort((a, b) => a.rank - b.rank).map((g) => `${g.role}: ${g.names.join(', ')}`.trimEnd()).join('\n')
}

// "Role: Name" lines into the page's rows; a line with no role is shown on its own, a role with no name not at all
// (keepEmpty keeps it, for the window's YouTube copy, where an empty role is a reminder to fill it in)
export const parseCredits = (text, { keepEmpty = false } = {}) => String(text || '').split('\n').map((l) => l.trim()).filter((l) => l && (keepEmpty || !/^[^:]+:$/.test(l))).map((l) => {
  if (/^[^:]+:$/.test(l)) return { role: l.slice(0, -1).trim(), name: '' }
  const m = l.match(/^([^:]{1,60}?)\s*(?::|\s[-–]\s)\s*(.+)$/)
  return m ? { role: m[1].trim(), name: m[2].trim() } : { role: '', name: l }
})

/* The credits as a YouTube description takes them (Alex, 23 Oct, his own example): VIDEO CREDITS, a blank line, then
   one "Role : Name" a line, left-aligned plain text, no arrow in front (Alex, 23 Oct); the director as "Directed by Name". */
export const youtubeCredits = (rows) => ['VIDEO CREDITS', '', ...(rows || []).map((c) => (
  !c.role ? c.name : /^director$/i.test(c.role) && c.name ? `Directed by ${c.name}` : `${c.role} : ${c.name || ''}`.trimEnd()
))].join('\n')

// onto the clipboard, with the old way for a browser that refuses the new one
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true } catch {}
  const t = document.createElement('textarea')
  t.value = text
  t.setAttribute('readonly', '')
  t.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
  document.body.appendChild(t)
  t.select()
  let ok = false
  try { ok = document.execCommand('copy') } catch {}
  t.remove()
  return ok
}
