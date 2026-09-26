// A backup row from Supabase (supabase/backups.sql) holds every table of the workspace, row by
// row, as the database stores them. The app's own Restore button reads the shape the app keeps
// in memory (projects with the id inside, library split by kind, and so on). This turns the one
// into the other, so a snapshot downloads as a file that Restore accepts.

const rows = (list) => (Array.isArray(list) ? list : [])
const withId = (r) => ({ ...(r.data || {}), id: r.id })

export function snapshotToState(snap) {
  const s = snap || {}
  const lib = rows(s.library)
  const fin = rows(s.finance)
  const finSettings = fin.find((r) => r.kind === 'settings')?.data || {}
  return {
    backupOf: 'themadlions-workspace',
    takenFromDatabase: true,
    workspace: { name: s.workspace?.name || '', subtitle: s.workspace?.subtitle || '' },
    settings: s.workspace?.settings || {},
    users: rows(s.members).map((m) => ({
      id: m.user_id, name: m.name || m.email, email: m.email, role: m.role,
      permissions: m.permissions || {}, projectAccess: m.project_access === '"all"' ? 'all' : m.project_access, active: m.active !== false, profile: m.profile || {},
    })),
    projects: rows(s.projects).map(withId),
    events: rows(s.events).map(withId),
    library: {
      contacts: lib.filter((r) => r.kind === 'contact').map(withId),
      locations: lib.filter((r) => r.kind === 'location').map(withId),
      drives: lib.filter((r) => r.kind === 'drive').map(withId),
    },
    todos: lib.filter((r) => r.kind === 'task').map(withId),
    finance: {
      transactions: fin.filter((r) => r.kind === 'tx').map(withId),
      recurring: fin.filter((r) => r.kind === 'recurring').map(withId),
      settings: finSettings,
    },
    worklog: rows(s.worklog).map((r) => ({ ...(r.data || {}), id: r.id, userId: r.user_id })),
    notices: rows(s.notices).map(withId),
    shares: rows(s.shares).map((r) => ({ id: r.id, ref: r.ref, kind: r.kind, token: r.token, data: r.data })),
  }
}

/* Short human line for the list: "3 projects, 41 events, 120 finance rows". */
export function snapshotSummary(snap) {
  const s = snap || {}
  const n = (k) => rows(s[k]).length
  return `${n('projects')} project${n('projects') === 1 ? '' : 's'} · ${n('events')} calendar item${n('events') === 1 ? '' : 's'} · ${n('finance')} finance row${n('finance') === 1 ? '' : 's'} · ${n('members')} member${n('members') === 1 ? '' : 's'}`
}

export const fmtBytes = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b >= 1024 ? `${Math.round(b / 1024)} KB` : `${b || 0} B`)
