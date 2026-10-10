import { useState } from 'react'
import { NavLink, Navigate, useLocation } from 'react-router-dom'
import { PageHead, useIsMobile } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { can, useCurrentUser } from '../lib/store.jsx'
import Office from './Office.jsx'
import Notes from './Notes.jsx'
import TasksAll from './TasksAll.jsx'

/* The Organizer (Alex, 10 Oct): Tasks, Notes and Office on one page, with tabs like the Database's, a
   glass capsule TASKS · NOTES · OFFICE, opening on Tasks; on a computer each tab's search (and Office's
   filters) sits on the tabs' own row. Tasks needs the Tasks permission, Office needs Files, Notes (each
   person's own) is for everyone. The addresses stay /tasks, /notes and /office, so old links still land
   on the right tab; a document itself opens full screen at /office/<project>/<doc> as before. */
export default function OfficeHub() {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  const mobile = useIsMobile()
  const [slot, setSlot] = useState(null)
  // Tasks first, then Notes, then Office (Alex, 10 Oct)
  const tabs = [
    can(user, 'tasks') && { to: '/tasks', key: 'tasks', label: 'Tasks', icon: 'tasks' },
    { to: '/notes', key: 'notes', label: 'Notes', icon: 'notes' },
    can(user, 'files') && { to: '/office', key: 'office', label: 'Office', icon: 'office' },
  ].filter(Boolean)
  const tab = pathname.startsWith('/tasks') ? 'tasks' : pathname.startsWith('/notes') ? 'notes' : 'office'
  if (!tabs.some((t) => t.key === tab)) return <Navigate to={tabs[0].to} replace />

  return (
    <div className="hub-page office-hub">
      <PageHead title="Organizer" />
      <div className="db-top">
        <nav className="tabs db-tabs">
          {tabs.map((t) => (
            <NavLink key={t.key} to={t.to} end className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="tab-ico">{Icon[t.icon]?.()}</span>
              {t.label}
            </NavLink>
          ))}
        </nav>
        {!mobile && <div className="db-slot" ref={setSlot} />}
      </div>
      {tab === 'tasks' ? <TasksAll slot={mobile ? null : slot} /> : tab === 'office' ? <Office embedded slot={mobile ? null : slot} /> : <Notes slot={mobile ? null : slot} />}
    </div>
  )
}
