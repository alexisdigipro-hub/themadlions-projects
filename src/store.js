import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { seedProjects } from './seed'

/*
  Data layer.
  Phase 1: everything lives in localStorage (one browser).
  Phase 2: swap `loadState` / `persist` for a Supabase adapter; the shape below maps 1:1 to tables.
*/

export const STATE_KEY = 'tml.state.v1'
export const SESSION_KEY = 'tml.session.v1'

export const CATEGORIES = ['Feature Film', 'Music Video', 'Advertise', 'Editing']
export const PROJECT_STATUS = ['Development', 'Pre-production', 'Production', 'Post-production', 'Delivered', 'On hold']
export const MODULES = [
  ['overview', 'Overview'],
  ['script', 'Script'],
  ['breakdown', 'Breakdown'],
  ['schedule', 'Schedule'],
  ['calendar', 'Calendar'],
  ['locations', 'Locations'],
  ['people', 'Cast & crew'],
  ['callsheets', 'Call sheets'],
  ['files', 'Files'],
]
export const EVENT_TYPES = [
  ['shoot', 'Shoot day', '#d9a441'],
  ['prep', 'Prep', '#c9c1b3'],
  ['meeting', 'Meeting', '#8fb3d9'],
  ['rehearsal', 'Rehearsal', '#b58fd9'],
  ['scout', 'Location scout', '#7fb069'],
  ['casting', 'Casting', '#e08e45'],
  ['post', 'Post', '#6fa8dc'],
  ['delivery', 'Delivery', '#d95f4b'],
  ['wrap', 'Wrap', '#f0c467'],
  ['other', 'Other', '#8f8677'],
]
export const ELEMENT_CATEGORIES = [
  'Cast', 'Extras', 'Props', 'Wardrobe', 'Makeup & hair', 'Set dressing', 'Vehicles',
  'Animals', 'Stunts', 'SFX', 'VFX', 'Sound', 'Camera', 'Art', 'Notes',
]
export const DEPARTMENTS = [
  'Direction', 'Production', 'Camera', 'Lighting', 'Grip', 'Sound', 'Art', 'Wardrobe',
  'Makeup & hair', 'Cast', 'Locations', 'Post', 'Client', 'Vendor', 'Other',
]

export const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)

export const emptyState = () => ({
  workspace: { name: 'THEMADLIONS', subtitle: 'Projects', createdAt: null },
  users: [],
  access: {},        // { [userId]: { [projectId]: { [module]: 'view' | 'edit' } } }
  projects: [],
  scripts: {},       // { [projectId]: { text, fileName, importedAt } }
  scenes: [],
  elements: [],
  shootDays: [],
  events: [],
  locations: [],
  contacts: [],
  callSheets: [],
  files: [],
  settings: { aiKey: '', aiModel: 'claude-sonnet-4-6', mapsKey: '' },
})

export function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return emptyState()
    return { ...emptyState(), ...JSON.parse(raw) }
  } catch {
    return emptyState()
  }
}
export function persist(state) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)) } catch (e) { console.warn('persist failed', e) }
}
export function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}
export function saveSession(s) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY)
}

