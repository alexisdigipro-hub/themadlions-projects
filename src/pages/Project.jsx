import { Link, NavLink, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { Badge } from '../components/ui.jsx'
import { can, canAccessProject, useCurrentUser, useStore } from '../lib/store.jsx'

export function useProject() {
  return useOutletContext()
}

export default function Project() {
  const { id } = useParams()
  const { state, updateProject } = useStore()
  const user = useCurrentUser()
  const project = state.projects.find((p) => p.id === id)

  if (!project || !canAccessProject(user, id)) return <Navigate to="/" replace />

  const tabs = [
    { to: '', label: 'Overview', end: true, key: 'projects' },
    { to: 'script', label: 'Script', key: 'script' },
    { to: 'breakdown', label: 'Breakdown', key: 'breakdown' },
    { to: 'shots', label: 'Shot list', key: 'shots' },
    { to: 'schedule', label: 'Schedule', key: 'schedule' },
    { to: 'callsheets', label: 'Call sheets', key: 'callsheets' },
    { to: 'tasks', label: 'Tasks', key: 'tasks' },
    { to: 'calendar', label: 'Calendar', key: 'calendar' },
    { to: 'locations', label: 'Locations', key: 'locations' },
    { to: 'people', label: 'Cast & crew', key: 'contacts' },
    { to: 'notes', label: 'Files & notes', key: 'files' },
  ].filter((t) => can(user, t.key))

  const ctx = {
    project,
    user,
    edit: (fn) => updateProject(project.id, fn),
    canEdit: (key) => can(user, key, 'edit'),
  }

  return (
    <div className="project" style={{ '--pc': project.color }}>
      <div className="project-head">
        <Link to="/" className="crumb">
          Projects
        </Link>
        <div className="project-title">
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
