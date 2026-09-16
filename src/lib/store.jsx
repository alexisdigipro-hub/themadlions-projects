import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/*
  Data layer.
  Phase 1: everything lives in localStorage under STORAGE_KEY.
  Phase 2: swap `adapter` for the Supabase adapter (see supabase/schema.sql).
  The UI only talks to useStore() so the swap does not touch the pages.
*/

export const STORAGE_KEY = 'tml_projects_v1'
export const SESSION_KEY = 'tml_session_v1'

export const CATEGORIES = ['Feature Film', 'Music Video', 'Advertise', 'Editing']
export const STATUSES = ['Development', 'Pre-production', 'Production', 'Post-production', 'Delivered', 'On hold']

export const MODULES = [
  { key: 'projects', label: 'Projects' },
  { key: 'script', label: 'Script' },
  { key: 'breakdown', label: 'Breakdown' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'callsheets', label: 'Call sheets' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'locations', label: 'Locations' },
  { key: 'contacts', label: 'Cast & crew' },
  { key: 'files', label: 'Files & notes' },
]

export const EVENT_TYPES = [
  { key: 'shoot', label: 'Shoot day', color: '#C8503F' },
  { key: 'prep', label: 'Prep', color: '#D9A441' },
  { key: 'scout', label: 'Location scout', color: '#5B9E7A' },
  { key: 'casting', label: 'Casting', color: '#B07FD1' },
  { key: 'rehearsal', label: 'Rehearsal', color: '#E08A5A' },
  { key: 'meeting', label: 'Meeting', color: '#6C9BD1' },
  { key: 'post', label: 'Post', color: '#4FB3BF' },
  { key: 'delivery', label: 'Delivery', color: '#9AA0A6' },
]

export const ELEMENT_CATEGORIES = [
  'Cast', 'Extras', 'Props', 'Set dressing', 'Wardrobe', 'Makeup & hair', 'Vehicles', 'Animals',
  'Stunts', 'Special effects', 'VFX', 'Sound', 'Camera & grip', 'Special equipment', 'Notes',
]

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function defaultPermissions(level = 'view') {
  return Object.fromEntries(MODULES.map((m) => [m.key, level]))
}

export function emptyState() {
  return {
    version: 1,
    workspace: { name: 'THEMADLIONS', subtitle: 'Projects', createdAt: new Date().toISOString() },
    users: [],
    projects: [],
    events: [],
    settings: { aiProvider: 'anthropic', aiKey: '', aiModel: 'claude-sonnet-4-6', mapsKey: '' },
  }
}

export function emptyProject(partial = {}) {
  return {
    id: uid(),
    title: 'Untitled project',
    category: 'Feature Film',
    status: 'Development',
    client: '',
    director: '',
    producer: '',
    startDate: '',
    endDate: '',
    notes: '',
    color: '#C8503F',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    script: { text: '', fileName: '', format: '', importedAt: '' },
    scenes: [],
    shootingDays: [],
    locations: [],
    contacts: [],
    breakdownStatus: 'none',
    ...partial,
  }
}

/* ---------- adapter (localStorage) ---------- */
const adapter = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return { ...emptyState(), ...parsed, settings: { ...emptyState().settings, ...(parsed.settings || {}) } }
    } catch {
      return null
    }
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error('Could not save workspace', e)
    }
  },
}

/* ---------- context ---------- */
const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => adapter.load() || emptyState())
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY) || '')

  useEffect(() => {
    adapter.save(state)
  }, [state])

  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId)
    else localStorage.removeItem(SESSION_KEY)
  }, [sessionId])

  const api = useMemo(() => {
    const update = (fn) => setState((s) => fn(structuredClone(s)))
    const updateProject = (id, fn) =>
      update((s) => {
        const p = s.projects.find((x) => x.id === id)
        if (p) {
          fn(p)
          p.updatedAt = new Date().toISOString()
        }
        return s
      })
    return {
      state,
      update,
      updateProject,
      replaceState: (next) => setState({ ...emptyState(), ...next }),
      sessionId,
      login: (id) => setSessionId(id),
      logout: () => setSessionId(''),
    }
  }, [state, sessionId])

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>
}

export function useStore() {
  return useContext(StoreCtx)
}

export function useCurrentUser() {
  const { state, sessionId } = useStore()
  return state.users.find((u) => u.id === sessionId && u.active !== false) || null
}

/* ---------- permissions ---------- */
export function can(user, moduleKey, level = 'view') {
  if (!user) return false
  if (user.role === 'admin') return true
  const has = user.permissions?.[moduleKey] || 'none'
  if (level === 'view') return has === 'view' || has === 'edit'
  return has === 'edit'
}

export function canAccessProject(user, projectId) {
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.projectAccess === 'all') return true
  return Array.isArray(user.projectAccess) && user.projectAccess.includes(projectId)
}

export function visibleProjects(state, user) {
  return state.projects.filter((p) => canAccessProject(user, p.id))
}

/* ---------- sample data ---------- */
export function sampleProject() {
  const p = emptyProject({
    title: 'Fourteen',
    category: 'Feature Film',
    status: 'Pre-production',
    director: 'Alex Konstantinidis',
    producer: 'The Mad Lions',
    startDate: today(),
    color: '#C8503F',
    notes: 'Single-location bunker thriller. Sample data so you can click around.',
  })
  p.script = {
    text: SAMPLE_SCRIPT,
    fileName: 'sample-script.txt',
    format: 'txt',
    importedAt: new Date().toISOString(),
  }
  p.locations = [
    { id: uid(), name: 'Bunker set', address: 'Πειραιώς 260, Ταύρος 177 78, Greece', type: 'Studio', notes: 'Stage A. Load-in from the north gate.', contact: '', phone: '' },
    { id: uid(), name: 'Rooftop', address: 'Λυκαβηττός, Αθήνα, Greece', type: 'Exterior', notes: 'Golden hour only. Permit pending.', contact: '', phone: '' },
  ]
  p.contacts = [
    { id: uid(), kind: 'cast', name: 'Maria P.', character: 'ELENI', dept: 'Cast', role: 'Lead', phone: '', email: '' },
    { id: uid(), kind: 'cast', name: 'Nikos D.', character: 'PETROS', dept: 'Cast', role: 'Lead', phone: '', email: '' },
    { id: uid(), kind: 'crew', name: 'DoP TBC', character: '', dept: 'Camera', role: 'Director of Photography', phone: '', email: '' },
    { id: uid(), kind: 'crew', name: '1st AD TBC', character: '', dept: 'Production', role: '1st Assistant Director', phone: '', email: '' },
  ]
  return p
}

export const SAMPLE_SCRIPT = `FADE IN:

INT. BUNKER - CORRIDOR - NIGHT

A narrow concrete corridor. Emergency lights flicker. ELENI (30s), soaked, drags a heavy steel door shut behind her.

ELENI
(whispering)
Petros? Are you in here?

Silence. A radio crackles somewhere deeper inside.

INT. BUNKER - CONTROL ROOM - CONTINUOUS

Rows of dead monitors. PETROS (40s) sits at a desk holding a revolver, a bottle of whiskey next to him.

PETROS
You shouldn't have come back.

ELENI
The door won't open from outside anymore.

He puts the gun down. She notices a hospital bracelet on his wrist.

EXT. ROOFTOP - DAY

Wind. The city below. ELENI stands at the ledge holding a flare gun. A black SUV idles in the street.

ELENI
(into radio)
Fourteen days. That's all we have.

FADE OUT.`
