import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { Badge, useIsMobile } from '../components/ui.jsx'
import { can, canAccessProject, useCurrentUser, useStore } from '../lib/store.jsx'
import { hydrateProject } from '../lib/library.js'
import { projectTabs, tabHidden } from '../lib/tabs.js'
import { Icon } from '../components/icons.jsx'
import { useGlide } from '../lib/glide.js'

// The brainstorm whiteboard is built and working but Alex does not need it yet, so the tab is
// hidden. The page itself still lives at /p/<id>/whiteboard. Flip this to true to bring it back.
const SHOW_WHITEBOARD = false

export function useProject() {
  return useOutletContext()
}

/* A project's tabs on a phone (Alex, 8 Oct): one bar that stays put under the header while the
   page scrolls, naming the tab you are on; tap it and every tab opens as a grid, tap one and the
   grid closes. Replaces the row that slid sideways and cut the last tab in half. */
function MobileTabs({ tabs, base }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const seg = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, '').split('/')[0] : ''
  const current = tabs.find((t) => t.to === seg) || (seg ? null : tabs.find((t) => t.end))
  useEffect(() => { setOpen(false) }, [pathname])
  return (
    <div className={`ptabs-m${open ? ' open' : ''}`}>
      <button type="button" className="ptabs-m-current" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {current && <span className="tab-ico">{Icon[current.icon]?.()}</span>}
        <span className="grow">{current?.label || 'Pages'}</span>
        <span className="ptabs-m-count muted">{tabs.length} tabs</span>
        <span className="ptabs-m-chev" aria-hidden="true">▾</span>
      </button>
      {open && (
        <>
          <button type="button" className="ptabs-m-scrim" aria-label="Close" onClick={() => setOpen(false)} />
          <nav className="ptabs-m-grid">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')} onClick={() => setOpen(false)}>
                <span className="tab-ico">{Icon[t.icon]?.()}</span>
                {t.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </div>
  )
}

export default function Project() {
  const { id } = useParams()
  const { state, updateProject, update } = useStore()
  const user = useCurrentUser()
  const mobile = useIsMobile()
  const { pathname } = useLocation()
  const glide = useGlide()
  const raw = state.projects.find((p) => p.id === id)
  const project = raw ? hydrateProject(raw, state.library) : null

  if (!project || !canAccessProject(user, id)) return <Navigate to="/" replace />

  // The full list lives in src/lib/tabs.js. Two filters: what this person may see, then what
  // this project chose to show (Edit details > Tabs). A hidden tab's page still answers its URL,
  // so an old link keeps working; it just has no tab.
  const tabs = [
    ...projectTabs(project),
    ...(SHOW_WHITEBOARD ? [{ to: 'whiteboard', label: 'Whiteboard', key: 'files', icon: 'notes' }] : []),
  ].filter((t) => (Array.isArray(t.key) ? t.key.some((k) => can(user, k)) : can(user, t.key)) && !tabHidden(project, t.to))

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
          </div>
        </div>
      </div>
      {mobile ? <MobileTabs tabs={tabs} base={`/p/${project.id}`} /> : (
        <nav className="tabs">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')} onClick={glide.go}>
              <span className="tab-ico">{Icon[t.icon]?.()}</span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
      {/* the page slides over when another tab is picked (lib/glide.js) */}
      <div className="tab-body glide-box" ref={glide.boxRef}>
        <div key={pathname.split('/')[3] || ''} className={glide.inClass}>
          <Suspense fallback={null}>
            <Outlet context={ctx} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
