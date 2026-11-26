import { uid } from './store.jsx'

/* The hub's own team in the crew (Alex, 26 Nov: "the hub's users should be in the Database's crew; when I pay one on a
   budget line, they show in the Overview's crew with the others; Crew from library finds them").
   - ensureTeamInLibrary: every active member has a crew entry in the company library (Database > Crew), tied by
     memberId; an entry that already exists with their email or their exact name is tied instead of doubled, and only
     its empty fields are filled from their profile.
   - ensureMemberInProject: a member paid on a project's budget is in that project's crew, tied to their library entry,
     with the line's category as their role there. Nobody already in it (by memberId, library entry or name) is added
     twice. Both work on a store draft and say whether they changed anything. */

const norm = (v) => String(v || '').trim().toLowerCase()

export const libraryEntryOf = (library, u) => {
  const list = library?.contacts || []
  return list.find((c) => c.memberId === u.id)
    || (u.email && list.find((c) => norm(c.email) === norm(u.email)))
    || list.find((c) => norm(c.name) && norm(c.name) === norm(u.name))
    || null
}

export function ensureTeamInLibrary(s) {
  let changed = false
  s.library = s.library || {}
  s.library.contacts = s.library.contacts || []
  for (const u of s.users || []) {
    if (u.active === false || !u.name) continue
    const pr = u.profile || {}
    const e = libraryEntryOf(s.library, u)
    if (!e) {
      s.library.contacts.push({ id: uid(), kind: 'crew', name: u.name.trim(), email: u.email || '', phone: pr.phone || '', dept: pr.dept || 'Production', role: pr.position || '', memberId: u.id, tags: [], createdAt: new Date().toISOString() })
      changed = true
      continue
    }
    const fill = { memberId: u.id, email: u.email, phone: pr.phone, dept: pr.dept, role: pr.position }
    for (const [k, v] of Object.entries(fill)) if (v && !e[k]) { e[k] = v; changed = true }
  }
  return changed
}

export function ensureMemberInProject(s, p, u, role = '') {
  if (!p || !u) return false
  p.contacts = p.contacts || []
  const e = libraryEntryOf(s.library, u)
  if (p.contacts.some((c) => c.memberId === u.id || (e && c.libraryId === e.id) || norm(c.name) === norm(u.name))) return false
  const pr = u.profile || {}
  p.contacts.push({
    id: uid(), kind: 'crew', name: u.name.trim(), dept: pr.dept || e?.dept || 'Production', role: role || pr.position || e?.role || '',
    phone: pr.phone || e?.phone || '', email: u.email || '', callOffset: Number(s.settings?.callsheet?.crewOffset || 0),
    memberId: u.id, ...(e ? { libraryId: e.id } : {}),
  })
  return true
}

/* Once per workspace load, for an administrator: the team into the library, and every member paid on a budget line into
   that project's crew (the lines made before 26 Nov too). */
export function syncTeamCrew(s) {
  let changed = ensureTeamInLibrary(s)
  for (const p of s.projects || []) {
    let touched = false
    for (const l of p.budget?.lines || []) {
      if (!l.memberId || l.reimburse) continue
      const u = (s.users || []).find((x) => x.id === l.memberId)
      if (u && ensureMemberInProject(s, p, u, l.category)) touched = true
    }
    if (touched) { p.updatedAt = new Date().toISOString(); changed = true }
  }
  return changed
}
