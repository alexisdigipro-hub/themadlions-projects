import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { remote, supabase } from './supabase.js'
import { toISODate } from './dates.js'

/*
  Data layer.
  Phase 1: everything lives in localStorage under STORAGE_KEY.
  Phase 2: swap `adapter` for the Supabase adapter (see supabase/schema.sql).
  The UI only talks to useStore() so the swap does not touch the pages.
*/

export const STORAGE_KEY = 'tml_projects_v1'
export const SESSION_KEY = 'tml_session_v1'

export const CATEGORIES = ['Music Video', 'Event', 'Editing', 'Ad', 'Visuals', 'IV']
export const STATUSES = ['Development', 'Pre-production', 'Production', 'Post-production', 'Delivered', 'On hold']

export const MODULES = [
  { key: 'projects', label: 'Projects' },
  { key: 'music', label: 'Music' },
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
  { key: 'drives', label: 'Drives archive' },
  { key: 'share', label: 'Share' },
]

/* Ready-made permission sets, so a new person is one click instead of eighteen dropdowns.
   Whatever a preset does not name is 'none'. Finance stays administrators only, whatever is set here. */
export const ROLE_PRESETS = [
  ['Producer', { projects: 'edit', calendar: 'edit', tasks: 'edit', schedule: 'edit', callsheets: 'edit', contacts: 'edit', locations: 'edit', files: 'edit', reports: 'view', budget: 'view', gear: 'view', drives: 'view', script: 'view', breakdown: 'view', shots: 'view', music: 'view', post: 'view', share: 'edit' }],
  ['Director', { projects: 'view', script: 'edit', breakdown: 'edit', shots: 'edit', music: 'edit', files: 'edit', tasks: 'edit', calendar: 'view', schedule: 'view', callsheets: 'view', contacts: 'view', locations: 'view', gear: 'view', reports: 'view', post: 'view', drives: 'view', share: 'view' }],
  ['Editor', { projects: 'view', post: 'edit', files: 'edit', drives: 'edit', music: 'view', calendar: 'view', tasks: 'edit', share: 'view' }],
  ['1st AD', { projects: 'view', schedule: 'edit', callsheets: 'edit', tasks: 'edit', calendar: 'edit', contacts: 'edit', locations: 'edit', breakdown: 'view', shots: 'view', gear: 'view', files: 'view' }],
  ['Crew', { projects: 'view', callsheets: 'view', calendar: 'view', tasks: 'view' }],
  ['Accountant', { projects: 'view', budget: 'edit', gear: 'view', reports: 'view', files: 'view' }],
]
export function presetPermissions(preset) {
  return Object.fromEntries(MODULES.map((m) => [m.key, preset[m.key] || 'none']))
}

