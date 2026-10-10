import { NavLink, Navigate, useParams } from 'react-router-dom'
import { PageHead, useIsMobile } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { useGlide } from '../lib/glide.js'
import { can, seesDatabase, useCurrentUser, useStore } from '../lib/store.jsx'
import PeopleAll from './PeopleAll.jsx'
import LocationsAll from './LocationsAll.jsx'
import EquipmentAll from './EquipmentAll.jsx'

const TABS = [
  { key: 'locations', label: 'Locations', icon: 'locations', perm: 'locations' },
  { key: 'crew', label: 'Crew', icon: 'team', perm: 'contacts' },
  { key: 'cast', label: 'Cast', icon: 'people', perm: 'contacts' },
  // the company's own film equipment, with a rental price (Alex, 10 Oct)
  { key: 'equipment', label: 'Equipment', icon: 'gear', perm: 'gear' },
]

export default function Database() {
  const { tab } = useParams()
  const { state } = useStore()
  const user = useCurrentUser()
  const glide = useGlide()
  const mobile = useIsMobile()
  const tabs = TABS.filter((t) => can(user, t.perm))
  if (!tabs.length || !seesDatabase(user)) return <Navigate to="/" replace />
  if (!tabs.some((t) => t.key === tab)) return <Navigate to={`/database/${tabs[0].key}`} replace />
  const lib = state.library
  // on a phone the line of counts is gone and the tabs are a glass capsule like TML Chat's folders (Alex, 10 Oct)
  const sub = mobile ? undefined : `${lib.locations.length} locations · ${lib.contacts.filter((c) => c.kind === 'crew').length} crew · ${lib.contacts.filter((c) => c.kind === 'cast').length} cast · ${(lib.gear || []).length} equipment in the company database`

  return (
    <div className="db-page">
      <PageHead title="Database" sub={sub} />
      <nav className="tabs db-tabs">
        {tabs.map((t) => (
          <NavLink key={t.key} to={`/database/${t.key}`} className={({ isActive }) => (isActive ? 'active' : '')} onClick={glide.go}>
            <span className="tab-ico">{Icon[t.icon]?.()}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="tab-body glide-box" ref={glide.boxRef}>
        <div key={tab} className={glide.inClass}>
          {tab === 'locations' && <LocationsAll />}
          {tab === 'crew' && <PeopleAll kind="crew" />}
          {tab === 'cast' && <PeopleAll kind="cast" />}
          {tab === 'equipment' && <EquipmentAll />}
        </div>
      </div>
    </div>
  )
}
