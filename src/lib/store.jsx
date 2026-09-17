import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { remote, supabase } from './supabase.js'

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
  { key: 'shots', label: 'Shot list' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'callsheets', label: 'Call sheets' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'reports', label: 'Reports' },
  { key: 'budget', label: 'Budget' },
  { key: 'gear', label: 'Equipment' },
  { key: 'post', label: 'Post' },
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
    shots: [],
    tasks: [],
    budget: { lines: [], contingencyPct: 10, currency: 'EUR', cap: '' },
    gear: [],
    vendors: [],
    post: { cuts: [], deliverables: [] },
    scriptVersions: [],
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
      return migrate(parsed)
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

export function migrateProject(p) {
  return { shots: [], tasks: [], budget: { lines: [], contingencyPct: 10, currency: 'EUR', cap: '' }, gear: [], vendors: [], post: { cuts: [], deliverables: [] }, scriptVersions: [], ...p }
}
function migrate(parsed) {
  // migrations: new modules and fields added after the first release
  parsed.projects = (parsed.projects || []).map(migrateProject)
  parsed.users = (parsed.users || []).map((u) => ({ ...u, permissions: { ...defaultPermissions(u.role === 'admin' ? 'edit' : 'view'), ...(u.permissions || {}) } }))
  return { ...emptyState(), ...parsed, settings: { ...emptyState().settings, ...(parsed.settings || {}) } }
}

/* ---------- context ---------- */
const StoreCtx = createContext(null)
const AI_KEY = 'tml_ai_key_v1' // in remote mode the AI key stays in this browser only