export const EVENT_TYPES = [
  { key: 'shoot', label: 'Shoot day', color: '#C8503F' },
  { key: 'prep', label: 'Prep', color: '#D9A441' },
  { key: 'scout', label: 'Location scout', color: '#5B9E7A' },
  { key: 'casting', label: 'Casting', color: '#B07FD1' },
  { key: 'rehearsal', label: 'Rehearsal', color: '#E08A5A' },
  { key: 'meeting', label: 'Meeting', color: '#6C9BD1' },
  { key: 'post', label: 'Post', color: '#4FB3BF' },
  { key: 'delivery', label: 'Delivery', color: '#9AA0A6' },
  { key: 'unavailable', label: 'Not available', color: '#6B7280' },
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

export const DEFAULT_DEPARTMENTS = ['Production', 'Direction', 'Camera', 'Lighting', 'Grip', 'Sound', 'Art', 'Costume', 'Makeup & hair', 'Locations', 'Casting', 'Post', 'Transport', 'Catering', 'Client', 'Other']
export const departmentsOf = (state) => (state.settings?.departments?.length ? state.settings.departments : DEFAULT_DEPARTMENTS)
export const callsheetDefaults = (state) => ({ callTime: '07:00', wrapTime: '19:00', lunchAfterHours: 6, hospital: '', parking: '', tagline: '', footer: '', castOffset: 0, crewOffset: 0, showWeather: true, showSun: true, ...(state.settings?.callsheet || {}) })
/* Who marked themselves not available on a given day. Days off are ordinary calendar events
   of type 'unavailable', stamped with the id of whoever created them, and they can span a
   range, so a single date has to fall inside date..endDate. */
export const unavailableOn = (events, iso) => new Set(
  (events || [])
    .filter((e) => e.type === 'unavailable' && e.date && e.date <= iso && (e.endDate || e.date) >= iso)
    // personId is who the day off is for; days off written before administrators set them for
    // other people carry only createdBy, which was the same person.
    .map((e) => e.personId || e.createdBy)
    .filter(Boolean),
)
export const canSendNotices = (state, user) => !!user && user.role === 'admin'
export const canSeeContacts = (state, user) => !!user && (user.role === 'admin' || (state.settings?.phoneVisibility || 'everyone') === 'everyone')

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
    library: { contacts: [], locations: [], drives: [] },
    todos: [],
    chat: [],
    notices: [],
    worklog: [],
    finance: { transactions: [], recurring: [], settings: { currency: 'EUR', vatDefault: 24, taxRate: 22, fiscalYearStart: 1 } },
    settings: {
      aiProvider: 'anthropic', aiKey: '', aiModel: 'claude-sonnet-4-6', mapsKey: '',
      logo: '', // data URL, square-ish, max 256px
      callsheet: { callTime: '07:00', wrapTime: '19:00', lunchAfterHours: 6, hospital: '', parking: '', tagline: '', footer: '', castOffset: 0, crewOffset: 0, showWeather: true, showSun: true },
      budgetCurrency: 'EUR', budgetContingency: 10,
      progress: {}, // per category overrides, see progress.js
      driveSeriesOrder: [],
      departments: DEFAULT_DEPARTMENTS,
      newMemberLevel: 'view', // 'none' | 'view' | 'edit'  (default permissions when adding a teammate)
      phoneVisibility: 'everyone', // 'everyone' | 'admins'  (who sees phone numbers and emails of cast and crew)
      shareExpiryDays: 0, // public call sheet links stop working this many days after the shooting day; 0 = never
      weekStart: 'monday', // 'monday' | 'sunday'
      defaultCategory: 'Music Video',
      noticeVibrate: true,
      greekHolidays: true, // show Greek public holidays in the calendars
      aiLanguage: 'greek', // 'greek' | 'english'  (language the AI writes its breakdown in)
      projectCodePrefix: 'TML', // project codes look like TML-2026-001; empty string turns codes off
      // Emergency numbers printed on every call sheet. Editable in Settings > Call sheets.
      emergency: [{ id: 'ekab', label: 'Ambulance (ΕΚΑΒ)', number: '166' }, { id: 'fire', label: 'Fire brigade', number: '199' }],
      productionContacts: [], // [{ id, role, name, phone }] auto-filled into every call sheet
      autoNotice: { taskAssigned: true, chatMessage: true }, // which events pop a notice
    },
  }
}

/* Next project code for this year, e.g. TML-2026-004. Derived from the codes already in
   use instead of a stored counter, so two people creating projects at once cannot collide
   on a stale number. An empty prefix in Settings turns codes off. */
