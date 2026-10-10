import { useState } from 'react'
import { NavLink, Navigate, useLocation } from 'react-router-dom'
import { PageHead, useIsMobile } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { can, useCurrentUser } from '../lib/store.jsx'
import Office from './Office.jsx'
import Notes from './Notes.jsx'

/* Office and Notes on one page (Alex, 10 Oct), with its tabs like the Database's: a glass capsule,
   OFFICE · NOTES, and on a computer the Office tab's filter line on the tabs' own row. Office (Word and
   Excel files per project) is for whoever has Files; Notes, each person's own, for everyone. The
   addresses stay /office and /notes, so old links still land on the right tab; a document itself
   opens full screen at /office/<project>/<doc> as before. */
export default function OfficeHub() {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  const mobile = useIsMobile()
  const [slot, setSlot] = useState(null)
  const tabs = [
    can(user, 'files') && { to: '/office', key: 'office', label: 'Office', icon: 'office' },
    { to: '/notes', key: 'notes', label: 'Notes', icon: 'notes' },
  ].filter(Boolean)
  const tab = pathname.startsWith('/notes') ? 'notes' : 'office'
  if (!tabs.some((t) => t.key === tab)) return <Navigate to="/notes" replace />

  return (
    <div className="hub-page office-hub">
      <PageHead title="Office" />
      <div className="db-top">
        <nav className="tabs db-tabs">
          {tabs.map((t) => (
            <NavLink key={t.key} to={t.to} end className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="tab-ico">{Icon[t.icon]?.()}</span>
              {t.label}
            </NavLink>
          ))}
        </nav>
        {!mobile && tab === 'office' && <div className="db-slot" ref={setSlot} />}
      </div>
      {tab === 'office' ? <Office embedded slot={mobile ? null : slot} /> : <Notes />}
    </div>
  )
}
