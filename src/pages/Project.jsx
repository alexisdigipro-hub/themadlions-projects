import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Badge, useIsMobile } from '../components/ui.jsx'
import { can, canAccessProject, useCurrentUser, useStore } from '../lib/store.jsx'
import { hydrateProject } from '../lib/library.js'
import { projectTabs, tabHidden } from '../lib/tabs.js'
import { Icon } from '../components/icons.jsx'
import { useGlide } from '../lib/glide.js'
import { swipeTabs } from '../lib/swipeTabs.js'

// The brainstorm whiteboard is built and working but Alex does not need it yet, so the tab is
// hidden. The page itself still lives at /p/<id>/whiteboard. Flip this to true to bring it back.
const SHOW_WHITEBOARD = false

export function useProject() {
  return useOutletContext()
}

/* A project's tabs on a phone: one row of chips that slides sideways, like Settings' and Home's
   (Alex, 16 Oct; before that a bar naming the tab you are on that opened a grid). It stays put under
   the header while the page scrolls, and the chosen chip is brought into view. */
function MobileTabs({ tabs, onPick }) {
  const rowRef = useRef(null)
  const { pathname } = useLocation()
  useEffect(() => {
    const row = rowRef.current
    const on = row?.querySelector('.chip.on')
    if (!row || !on || row.scrollWidth <= row.clientWidth) return
    row.scrollTo({ left: on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' })
  }, [pathname])
  return (
    <div className="ptabs-m">
      <nav ref={rowRef} className="chips ptabs-chips">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `chip${isActive ? ' on active' : ''}`} onClick={onPick}>
            {t.label}
          </NavLink>
        ))}
      </nav>
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
  const nav = useNavigate()
  const [slot, setSlot] = useState(null)
  useEffect(() => () => { swipeTabs.project = null }, [])
  const raw = state.projects.find((p) => p.id === id)
  const project = raw ? hydrateProject(raw, state.library) : null

  if (!project || !canAccessProject(user, id)) return <Navigate to="/" replace />

  // The full list lives in src/lib/tabs.js. Two filters: what this person may see, then what
  // this project chose to show (Edit details > Tabs). A hidden tab's page still answers its URL,
  // so an old link keeps working; it just has no tab.
  // Someone without Budget still gets its tab as "Add Receipt" (only that, see Budget.jsx). With no
  // edit permission at all the receipt goes through add_receipt_line() (supabase/receipt_line.sql).
  const tabs = [
    ...projectTabs(project),
    ...(SHOW_WHITEBOARD ? [{ to: 'whiteboard', label: 'Whiteboard', key: 'files', icon: 'notes' }] : []),
  ]
    .map((t) => (t.to === 'budget' && !can(user, 'budget') ? { ...t, label: 'Add Receipt', key: 'projects' } : t))
    .filter((t) => (Array.isArray(t.key) ? t.key.some((k) => can(user, k, t.level)) : can(user, t.key, t.level)) && !tabHidden(project, t.to))
  // what Overview shows as its own sections (tabs.js onOverview): not in the bar
  const sections = tabs.filter((t) => t.onOverview).map((t) => t.to)
  const barTabs = tabs.filter((t) => !t.onOverview)

  // a sideways swipe on a phone moves to the next or previous of these tabs, the page sliding over
  // as when one is tapped (lib/swipeTabs.js)
  const base = `/p/${project.id}`
  const seg = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, '').split('/')[0] : ''
  swipeTabs.project = mobile ? (dir, mode) => {
    const at = barTabs.findIndex((t) => (seg ? t.to === seg : t.end))
    const to = at < 0 ? null : barTabs[at + (dir === 'next' ? 1 : -1)]
    if (!to || mode === 'dry') return !!to
    // the magnetic swipe moves the page itself; a swipe without it gets the tab's own slide
    if (mode !== 'magnet') glide.slideTo(dir)
    nav(to.end || !to.to ? base : `${base}/${to.to}`)
    return true
  } : null

  const ctx = {
    project,
    user,
    edit: (fn) => updateProject(project.id, fn),
    canEdit: (key) => can(user, key, 'edit') && (!project.frozen || user?.role === 'admin'),
    library: state.library,
    editLibrary: (fn) => update((s) => { fn(s.library); return s }),
    // on a computer the tab's own buttons sit at the end of the project's one top row (DbBar, as Database's tabs)
    slot: mobile ? null : slot,
    sections,
  }

  return (
    <div className="project" style={{ '--pc': project.color }}>
      {/* one top row on a computer (Alex, 27 Oct, the Calendar's and RoarList's way): back, the project's name,
          its tabs as the glass capsule, then the open tab's own buttons; a phone keeps its head and tab bar */}
      {!mobile && (
        <div className="db-top proj-top">
          <Link to="/" className="icon-btn proj-back" aria-label="Projects" title="Projects">‹</Link>
          {project.coverThumb && <img className="proj-top-cover" src={project.coverThumb} alt="" />}
          <h1 className="page-title proj-name">{project.title}</h1>
          <Badge>{project.category}</Badge>
          {project.status === 'Delivered' && <Badge>Delivered</Badge>}
          <nav className="tabs db-tabs">
            {barTabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')} onClick={glide.go}>
                <span className="tab-ico">{Icon[t.icon]?.()}</span>
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="db-slot" ref={setSlot} />
        </div>
      )}
      {mobile && <div className="project-head">
        <Link to="/" className="crumb">
          Projects
        </Link>
        <div className="project-title">
          {project.coverThumb && <img className="project-head-cover" src={project.coverThumb} alt="" />}
          <h1>{project.title}</h1>
          <div className="project-meta">
            <Badge>{project.category}</Badge>
            {project.status === 'Delivered' && <Badge>Delivered</Badge>}
          </div>
        </div>
      </div>}
      {mobile && <MobileTabs tabs={barTabs} onPick={glide.go} />}
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
