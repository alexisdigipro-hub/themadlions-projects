import { useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { PageHead, useIsMobile } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { useGlide } from '../lib/glide.js'
import { can, seesDatabase, useCurrentUser } from '../lib/store.jsx'
import PeopleAll from './PeopleAll.jsx'
import LocationsAll from './LocationsAll.jsx'
import EquipmentAll from './EquipmentAll.jsx'
import Drives from './Drives.jsx'

const TABS = [
  { key: 'locations', label: 'Locations', icon: 'locations', perm: 'locations' },
  { key: 'crew', label: 'Crew', icon: 'team', perm: 'contacts' },
  { key: 'cast', label: 'Cast', icon: 'people', perm: 'contacts' },
  // the drives archive moved in here, for whoever has the Drives permission (Alex, 10 Oct)
  { key: 'drives', label: 'Drives', icon: 'drives', perm: 'drives' },
  // the company's own film equipment, with a rental price (Alex, 10 Oct)
  { key: 'equipment', label: 'Equipment', icon: 'gear', perm: 'gear' },
]

export default function Database() {
  const { tab } = useParams()
  const user = useCurrentUser()
  const glide = useGlide()
  const mobile = useIsMobile()
  // on a computer the tab's search line sits on the tabs' own line (Alex, 10 Oct): this is where it goes
  const [slot, setSlot] = useState(null)
  const tabs = TABS.filter((t) => can(user, t.perm))
  if (!tabs.length || !seesDatabase(user)) return <Navigate to="/" replace />
  if (!tabs.some((t) => t.key === tab)) return <Navigate to={`/database/${tabs[0].key}`} replace />
  // no line of counts under the title and the tabs a glass capsule like TML Chat's folders, on a phone
  // and then on a computer too (Alex, 10 Oct)

  return (
    <div className="db-page">
      <PageHead title="Database" />
      <div className="db-top">
      <nav className="tabs db-tabs">
        {tabs.map((t) => (
          <NavLink key={t.key} to={`/database/${t.key}`} className={({ isActive }) => (isActive ? 'active' : '')} onClick={glide.go}>
            <span className="tab-ico">{Icon[t.icon]?.()}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
      {!mobile && <div className="db-slot" ref={setSlot} />}
      </div>
      <div className="tab-body glide-box" ref={glide.boxRef}>
        <div key={tab} className={glide.inClass}>
          {tab === 'locations' && <LocationsAll slot={mobile ? null : slot} />}
          {tab === 'crew' && <PeopleAll kind="crew" slot={mobile ? null : slot} />}
          {tab === 'cast' && <PeopleAll kind="cast" slot={mobile ? null : slot} />}
          {tab === 'drives' && <Drives slot={mobile ? null : slot} />}
          {tab === 'equipment' && <EquipmentAll slot={mobile ? null : slot} />}
        </div>
      </div>
    </div>
  )
}
