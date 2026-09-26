import { Link, NavLink, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { Badge } from '../components/ui.jsx'
import { can, canAccessProject, useCurrentUser, useStore } from '../lib/store.jsx'
import { hydrateProject } from '../lib/library.js'
import { projectTabs, tabHidden } from '../lib/tabs.js'
import { Icon } from '../components/icons.jsx'

// The brainstorm whiteboard is built and working but Alex does not need it yet, so the tab is
// hidden. The page itself still lives at /p/<id>/whiteboard. Flip this to true to bring it back.
const SHOW_WHITEBOARD = false

export function useProject() {
  return useOutletContext()
}

export default function Project() {
  const { id } = useParams()
  const { state, updateProject, update } = useStore()
  const user = useCurrentUser()
  const raw = state.projects.find((p) => p.id === id)
  const project = raw ? hydrateProject(raw, state.library) : null

  if (!project || !canAccessProject(user, id)) return <Navigate to="/" replace />

  // The full list lives in src/lib/tabs.js. Two filters: what this person may see, then what
  // this project chose to show (Edit details > Tabs). A hidden tab's page still answers its URL,
  // so an old link keeps working; it just has no tab.
  const tabs = [
    ...projectTabs(project),
    ...(SHOW_WHITEBOARD ? [{ to: 'whiteboard', label: 'Whiteboard', key: 'files', icon: 'notes' }] : []),
  ].filter((t) => can(user, t.key) && !tabHidden(project, t.to))

  const ctx = {
    project,
    user,
    edit: (fn) => updateProject(project.id, fn),
    canEdit: (key) => can(user, key, 'edit') && (!project.frozen || user?.role === 'admin'),
    library: state.library,
    editLibrary: (fn) => update((s) => { fn(s.library); return s }),
  }

  return (
    <div className="project" style={{ '--pc': project.color }}>
      <div className="project-head">
        <Link to="/" className="crumb">
          Projects
        </Link>
        <div className="project-title">
          {project.coverThumb && <img className="project-head-cover" src={project.coverThumb} alt="" />}
          <h1>{project.title}</h1>
          <div className="project-meta">
            <Badge>{project.category}</Badge>
            <Badge>{project.status}</Badge>
            {project.code && <span className="project-code">{project.code}</span>}
            {project.director && <span className="muted">Dir. {project.director}</span>}
          </div>
        </div>
      </div>
      <nav className="tabs">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="tab-ico">{Icon[t.icon]?.()}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="tab-body">
        <Outlet context={ctx} />
      </div>
    </div>
  )
}
