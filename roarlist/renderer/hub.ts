// RoarList inside the hub (Alex, 27 Oct 2026): the hub's own Supabase client, so the page is signed in as the hub
// member with nothing handed over (it runs on the hub's address, in the side menu's frame). Who may do what is the
// Shot list permission (members.permissions.shots): edit makes and changes lists, view only reads them; an
// administrator always edits. The lists belong to the team (table roarlist_lists, supabase/roarlist.sql), each one
// tied to a hub project.
// @ts-ignore: the hub's client is plain JavaScript
import { supabase } from '../../src/lib/supabase.js'

export const sb = supabase as any

export type HubProject = { id: string; name: string; client: string; director: string; dop: string; date: string; status: string }
export type Level = 'none' | 'view' | 'edit'

export const hub = { uid: '', level: 'none' as Level, projects: [] as HubProject[] }
const Q = new URLSearchParams(location.search)
export const scope = Q.get('project') || '' // one project's lists (the project's link to RoarList)
export const embedded = Q.get('embed') === 'hub'

const str = (x: unknown) => (typeof x === 'string' ? x : '')
// a person in a project's team with a role like "Director" or "DOP"
function roleName(p: any, re: RegExp) {
  const hit = (Array.isArray(p.contacts) ? p.contacts : []).find((x: any) => re.test(str(x?.role)))
  return str(hit?.name)
}

export async function loadHub(): Promise<boolean> {
  if (!sb) return false
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return false
  hub.uid = session.user.id
  const { data: m } = await sb.from('members').select('role,permissions').eq('user_id', hub.uid).eq('active', true).maybeSingle()
  hub.level = !m ? 'none' : m.role === 'admin' ? 'edit' : ((m.permissions || {}).shots || 'none')
  const { data: ps } = await sb.from('projects').select('id,data')
  hub.projects = (ps || []).map((r: any) => ({ d: r.data || {}, id: r.id })).filter((x: any) => !x.d.deleted).map(({ d, id }: any) => ({
    id, name: str(d.title) || 'Untitled project', client: str(d.client), status: str(d.status),
    director: str(d.director) || roleName(d, /^director$|σκηνοθ/i), dop: roleName(d, /\bdop\b|director of photography|cinematograph|διευθ.*φωτογρ/i),
    date: /^\d{4}-\d{2}-\d{2}$/.test(str(d.startDate)) ? d.startDate : '',
  })).sort((a: HubProject, b: HubProject) => a.name.localeCompare(b.name))
  return true
}

export const projectName = (id: string) => hub.projects.find((p) => p.id === id)?.name || ''
export const canEdit = () => hub.level === 'edit'

// the hub follows the frame's look: the frame says when it has drawn, so the hub fades it in (as Roardino)
export function ready() { try { if (embedded) parent.postMessage({ type: 'roarlist:ready' }, location.origin) } catch { /* not framed */ } }
// a list opened from the hub (the project's link): the hub's own page for that project
export const hubUrl = (path: string) => `${location.origin}${location.pathname.replace(/roarlist\/?(index\.html)?$/, '')}#${path}`
