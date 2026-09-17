import { uid } from './store.jsx'

/*
  Company library: people and locations that live outside projects.
  A project entry with `libraryId` shows the library record's shared fields (below);
  the project keeps only its own fields (character, role, call offset, script sets).
*/
export const CONTACT_SHARED = ['name', 'phone', 'email', 'agent', 'agentPhone', 'photos', 'notes', 'dept']
export const LOCATION_SHARED = ['name', 'address', 'type', 'contact', 'phone', 'notes', 'lat', 'lon', 'coordsText', 'photos']

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]))

export function hydrateProject(project, library) {
  if (!library) return project
  const byId = (list) => Object.fromEntries((list || []).map((x) => [x.id, x]))
  const lc = byId(library.contacts), ll = byId(library.locations)
  return {
    ...project,
    contacts: project.contacts.map((c) => (c.libraryId && lc[c.libraryId] ? { ...c, ...pick(lc[c.libraryId], CONTACT_SHARED), libraryMissing: false } : c)),
    locations: project.locations.map((l) => (l.libraryId && ll[l.libraryId] ? { ...l, ...pick(ll[l.libraryId], LOCATION_SHARED), libraryMissing: false } : l)),
  }
}

export const contactToLibrary = (c) => ({ id: uid(), kind: c.kind || 'cast', ...pick(c, CONTACT_SHARED), role: c.role || '', tags: [], createdAt: new Date().toISOString() })
export const locationToLibrary = (l) => ({ id: uid(), ...pick(l, LOCATION_SHARED), tags: [], createdAt: new Date().toISOString() })
export const sharedContact = (c) => pick(c, CONTACT_SHARED)
export const sharedLocation = (l) => pick(l, LOCATION_SHARED)

// Where a library entry is used
export const contactProjects = (projects, libraryId) => projects.filter((p) => p.contacts.some((c) => c.libraryId === libraryId))
export const locationProjects = (projects, libraryId) => projects.filter((p) => p.locations.some((l) => l.libraryId === libraryId))

export const matchText = (q, ...fields) => {
  const s = (q || '').trim().toLowerCase()
  if (!s) return true
  return fields.some((f) => (f || '').toString().toLowerCase().includes(s))
}
