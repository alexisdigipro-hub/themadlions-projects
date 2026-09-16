import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { can, useCurrentUser, useStore } from '../lib/store.jsx'

function Logo({ name, subtitle }) {
  return (
    <div className="logo">
      <span className="logo-mark" aria-hidden="true" />
      <span className="logo-text">
        <strong>{name}</strong>
        <em>{subtitle}</em>
      </span>
    </div>
  )
}

export default function Layout() {
  const { state, logout } = useStore()
  const user = useCurrentUser()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)

  const items = [
    { to: '/', label: 'Projects', end: true, show: can(user, 'projects') },
    { to: '/calendar', label: 'Calendar', show: can(user, 'calendar') },
    { to: '/team', label: 'Team', show: user?.role === 'admin' },
    { to: '/settings', label: 'Settings', show: true },
  ].filter((i) => i.show)

  const close = () => setOpen(false)

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          <span className="burger" />
        </button>
        <Logo name={state.workspace.name} subtitle={state.workspace.subtitle} />
        <div className="topbar-user">
          <span className="user-chip">
            {user?.name}
            <small>{user?.role}</small>
          </span>
        </div>
      </header>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Logo name={state.workspace.name} subtitle={state.workspace.subtitle} />
        </div>
        <nav className="sidenav">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} onClick={close} className={({ isActive }) => (isActive ? 'active' : '')}>
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            {user?.name}
            <small>
              {user?.email} · {user?.role}
            </small>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              logout()
              nav('/login')
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={close} />}

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