export async function hashPassword(pw) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tml::' + pw))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return 'plain:' + pw
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'replace': return { ...emptyState(), ...action.state }
    case 'patch': return { ...state, [action.key]: { ...state[action.key], ...action.value } }
    case 'setScript': return { ...state, scripts: { ...state.scripts, [action.projectId]: action.script } }
    case 'upsert': {
      const list = state[action.table]
      const i = list.findIndex(x => x.id === action.item.id)
      const next = i === -1 ? [...list, action.item] : list.map(x => x.id === action.item.id ? { ...x, ...action.item } : x)
      return { ...state, [action.table]: next }
    }
    case 'upsertMany': {
      const map = new Map(state[action.table].map(x => [x.id, x]))
      action.items.forEach(it => map.set(it.id, { ...(map.get(it.id) || {}), ...it }))
      return { ...state, [action.table]: Array.from(map.values()) }
    }
    case 'remove': return { ...state, [action.table]: state[action.table].filter(x => x.id !== action.id) }
    case 'removeWhere': return { ...state, [action.table]: state[action.table].filter(x => !action.where(x)) }
    case 'setAccess': {
      const { userId, projectId, module, level } = action
      const u = { ...(state.access[userId] || {}) }
      const p = { ...(u[projectId] || {}) }
      if (level === 'none') delete p[module]; else p[module] = level
      u[projectId] = p
      return { ...state, access: { ...state.access, [userId]: u } }
    }
    case 'setProjectAccess': {
      const { userId, projectId, level } = action
      const u = { ...(state.access[userId] || {}) }
      if (level === 'none') delete u[projectId]
      else u[projectId] = Object.fromEntries(MODULES.map(([m]) => [m, level]))
      return { ...state, access: { ...state.access, [userId]: u } }
    }
    case 'deleteProject': {
      const pid = action.id
      const drop = t => state[t].filter(x => x.projectId !== pid)
      const scripts = { ...state.scripts }; delete scripts[pid]
      const access = Object.fromEntries(Object.entries(state.access).map(([u, p]) => { const c = { ...p }; delete c[pid]; return [u, c] }))
      return {
        ...state, scripts, access,
        projects: state.projects.filter(p => p.id !== pid),
        scenes: drop('scenes'), elements: drop('elements'), shootDays: drop('shootDays'), events: drop('events'),
        callSheets: drop('callSheets'), files: drop('files'),
        locations: state.locations.filter(l => l.projectId !== pid),
      }
    }
    default: return state
  }
}

const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)
  const [session, setSession] = React.useState(loadSession)
  useEffect(() => { persist(state) }, [state])
  useEffect(() => { saveSession(session) }, [session])

  const me = useMemo(() => state.users.find(u => u.id === session?.userId) || null, [state.users, session])

  const api = useMemo(() => ({
    state, dispatch, session, setSession, me,
    isAdmin: me?.role === 'admin',
    can: (projectId, module, level = 'view') => can(state, me, projectId, module, level),
    visibleProjects: () => state.projects.filter(p => can(state, me, p.id, 'overview', 'view')),
    seed: () => {
      const s = seedProjects(me?.id)
      dispatch({ type: 'upsertMany', table: 'projects', items: s.projects })
      dispatch({ type: 'upsertMany', table: 'scenes', items: s.scenes })
      dispatch({ type: 'upsertMany', table: 'elements', items: s.elements })
      dispatch({ type: 'upsertMany', table: 'events', items: s.events })
      dispatch({ type: 'upsertMany', table: 'locations', items: s.locations })
      dispatch({ type: 'upsertMany', table: 'contacts', items: s.contacts })
      dispatch({ type: 'upsertMany', table: 'shootDays', items: s.shootDays })
      Object.entries(s.scripts).forEach(([pid, script]) => dispatch({ type: 'setScript', projectId: pid, script }))
    },
  }), [state, session, me])

  return React.createElement(StoreCtx.Provider, { value: api }, children)
}

export const useStore = () => useContext(StoreCtx)

export function can(state, user, projectId, module, level = 'view') {
  if (!user) return false
  if (user.role === 'admin') return true
  const lvl = state.access?.[user.id]?.[projectId]?.[module]
  if (!lvl) return false
  if (level === 'view') return true
  return lvl === 'edit'
}

export const fmtDate = (d, opts = { day: 'numeric', month: 'short' }) =>
  d ? new Date(d).toLocaleDateString('en-GB', opts) : ''
export const fmtDateLong = d => fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
export const toISODate = d => {
  const x = new Date(d); const p = n => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
}
export const eighthsToPages = e => {
  if (!e) return '0'
  const w = Math.floor(e / 8), r = e % 8
  return r ? (w ? `${w} ${r}/8` : `${r}/8`) : String(w)
}
