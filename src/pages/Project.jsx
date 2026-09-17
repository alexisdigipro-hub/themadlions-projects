import { Link, NavLink, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { Badge } from '../components/ui.jsx'
import { can, canAccessProject, useCurrentUser, useStore } from '../lib/store.jsx'
import { hydrateProject } from '../lib/library.js'
import { Icon } from '../components/icons.jsx'

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

  const tabs = [
    { to: '', label: 'Overview', end: true, key: 'projects', icon: 'overview' },
    ...(project.category === 'Music Video' ? [{ to: 'music', label: 'Music', key: 'music', icon: 'music' }] : []),
    { to: 'script', label: 'Script', key: 'script', icon: 'script' },
    { to: 'breakdown', label: 'Breakdown', key: 'breakdown', icon: 'breakdown' },
    { to: 'shots', label: 'Shot list', key: 'shots', icon: 'shots' },
    { to: 'schedule', label: 'Schedule', key: 'schedule', icon: 'schedule' },
    { to: 'callsheets', label: 'Call sheets', key: 'callsheets', icon: 'callsheets' },
    { to: 'tasks', label: 'Tasks', key: 'tasks', icon: 'tasks' },
    { to: 'reports', label: 'Reports', key: 'reports', icon: 'reports' },
    { to: 'budget', label: 'Budget', key: 'budget', icon: 'budget' },
    { to: 'gear', label: 'Equipment', key: 'gear', icon: 'gear' },
    { to: 'post', label: 'Post', key: 'post', icon: 'post' },
    { to: 'calendar', label: 'Calendar', key: 'calendar', icon: 'calendar' },
    { to: 'locations', label: 'Locations', key: 'locations', icon: 'locations' },
    { to: 'people', label: 'Cast & crew', key: 'contacts', icon: 'people' },
    { to: 'notes', label: 'Files & notes', key: 'files', icon: 'notes' },
  ].filter((t) => can(user, t.key))

  const ctx = {
    project,
    user,
    edit: (fn) => updateProject(project.id, fn),
    canEdit: (key) => can(user, key, 'edit'),
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