const memberToUser = (m) => ({
  id: m.user_id,
  name: m.name || m.email,
  email: m.email,
  role: m.role,
  permissions: { ...defaultPermissions(m.role === 'admin' ? 'edit' : 'view'), ...(m.permissions || {}) },
  projectAccess: m.project_access === 'all' || m.project_access === '"all"' ? 'all' : m.project_access,
  active: m.active !== false,
  createdAt: m.created_at,
})

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => (remote ? emptyState() : adapter.load() || emptyState()))
  const [sessionId, setSessionId] = useState(() => (remote ? '' : localStorage.getItem(SESSION_KEY) || ''))
  const [ready, setReady] = useState(!remote)
  const [authUser, setAuthUser] = useState(null)
  const [membership, setMembership] = useState(undefined) // undefined = unknown, null = no access
  const [invites, setInvites] = useState([])
  const [syncError, setSyncError] = useState('')
  const prevRef = useRef(state)
  const timers = useRef({})
  const myWrites = useRef(new Set())

  /* local mode persistence */
  useEffect(() => {
    if (!remote) adapter.save(state)
  }, [state])
  useEffect(() => {
    if (remote) return
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId)
    else localStorage.removeItem(SESSION_KEY)
  }, [sessionId])

  /* remote mode: auth */
  useEffect(() => {
    if (!remote) return
    supabase.auth.getSession().then(({ data }) => setAuthUser(data.session?.user || null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthUser(session?.user || null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadAll = useCallback(async (ws) => {
    const [w, m, p, e, inv] = await Promise.all([
      supabase.from('workspaces').select('*').eq('id', ws).single(),
      supabase.from('members').select('*').eq('workspace_id', ws),
      supabase.from('projects').select('id, data').eq('workspace_id', ws),
      supabase.from('events').select('id, data').eq('workspace_id', ws),
      supabase.from('invites').select('*').eq('workspace_id', ws),
    ])
    if (w.error) throw w.error
    const next = {
      ...emptyState(),
      workspace: { name: w.data.name, subtitle: w.data.subtitle, createdAt: w.data.created_at, id: ws },
      users: (m.data || []).map(memberToUser),
      projects: (p.data || []).map((r) => migrateProject({ ...r.data, id: r.id })).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
      events: (e.data || []).map((r) => ({ ...r.data, id: r.id })),
      settings: { ...emptyState().settings, ...(w.data.settings || {}), aiKey: localStorage.getItem(AI_KEY) || '' },
    }
    setInvites(inv.data || [])
    prevRef.current = next
    setState(next)
  }, [])

  useEffect(() => {
    if (!remote) return
    if (authUser === null) {
      setSessionId('')
      setMembership(undefined)
      setReady(true)
      return
    }
    if (!authUser) return
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('bootstrap', { p_name: authUser.user_metadata?.name || null })
        if (error) throw error
        if (cancelled) return
        if (!data) {
          setMembership(null)
          setReady(true)
          return
        }
        setMembership(data)
        await loadAll(data.workspace_id)
        setSessionId(authUser.id)
        setReady(true)
      } catch (e) {
        console.error(e)
        setSyncError(e.message || String(e))
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authUser, loadAll])

  /* remote mode: live updates from teammates */
  useEffect(() => {
    if (!remote || !membership) return
    const ws = membership.workspace_id
    const ch = supabase
      .channel('tml-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `workspace_id=eq.${ws}` }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setState((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== payload.old.id) }))
          return
        }
        const row = payload.new
        if (row.updated_by === authUser?.id && myWrites.current.has(row.id)) return
        const proj = migrateProject({ ...row.data, id: row.id })
        setState((s) => {
          const i = s.projects.findIndex((p) => p.id === row.id)
          const projects = i >= 0 ? s.projects.map((p) => (p.id === row.id ? proj : p)) : [proj, ...s.projects]
          const next = { ...s, projects }
          prevRef.current = next
          return next
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `workspace_id=eq.${ws}` }, (payload) => {
        setState((s) => {
          let events
          if (payload.eventType === 'DELETE') events = s.events.filter((e) => e.id !== payload.old.id)
          else {
            if (payload.new.updated_by === authUser?.id && myWrites.current.has(payload.new.id)) return s
            const ev = { ...payload.new.data, id: payload.new.id }
            events = s.events.some((e) => e.id === ev.id) ? s.events.map((e) => (e.id === ev.id ? ev : e)) : [...s.events, ev]
          }
          const next = { ...s, events }
          prevRef.current = next
          return next
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `workspace_id=eq.${ws}` }, async () => {
        const { data } = await supabase.from('members').select('*').eq('workspace_id', ws)
        if (data) setState((s) => {
          const next = { ...s, users: data.map(memberToUser) }
          prevRef.current = next
          return next
        })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [membership, authUser])

  /* remote mode: write what changed, debounced per row */
  const schedule = (key, fn, delay = 700) => {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(async () => {
      delete timers.current[key]
      try {
        await fn()
        setSyncError('')
      } catch (e) {
        console.error('sync failed', e)
        setSyncError(e.message || 'Could not save to the server')
      }
    }, delay)
  }
  const syncDiff = (prev, next) => {
    if (!remote || !membership) return
    const ws = membership.workspace_id
    const prevP = Object.fromEntries(prev.projects.map((p) => [p.id, p]))
    next.projects.forEach((p) => {
      const before = prevP[p.id]
      if (before && JSON.stringify(before) === JSON.stringify(p)) return
      myWrites.current.add(p.id)
      schedule('p:' + p.id, async () => {
        const { error } = await supabase.from('projects').upsert({ id: p.id, workspace_id: ws, data: p })
        if (error) throw error
        setTimeout(() => myWrites.current.delete(p.id), 4000)
      })
    })
    const nextIds = new Set(next.projects.map((p) => p.id))
    prev.projects.filter((p) => !nextIds.has(p.id)).forEach((p) =>
      schedule('pd:' + p.id, async () => {
        const { error } = await supabase.from('projects').delete().eq('id', p.id)
        if (error) throw error
      }, 0),
    )
    const prevE = Object.fromEntries(prev.events.map((e) => [e.id, e]))
    next.events.forEach((e) => {
      if (prevE[e.id] && JSON.stringify(prevE[e.id]) === JSON.stringify(e)) return
      myWrites.current.add(e.id)
      schedule('e:' + e.id, async () => {
        const { error } = await supabase.from('events').upsert({ id: e.id, workspace_id: ws, project_id: e.projectId || null, data: e })
        if (error) throw error
        setTimeout(() => myWrites.current.delete(e.id), 4000)
      })
    })
    const nextE = new Set(next.events.map((e) => e.id))
    prev.events.filter((e) => !nextE.has(e.id)).forEach((e) =>
      schedule('ed:' + e.id, async () => {
        const { error } = await supabase.from('events').delete().eq('id', e.id)
        if (error) throw error
      }, 0),
    )
    const prevU = Object.fromEntries(prev.users.map((u) => [u.id, u]))
    next.users.forEach((u) => {
      if (prevU[u.id] && JSON.stringify(prevU[u.id]) === JSON.stringify(u)) return
      if (!prevU[u.id]) return // new members arrive through invites, not here
      schedule('u:' + u.id, async () => {
        const { error } = await supabase.from('members').update({ name: u.name, role: u.role, permissions: u.permissions, project_access: u.projectAccess === 'all' ? 'all' : u.projectAccess, active: u.active !== false }).eq('workspace_id', ws).eq('user_id', u.id)
        if (error) throw error
      }, 0)
    })
    const wsChanged = JSON.stringify(prev.workspace) !== JSON.stringify(next.workspace)
    const { aiKey: pk, ...prevSettings } = prev.settings
    const { aiKey: nk, ...nextSettings } = next.settings
    if (nk !== pk) localStorage.setItem(AI_KEY, nk || '')
    if (wsChanged || JSON.stringify(prevSettings) !== JSON.stringify(nextSettings)) {
      schedule('ws', async () => {
        const { error } = await supabase.from('workspaces').update({ name: next.workspace.name, subtitle: next.workspace.subtitle, settings: nextSettings }).eq('id', ws)
        if (error) throw error
      })
    }
  }

  const api = useMemo(() => {
    const update = (fn) =>
      setState((s) => {
        const next = fn(structuredClone(s))
        syncDiff(prevRef.current, next)
        prevRef.current = next
        return next
      })
    const updateProject = (id, fn) =>
      update((s) => {
        const p = s.projects.find((x) => x.id === id)
        if (p) {
          fn(p)
          p.updatedAt = new Date().toISOString()
        }
        return s
      })
    const replaceState = (nextState) => {
      const next = migrate({ ...nextState })
      if (remote) {
        // import projects and events; users and workspace stay as they are on the server
        update((s) => ({ ...s, projects: next.projects, events: next.events }))
      } else setState(next)
    }
    const auth = remote
      ? {
          signIn: async (email, password) => {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error
          },
          signUp: async (email, password, name) => {
            const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
            if (error) throw error
            return !!data.session // false = email confirmation required
          },
          reset: async (email) => {
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname })
            if (error) throw error
          },
          updatePassword: async (password) => {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error
          },
          google: async () => {
            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } })
            if (error) throw error
          },
          signOut: async () => {
            await supabase.auth.signOut()
            setState(emptyState())
            prevRef.current = emptyState()
          },
        }
      : null
    const invite = async (u) => {
      const ws = membership.workspace_id
      const { error } = await supabase.from('invites').upsert({ workspace_id: ws, email: u.email.toLowerCase(), name: u.name, role: u.role, permissions: u.permissions, project_access: u.projectAccess === 'all' ? 'all' : u.projectAccess }, { onConflict: 'workspace_id,email' })
      if (error) throw error
      const { data } = await supabase.from('invites').select('*').eq('workspace_id', ws)
      setInvites(data || [])
    }
    const removeInvite = async (id) => {
      const { error } = await supabase.from('invites').delete().eq('id', id)
      if (error) throw error
      setInvites((l) => l.filter((i) => i.id !== id))
    }
    const localBackup = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    }
    return {
      mode: remote ? 'remote' : 'local',
      state,
      update,
      updateProject,
      replaceState,
      sessionId,
      ready,
      authUser,
      membership,
      invites,
      syncError,
      auth,
      invite,
      removeInvite,
      localBackup,
      login: (id) => setSessionId(id),
      logout: () => (remote ? auth.signOut() : setSessionId('')),
    }
  }, [state, sessionId, ready, authUser, membership, invites, syncError])

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