export function nextProjectCode(state, year = new Date().getFullYear()) {
  const prefix = (state?.settings?.projectCodePrefix ?? 'TML').trim()
  if (!prefix) return ''
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${year}-(\\d+)$`, 'i')
  const used = (state?.projects || []).map((p) => re.exec(p.code || '')).filter(Boolean).map((m) => Number(m[1]))
  return `${prefix}-${year}-${String(Math.max(0, ...used) + 1).padStart(3, '0')}`
}

export function emptyProject(partial = {}) {
  return {
    id: uid(),
    title: 'Untitled project',
    category: 'Music Video',
    status: 'Development',
    client: '',
    director: '',
    producer: '',
    startDate: '',
    endDate: '',
    notes: '',
    code: '', // TML-2026-001, filled in by nextProjectCode() when the project is created
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
    music: { tracks: [], activeTrackId: '', sections: [], notes: '' },
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

const OLD_CATEGORIES = { Events: 'Event', 'Feature Film': 'Visuals', Advertise: 'Ad' }
export function migrateProject(p) {
  if (OLD_CATEGORIES[p.category]) p = { ...p, category: OLD_CATEGORIES[p.category] }
  return { shots: [], tasks: [], budget: { lines: [], contingencyPct: 10, currency: 'EUR', cap: '' }, gear: [], vendors: [], post: { cuts: [], deliverables: [] }, scriptVersions: [], ...p }
}
function migrate(parsed) {
  // migrations: new modules and fields added after the first release
  parsed.projects = (parsed.projects || []).map(migrateProject)
  parsed.users = (parsed.users || []).map((u) => ({ ...u, permissions: { ...defaultPermissions(u.role === 'admin' ? 'edit' : 'view'), ...(u.permissions || {}) } }))
  return { ...emptyState(), ...parsed, library: { contacts: [], locations: [], drives: [], ...(parsed.library || {}) }, finance: { ...emptyState().finance, ...(parsed.finance || {}), recurring: parsed.finance?.recurring || [], settings: { ...emptyState().finance.settings, ...(parsed.finance?.settings || {}) } }, settings: { ...emptyState().settings, ...(parsed.settings || {}), callsheet: { ...emptyState().settings.callsheet, ...(parsed.settings?.callsheet || {}) } } }
}

const rowToMessage = (r) => ({ id: r.id, userId: r.user_id || '', userName: r.user_name || '', text: r.text || '', source: r.source || 'app', createdAt: r.created_at })

/* ---------- context ---------- */
const StoreCtx = createContext(null)
const AI_KEY = 'tml_ai_key_v1' // in remote mode the AI key stays in this browser only
const OAI_KEY = 'tml_openai_key_v1'

const memberToUser = (m) => ({
  id: m.user_id,
  name: m.name || m.email,
  email: m.email,
  role: m.role,
  // 'none' and not 'view': this fills in only the modules a member's stored row has never heard of,
  // which in practice means whatever module was added after they joined. Filling those with view
  // handed every new part of the app to everyone the day it shipped.
  permissions: { ...defaultPermissions(m.role === 'admin' ? 'edit' : 'none'), ...(m.permissions || {}) },
  projectAccess: m.project_access === 'all' || m.project_access === '"all"' ? 'all' : m.project_access,
  active: m.active !== false,
  profile: m.profile || {}, // { photo, thumb, position, dept, phone, bio, birthday, showPhone }
  createdAt: m.created_at,
})

const VIEW_AS_KEY = 'tml_view_as'
/* Postgres writes a timestamp as ...+00:00 and the browser writes ...Z, so the two never compare
   correctly as text. Everything that asks "is this newer than that" goes through here. */
export const whenMs = (v) => { const n = Date.parse(v || ''); return Number.isFinite(n) ? n : 0 }

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => (remote ? emptyState() : adapter.load() || emptyState()))
  const [sessionId, setSessionId] = useState(() => (remote ? '' : localStorage.getItem(SESSION_KEY) || ''))
  const [ready, setReady] = useState(!remote)
  // undefined = we have not looked yet, null = definitely signed out, object = signed in.
  // Starting at null made the app decide "signed out" on the very first render, before
  // getSession() had a chance to restore the stored session, which threw people to the
  // login page every time they opened the app.
  const [authUser, setAuthUser] = useState(undefined)
  const [membership, setMembership] = useState(undefined) // undefined = unknown, null = no access
  const [invites, setInvites] = useState([])
  const [syncError, setSyncError] = useState('')
  // "View as": an administrator looking at the app through someone else's permissions. It lives in
  // sessionStorage, so closing the tab ends it and it never follows anyone to another device.
  const [viewAs, setViewAs] = useState(() => { try { return sessionStorage.getItem(VIEW_AS_KEY) || '' } catch { return '' } })
  // Every answer a client has left on a delivery page, oldest first.
  const [replies, setReplies] = useState([])
  const prevRef = useRef(state)
  const timers = useRef({})
  const myWrites = useRef(new Set())

  useEffect(() => {
    try { viewAs ? sessionStorage.setItem(VIEW_AS_KEY, viewAs) : sessionStorage.removeItem(VIEW_AS_KEY) } catch { /* private window */ }
  }, [viewAs])

  /* Clients answer through share_respond(), which writes straight to the database and never touches
     this app's state, so the only way to know is to ask. Asked every minute and a half rather than
     pushed: it is a handful of short rows, and for someone who does not have the app open the real
     answer is a notification on the phone, which is its own piece of work. */
  const mayShare = !!membership && (membership.role === 'admin' || ['view', 'edit'].includes(membership.permissions?.share))
  useEffect(() => {
    const ws = membership?.workspace_id
    if (!remote || !mayShare || !ws) { setReplies([]); return }
    let stop = false
    const read = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      // No error message on purpose: the responses column only exists once deliveries.sql has been
      // run, and a missing badge is better than a warning on every page.
      const { data, error } = await supabase.from('shares').select('token, responses').eq('workspace_id', ws).eq('kind', 'delivery')
      if (stop || error) return
      const out = []
      for (const row of data || []) {
        for (const r of Array.isArray(row.responses) ? row.responses : []) out.push({ ...r, token: row.token })
      }
      out.sort((a, b) => whenMs(a.at) - whenMs(b.at))
      setReplies(out)
    }
    read()
    const timer = setInterval(read, 90000)
    document.addEventListener('visibilitychange', read)
    return () => { stop = true; clearInterval(timer); document.removeEventListener('visibilitychange', read) }
  }, [mayShare, membership?.workspace_id])

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
    supabase.auth.getSession().then(({ data }) => setAuthUser(data.session?.user || null)).catch(() => setAuthUser(null))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // A session on any event means still signed in. Only a real sign-out signs out: a
      // refresh that fails once on a bad connection must not throw the person to the login
      // page while their refresh token is still perfectly good.
      if (session?.user) return setAuthUser(session.user)
      if (event === 'SIGNED_OUT') return setAuthUser(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadAll = useCallback(async (ws) => {
    const [w, m, p, e, inv, lib, fin, msg, ntc, wl] = await Promise.all([
      supabase.from('workspaces').select('*').eq('id', ws).single(),
      supabase.from('members').select('*').eq('workspace_id', ws),
      supabase.from('projects').select('id, data').eq('workspace_id', ws),
      supabase.from('events').select('id, data').eq('workspace_id', ws),
      supabase.from('invites').select('*').eq('workspace_id', ws),
      supabase.from('library').select('id, kind, data').eq('workspace_id', ws),
      supabase.from('finance').select('id, kind, data').eq('workspace_id', ws),
      supabase.from('messages').select('id, user_id, user_name, text, source, created_at').eq('workspace_id', ws).order('created_at', { ascending: true }).limit(500),
      supabase.from('notices').select('id, data').eq('workspace_id', ws),
      supabase.from('worklog').select('id, user_id, data').eq('workspace_id', ws),
    ])
    if (w.error) throw w.error
    const libRows = lib.error ? [] : lib.data || [] // library table may not exist yet (library.sql not run)
    if (lib.error) console.warn('library not available yet:', lib.error.message)
    const finRows = fin.error ? [] : fin.data || [] // admins only; members get nothing (RLS) or the table is missing
    const finSettings = finRows.find((r) => r.kind === 'settings')?.data || {}
    const msgRows = msg.error ? [] : msg.data || [] // chat table may not exist yet (chat.sql not run)
    const ntcRows = ntc.error ? [] : ntc.data || [] // notices table may not exist yet (notices.sql not run)
    const wlRows = wl.error ? [] : wl.data || [] // worklog table may not exist yet (worklog.sql not run)
    if (msg.error) console.warn('chat not available yet:', msg.error.message)
    const next = {
      ...emptyState(),
      workspace: { name: w.data.name, subtitle: w.data.subtitle, createdAt: w.data.created_at, id: ws },
      users: (m.data || []).map(memberToUser),
      projects: (p.data || []).map((r) => migrateProject({ ...r.data, id: r.id })).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
      events: (e.data || []).map((r) => ({ ...r.data, id: r.id })),
      library: {
        contacts: libRows.filter((r) => r.kind === 'contact').map((r) => ({ ...r.data, id: r.id })),
        locations: libRows.filter((r) => r.kind === 'location').map((r) => ({ ...r.data, id: r.id })),
        drives: libRows.filter((r) => r.kind === 'drive').map((r) => ({ ...r.data, id: r.id })),
      },
      todos: libRows.filter((r) => r.kind === 'task').map((r) => ({ ...r.data, id: r.id })),
      chat: msgRows.map(rowToMessage),
      notices: ntcRows.map((r) => ({ ...r.data, id: r.id })),
      worklog: wlRows.map((r) => ({ ...r.data, id: r.id, userId: r.user_id })),
      finance: {
        transactions: finRows.filter((r) => r.kind === 'tx').map((r) => ({ ...r.data, id: r.id })),
        recurring: finRows.filter((r) => r.kind === 'recurring').map((r) => ({ ...r.data, id: r.id })),
        settings: { ...emptyState().finance.settings, ...finSettings },
      },
      settings: { ...emptyState().settings, ...(w.data.settings || {}), aiKey: localStorage.getItem(AI_KEY) || '', openaiKey: localStorage.getItem(OAI_KEY) || '' },
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'library', filter: `workspace_id=eq.${ws}` }, (payload) => {
        setState((s) => {
          const kind = payload.new?.kind || payload.old?.kind
          if (kind === 'task') {
            let todos
            if (payload.eventType === 'DELETE') todos = s.todos.filter((t) => t.id !== payload.old.id)
            else {
              if (payload.new.updated_by === authUser?.id && myWrites.current.has(payload.new.id)) return s
              const t = { ...payload.new.data, id: payload.new.id }
              todos = s.todos.some((x) => x.id === t.id) ? s.todos.map((x) => (x.id === t.id ? t : x)) : [...s.todos, t]
            }
            const next = { ...s, todos }
            prevRef.current = next
            return next
          }
          const key = kind === 'location' ? 'locations' : kind === 'drive' ? 'drives' : 'contacts'
          const lib = { ...s.library }
          lib[key] = lib[key] || []
          if (payload.eventType === 'DELETE') lib[key] = lib[key].filter((x) => x.id !== payload.old.id)
          else {
            if (payload.new.updated_by === authUser?.id && myWrites.current.has(payload.new.id)) return s
            const item = { ...payload.new.data, id: payload.new.id }
            lib[key] = lib[key].some((x) => x.id === item.id) ? lib[key].map((x) => (x.id === item.id ? item : x)) : [...lib[key], item]
          }
          const next = { ...s, library: lib }
          prevRef.current = next
          return next
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worklog', filter: `workspace_id=eq.${ws}` }, (payload) => {
        setState((s) => {
          let worklog
          if (payload.eventType === 'DELETE') worklog = (s.worklog || []).filter((n) => n.id !== payload.old.id)
          else {
            if (payload.new.updated_by === authUser?.id && myWrites.current.has(payload.new.id)) return s
            const n = { ...payload.new.data, id: payload.new.id, userId: payload.new.user_id }
            worklog = (s.worklog || []).some((x) => x.id === n.id) ? s.worklog.map((x) => (x.id === n.id ? n : x)) : [...(s.worklog || []), n]
          }
          const next = { ...s, worklog }
          prevRef.current = next
          return next
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices', filter: `workspace_id=eq.${ws}` }, (payload) => {
        setState((s) => {
          let notices
          if (payload.eventType === 'DELETE') notices = (s.notices || []).filter((n) => n.id !== payload.old.id)
          else {
            if (payload.new.updated_by === authUser?.id && myWrites.current.has(payload.new.id)) return s
            const n = { ...payload.new.data, id: payload.new.id }
            notices = (s.notices || []).some((x) => x.id === n.id) ? s.notices.map((x) => (x.id === n.id ? n : x)) : [...(s.notices || []), n]
          }
          const next = { ...s, notices }
          prevRef.current = next
          return next
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `workspace_id=eq.${ws}` }, (payload) => {
        setState((s) => {
          let chat
          if (payload.eventType === 'DELETE') chat = (s.chat || []).filter((m) => m.id !== payload.old.id)
          else {
            const m = rowToMessage(payload.new)
            chat = (s.chat || []).some((x) => x.id === m.id) ? s.chat.map((x) => (x.id === m.id ? m : x)) : [...(s.chat || []), m]
          }
          const next = { ...s, chat }
          prevRef.current = next
          return next
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance', filter: `workspace_id=eq.${ws}` }, (payload) => {
        setState((s) => {
          const fin = { ...s.finance }
          const kind = payload.new?.kind || payload.old?.kind
          if (kind === 'settings') {
            if (payload.eventType !== 'DELETE') fin.settings = { ...fin.settings, ...payload.new.data }
          } else if (kind === 'recurring') {
            if (payload.eventType === 'DELETE') fin.recurring = (fin.recurring || []).filter((t) => t.id !== payload.old.id)
            else {
              if (payload.new.updated_by === authUser?.id && myWrites.current.has(payload.new.id)) return s
              const r = { ...payload.new.data, id: payload.new.id }
              fin.recurring = (fin.recurring || []).some((t) => t.id === r.id) ? fin.recurring.map((t) => (t.id === r.id ? r : t)) : [...(fin.recurring || []), r]
            }
          } else if (payload.eventType === 'DELETE') fin.transactions = fin.transactions.filter((t) => t.id !== payload.old.id)
          else {
            if (payload.new.updated_by === authUser?.id && myWrites.current.has(payload.new.id)) return s
            const tx = { ...payload.new.data, id: payload.new.id }
            fin.transactions = fin.transactions.some((t) => t.id === tx.id) ? fin.transactions.map((t) => (t.id === tx.id ? tx : t)) : [...fin.transactions, tx]
          }
          const next = { ...s, finance: fin }
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
  const actBuf = useRef({}) // key -> { row, keys:Set, timer }
  const logActivity = (row, mergeKey, key) => {
    if (!remote || !membership) return
    const base = { workspace_id: membership.workspace_id, user_id: authUser?.id || null, user_name: membership.name || authUser?.email || '' }
    if (!mergeKey) { supabase.from('activity').insert({ ...base, ...row }).then(({ error }) => { if (error && error.code !== '42P01') console.warn('activity:', error.message) }); return }
    const b = actBuf.current[mergeKey] || { row, keys: new Set(), timer: null }
    if (key) b.keys.add(key)
    clearTimeout(b.timer)
    b.timer = setTimeout(() => {
      delete actBuf.current[mergeKey]
      supabase.from('activity').insert({ ...base, ...b.row, detail: [...b.keys].join(', ') }).then(({ error }) => { if (error && error.code !== '42P01') console.warn('activity:', error.message) })
    }, 4000)
    actBuf.current[mergeKey] = b
  }
  const PROJECT_KEYS = { title: 'title', status: 'status', category: 'category', client: 'client', director: 'director', producer: 'producer', startDate: 'dates', endDate: 'dates', color: 'colour', coverThumb: 'cover', notes: 'notes', concept: 'concept', script: 'script', scriptVersions: 'script versions', scenes: 'breakdown', shots: 'shot list', shootingDays: 'schedule / call sheets', contacts: 'cast & crew', locations: 'locations', tasks: 'tasks', budget: 'budget', gear: 'equipment', vendors: 'vendors', post: 'post', files: 'files', music: 'music', frozen: 'lock', customStages: 'progress stages' }
  const syncDiff = (prev, next) => {
    if (!remote || !membership) return
    const ws = membership.workspace_id
    const prevP = Object.fromEntries(prev.projects.map((p) => [p.id, p]))
    next.projects.forEach((p) => {
      const before = prevP[p.id]
      if (before && JSON.stringify(before) === JSON.stringify(p)) return
      if (!before) logActivity({ action: 'created', target: 'project', target_name: p.title, project_id: p.id })
      else if (before.frozen !== p.frozen) logActivity({ action: p.frozen ? 'locked' : 'unlocked', target: 'project', target_name: p.title, project_id: p.id })
      else Object.keys(PROJECT_KEYS).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(p[k])).forEach((k) => logActivity({ action: 'updated', target: 'project', target_name: p.title, project_id: p.id }, 'p:' + p.id, PROJECT_KEYS[k]))
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
        logActivity({ action: 'deleted', target: 'project', target_name: p.title, project_id: p.id })
        const { error } = await supabase.from('projects').delete().eq('id', p.id)
        if (error) throw error
      }, 0),
    )
    const prevE = Object.fromEntries(prev.events.map((e) => [e.id, e]))
    next.events.forEach((e) => {
      if (prevE[e.id] && JSON.stringify(prevE[e.id]) === JSON.stringify(e)) return
      logActivity({ action: prevE[e.id] ? 'updated' : 'created', target: 'event', target_name: e.title || e.type, project_id: e.projectId || null })
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
    ;[['contacts', 'contact'], ['locations', 'location'], ['drives', 'drive'], ['todos', 'task']].forEach(([key, kind]) => {
      const before = Object.fromEntries(((kind === 'task' ? prev.todos : prev.library?.[key]) || []).map((x) => [x.id, x]))
      const after = (kind === 'task' ? next.todos : next.library?.[key]) || []
      after.forEach((x) => {
        if (before[x.id] && JSON.stringify(before[x.id]) === JSON.stringify(x)) return
        myWrites.current.add(x.id)
        schedule('l:' + x.id, async () => {
          const { error } = await supabase.from('library').upsert({ id: x.id, workspace_id: ws, kind, data: x })
          if (error) throw new Error(error.code === '42P01' ? 'Run supabase/library.sql in the SQL editor to enable the company library.' : error.code === '23514' ? (kind === 'drive' ? 'Run supabase/drives.sql in the SQL editor to enable the drives archive.' : 'Run supabase/todos.sql in the SQL editor to enable general tasks.') : error.message)
          setTimeout(() => myWrites.current.delete(x.id), 4000)
        })
      })
      const ids = new Set(after.map((x) => x.id))
      Object.values(before).filter((x) => !ids.has(x.id)).forEach((x) =>
        schedule('ld:' + x.id, async () => {
          const { error } = await supabase.from('library').delete().eq('id', x.id)
          if (error) throw error
        }, 0),
      )
    })
    {
      const before = Object.fromEntries((prev.worklog || []).map((n) => [n.id, n]))
      ;(next.worklog || []).forEach((n) => {
        if (before[n.id] && JSON.stringify(before[n.id]) === JSON.stringify(n)) return
        myWrites.current.add(n.id)
        schedule('w:' + n.id, async () => {
          const { error } = await supabase.from('worklog').upsert({ id: n.id, workspace_id: ws, user_id: n.userId, data: n })
          if (error) throw new Error(error.code === '42P01' ? 'Run supabase/worklog.sql in the SQL editor to enable My work.' : error.message)
          setTimeout(() => myWrites.current.delete(n.id), 4000)
        })
      })
      const ids = new Set((next.worklog || []).map((n) => n.id))
      Object.values(before).filter((n) => !ids.has(n.id)).forEach((n) =>
        schedule('wd:' + n.id, async () => {
          const { error } = await supabase.from('worklog').delete().eq('id', n.id)
          if (error) throw error
        }, 0),
      )
    }
    {
      const before = Object.fromEntries((prev.notices || []).map((n) => [n.id, n]))
      ;(next.notices || []).forEach((n) => {
        if (before[n.id] && JSON.stringify(before[n.id]) === JSON.stringify(n)) return
        myWrites.current.add(n.id)
        schedule('n:' + n.id, async () => {
          // A recipient may only say "Got it", and that goes through ack_notice(), which can write
          // nothing but their own acknowledgement. Only the sender and administrators write the row.
          const mine = !!n.fromId && n.fromId === authUser?.id
          if (!mine && membership?.role !== 'admin') {
            const { error } = await supabase.rpc('ack_notice', { p_id: n.id })
            if (error) throw new Error(error.code === '42883' || error.code === 'PGRST202' ? 'Run supabase/notices_ack.sql in the SQL editor.' : error.message)
          } else {
            const { error } = await supabase.from('notices').upsert({ id: n.id, workspace_id: ws, from_id: n.fromId || null, recipients: n.to === 'all' ? ['all'] : n.to, data: n })
            if (error) throw new Error(error.code === '42P01' ? 'Run supabase/notices.sql in the SQL editor to enable notices.' : error.message)
          }
          setTimeout(() => myWrites.current.delete(n.id), 4000)
        }, 300)
      })
      const ids = new Set((next.notices || []).map((n) => n.id))
      Object.values(before).filter((n) => !ids.has(n.id)).forEach((n) =>
        schedule('nd:' + n.id, async () => {
          const { error } = await supabase.from('notices').delete().eq('id', n.id)
          if (error) throw error
        }, 0),
      )
    }
    {
      const before = new Set((prev.chat || []).map((m) => m.id))
      ;(next.chat || []).filter((m) => !before.has(m.id)).forEach((m) => {
        myWrites.current.add(m.id)
        schedule('m:' + m.id, async () => {
          const { error } = await supabase.from('messages').insert({ id: m.id, workspace_id: ws, user_id: authUser?.id || null, user_name: m.userName, text: m.text, source: m.source || 'app', created_at: m.createdAt })
          if (error) throw new Error(error.code === '42P01' ? 'Run supabase/chat.sql in the SQL editor to enable the team chat.' : error.message)
          setTimeout(() => myWrites.current.delete(m.id), 4000)
        }, 0)
      })
      const after = new Set((next.chat || []).map((m) => m.id))
      ;(prev.chat || []).filter((m) => !after.has(m.id)).forEach((m) =>
        schedule('md:' + m.id, async () => {
          const { error } = await supabase.from('messages').delete().eq('id', m.id)
          if (error) throw error
        }, 0),
      )
    }
    {
      const before = Object.fromEntries((prev.finance?.transactions || []).map((t) => [t.id, t]))
      const after = next.finance?.transactions || []
      after.forEach((t) => {
        if (before[t.id] && JSON.stringify(before[t.id]) === JSON.stringify(t)) return
        myWrites.current.add(t.id)
        schedule('f:' + t.id, async () => {
          const { error } = await supabase.from('finance').upsert({ id: t.id, workspace_id: ws, kind: 'tx', data: t })
          if (error) throw new Error(error.code === '42P01' ? 'Run supabase/finance.sql in the SQL editor to enable Finance.' : error.message)
          setTimeout(() => myWrites.current.delete(t.id), 4000)
        })
      })
      const ids = new Set(after.map((t) => t.id))
      Object.values(before).filter((t) => !ids.has(t.id)).forEach((t) =>
        schedule('fd:' + t.id, async () => {
          const { error } = await supabase.from('finance').delete().eq('id', t.id)
          if (error) throw error
        }, 0),
      )
      const rBefore = Object.fromEntries((prev.finance?.recurring || []).map((t) => [t.id, t]))
      const rAfter = next.finance?.recurring || []
      rAfter.forEach((r) => {
        if (rBefore[r.id] && JSON.stringify(rBefore[r.id]) === JSON.stringify(r)) return
        myWrites.current.add(r.id)
        schedule('fr:' + r.id, async () => {
          const { error } = await supabase.from('finance').upsert({ id: r.id, workspace_id: ws, kind: 'recurring', data: r })
          if (error) throw error
          setTimeout(() => myWrites.current.delete(r.id), 4000)
        })
      })
      const rIds = new Set(rAfter.map((r) => r.id))
      Object.values(rBefore).filter((r) => !rIds.has(r.id)).forEach((r) =>
        schedule('frd:' + r.id, async () => {
          const { error } = await supabase.from('finance').delete().eq('id', r.id)
          if (error) throw error
        }, 0),
      )
      if (JSON.stringify(prev.finance?.settings) !== JSON.stringify(next.finance?.settings)) {
        schedule('fs', async () => {
          const { error } = await supabase.from('finance').upsert({ id: 'settings:' + ws, workspace_id: ws, kind: 'settings', data: next.finance.settings })
          if (error) throw error
        })
      }
    }
    const prevU = Object.fromEntries(prev.users.map((u) => [u.id, u]))
    {
      const nextU = new Set(next.users.map((u) => u.id))
      prev.users.filter((u) => !nextU.has(u.id)).forEach((u) =>
        schedule('ud:' + u.id, async () => {
          logActivity({ action: 'removed', target: 'member', target_name: u.name })
          const { error } = await supabase.from('members').delete().eq('workspace_id', ws).eq('user_id', u.id)
          if (error) throw error
        }, 0),
      )
    }
    next.users.forEach((u) => {
      if (prevU[u.id] && JSON.stringify(prevU[u.id]) === JSON.stringify(u)) return
      if (!prevU[u.id]) return // new members arrive through invites, not here
      schedule('u:' + u.id, async () => {
        // Only an administrator may write a member row, because it carries role, permissions and
        // project access. So a member editing their own profile goes through set_my_profile(),
        // which touches the profile column of their own row and nothing else. Letting them update
        // the row directly would also let them make themselves an administrator.
        if (u.id === membership.user_id && membership.role !== 'admin') {
          const { error } = await supabase.rpc('set_my_profile', { p: u.profile || {} })
          if (error) throw new Error(error.code === '42883' || error.code === 'PGRST202' ? 'Run supabase/profiles.sql in the SQL editor to enable profiles.' : error.message)
          return
        }
        const { error } = await supabase.from('members').update({ name: u.name, role: u.role, permissions: u.permissions, project_access: u.projectAccess === 'all' ? 'all' : u.projectAccess, active: u.active !== false, profile: u.profile || {} }).eq('workspace_id', ws).eq('user_id', u.id)
        if (error) throw new Error(error.code === '42703' ? 'Run supabase/profiles.sql in the SQL editor to enable profiles.' : error.message)
      }, 0)
    })
    const wsChanged = JSON.stringify(prev.workspace) !== JSON.stringify(next.workspace)
    const { aiKey: pk, openaiKey: pok, ...prevSettings } = prev.settings
    const { aiKey: nk, openaiKey: nok, ...nextSettings } = next.settings
    if (nk !== pk) localStorage.setItem(AI_KEY, nk || '')
    if (nok !== pok) localStorage.setItem(OAI_KEY, nok || '')
    if (wsChanged || JSON.stringify(prevSettings) !== JSON.stringify(nextSettings)) {
      schedule('ws', async () => {
        const { error } = await supabase.from('workspaces').update({ name: next.workspace.name, subtitle: next.workspace.subtitle, settings: nextSettings }).eq('id', ws)
        if (error) throw error
      })
    }
  }

  const api = useMemo(() => {
    // Looking as someone else is a preview and nothing more. Every write is stopped here rather
    // than in each page, so nothing can be saved, posted or logged under their name by accident.
    const update = (fn) =>
      viewAs ? undefined : setState((s) => {
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
      if (viewAs) return
      const next = migrate({ ...nextState })
      if (remote) {
        // import projects and events; users and workspace stay as they are on the server
        update((s) => ({ ...s, projects: next.projects, events: next.events, library: { contacts: [...s.library.contacts.filter((c) => !next.library.contacts.some((x) => x.id === c.id)), ...next.library.contacts], locations: [...s.library.locations.filter((c) => !next.library.locations.some((x) => x.id === c.id)), ...next.library.locations] } }))
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
      viewAs,
      setViewAs,
      replies,
      auth,
      invite,
      removeInvite,
      localBackup,
      login: (id) => setSessionId(id),
      logout: () => { setViewAs(''); return remote ? auth.signOut() : setSessionId('') },
    }
  }, [state, sessionId, ready, authUser, membership, invites, syncError, viewAs, replies])

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>
}

export function useStore() {
  return useContext(StoreCtx)
}

export function useCurrentUser() {
  const { state, sessionId, viewAs } = useStore()
  const me = state.users.find((u) => u.id === sessionId && u.active !== false) || null
  if (!viewAs || viewAs === sessionId || me?.role !== 'admin') return me
  const them = state.users.find((u) => u.id === viewAs)
  if (!them) return me
  /* A preview, never a hand-over. Their role drops to member and every 'edit' becomes 'view', so the
     screen shows exactly what they see while nothing on it can be used to write. The store refuses
     writes as well, so the two together make the session read-only. */
  const permissions = Object.fromEntries(Object.entries(them.permissions || {}).map(([k, v]) => [k, v === 'edit' ? 'view' : v]))
  return { ...them, role: 'member', permissions, viewingAs: them.name || 'this member' }
}

/* ---------- permissions ---------- */
/* Access given until a date, for the freelancer who is on one job. The day after, every module
   reads as none and no project is reachable, without anyone having to remember to take it away.
   Administrators are never cut off this way, so nobody can lock the owner out of his own app. */
export function accessEnded(user) {
  const until = user?.permissions?.accessUntil
  return !!user && user.role !== 'admin' && !!until && until < toISODate(new Date())
}

export function can(user, moduleKey, level = 'view') {
  if (!user) return false
  if (user.role === 'admin') return true
  if (accessEnded(user)) return false
  const has = user.permissions?.[moduleKey] || 'none'
  if (level === 'view') return has === 'view' || has === 'edit'
  return has === 'edit'
}

export function canAccessProject(user, projectId) {
  if (!user) return false
  if (user.role === 'admin') return true
  if (accessEnded(user)) return false
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
    category: 'Visuals',
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
