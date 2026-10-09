import { NavLink, Navigate, useParams } from 'react-router-dom'
import { PageHead } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { useGlide } from '../lib/glide.js'
import { can, seesDatabase, useCurrentUser, useStore } from '../lib/store.jsx'
import PeopleAll from './PeopleAll.jsx'
import LocationsAll from './LocationsAll.jsx'

const TABS = [
  { key: 'locations', label: 'Locations', icon: 'locations', perm: 'locations' },
  { key: 'crew', label: 'Crew', icon: 'team', perm: 'contacts' },
  { key: 'cast', label: 'Cast', icon: 'people', perm: 'contacts' },
]

export default function Database() {
  const { tab } = useParams()
  const { state } = useStore()
  const user = useCurrentUser()
  const glide = useGlide()
  const tabs = TABS.filter((t) => can(user, t.perm))
  if (!tabs.length || !seesDatabase(user)) return <Navigate to="/" replace />
  if (!tabs.some((t) => t.key === tab)) return <Navigate to={`/database/${tabs[0].key}`} replace />
  const lib = state.library
  const sub = `${lib.locations.length} locations · ${lib.contacts.filter((c) => c.kind === 'crew').length} crew · ${lib.contacts.filter((c) => c.kind === 'cast').length} cast in the company database`

  return (
    <div>
      <PageHead title="Database" sub={sub} />
      <nav className="tabs">
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
        </div>
      </div>
    </div>
  )
}
