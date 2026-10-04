import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Suspense, useEffect, useRef, useState } from 'react'
import { can, useCurrentUser, useStore, whenMs } from '../lib/store.jsx'
import { Icon } from './icons.jsx'
import { NoticePopup } from './Notices.jsx'
import { useToast } from './ui.jsx'
import { loadRead, totalUnread, unreadByRoom } from '../lib/chat.js'
import { chime, loadChatPrefs } from '../lib/chatPrefs.js'

function Logo({ name, subtitle, logo }) {
  return (
    <div className="logo">
      {logo ? <img className="logo-img" src={logo} alt="" /> : <span className="logo-mark" aria-hidden="true" />}
      <span className="logo-text">
        <strong>{name}</strong>
        <em>{subtitle}</em>
      </span>
    </div>
  )
}

export default function Layout() {
  const { state, logout, viewAs, setViewAs, replies } = useStore()
  const user = useCurrentUser()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [readMap, setReadMap] = useState(loadRead)
  useEffect(() => {
    const h = () => setReadMap(loadRead())
    window.addEventListener('tml-chat-read', h)
    return () => window.removeEventListener('tml-chat-read', h)
  }, [])
  // every room this person is in, so a group or a direct message counts as much as the team room
  const unread = totalUnread(unreadByRoom(state, user, readMap))
  // Settings > Chat > Sound: a short tone when a message from someone else arrives and its room
  // is not the one on screen (or the app is in another tab). First load is not news.
  const seenChat = useRef(null)
  useEffect(() => {
    const list = state.chat || []
    const latest = list.reduce((a, m) => (whenMs(m.createdAt) > a ? whenMs(m.createdAt) : a), 0)
    if (seenChat.current === null) { seenChat.current = latest; return }
    if (latest > seenChat.current) {
      const fresh = list.filter((m) => whenMs(m.createdAt) > seenChat.current && m.userId && m.userId !== user?.id)
      const openRoom = decodeURIComponent((window.location.hash.match(/#\/chat\/([^?]+)/) || [])[1] || (window.location.hash.startsWith('#/chat') ? 'team' : ''))
      if (fresh.some((m) => document.hidden || (m.chatId || 'team') !== openRoom) && loadChatPrefs().sound) chime()
    }
    seenChat.current = latest
  }, [state.chat])

  /* Answers left by clients on delivery pages. Same idea as the chat badge: what came in since the
     last time the Share page was opened. */
  const [shareReadAt, setShareReadAt] = useState(() => localStorage.getItem('tml_share_read') || '')
  useEffect(() => {
    const h = () => setShareReadAt(localStorage.getItem('tml_share_read') || '')
    window.addEventListener('tml-share-read', h)
    return () => window.removeEventListener('tml-share-read', h)
  }, [])
  const mayShare = can(user, 'share')
  const newReplies = mayShare ? (replies || []).filter((r) => whenMs(r.at) > whenMs(shareReadAt)).length : 0

  // A reply landing while the app is open says so at once, rather than waiting to be found.
  const toast = useToast()
  const lastReply = useRef(null)
  useEffect(() => {
    const latest = replies?.length ? whenMs(replies[replies.length - 1].at) : 0
    if (lastReply.current === null) { lastReply.current = latest; return } // first load is not news
    if (mayShare && latest > lastReply.current) {
      const r = replies[replies.length - 1]
      const what = r.status === 'approved' ? 'approved the cut' : r.status === 'changes' ? 'asked for changes' : 'answered'
      toast(`${r.name || 'A client'} ${what}`, r.status === 'approved' ? 'ok' : undefined)
    }
    lastReply.current = latest
  }, [replies, mayShare])

  const items = [
    { to: '/', label: 'Home', end: true, show: can(user, 'projects'), icon: 'home' },
    { to: '/calendar', label: 'Calendar', show: can(user, 'calendar'), icon: 'calendar' },
    { to: '/tasks', label: 'Tasks', show: can(user, 'tasks'), icon: 'tasks' },
    { to: '/chat', label: 'Chat', show: true, icon: 'chat', badge: unread },
    { to: '/mywork', label: 'My work', show: user?.role !== 'admin', icon: 'mywork' },
    { to: '/database', label: 'Database', show: can(user, 'contacts') || can(user, 'locations'), icon: 'database' },
    { to: '/drives', label: 'Drives', show: can(user, 'drives'), icon: 'drives' },
    { to: '/share', label: 'Share', show: mayShare, icon: 'post', badge: newReplies },
    { to: '/finance', label: 'Finance', show: user?.role === 'admin', icon: 'finance' },
    { to: '/team', label: 'Team', show: user?.role === 'admin', icon: 'team' },
    // second to last on purpose: Settings is always shown, so My profile always sits just above it
    { to: '/me', label: 'My profile', show: true, icon: 'team' },
    { to: '/settings', label: 'Settings', show: true, icon: 'settings' },
  ].filter((i) => i.show)

  const close = () => setOpen(false)

  return (
    <div className="shell">
      {viewAs && (
        <div className="viewas-bar" role="status">
          <span>You are looking at the app as <b>{user?.name || 'someone else'}</b>. Nothing can be changed while you do.</span>
          <button type="button" onClick={() => { setViewAs(''); nav('/team') }}>Stop</button>
        </div>
      )}
      <header className="topbar">
        <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          <span className="burger" />
        </button>
        <Logo name={state.workspace.name} subtitle={state.workspace.subtitle} logo={state.settings?.logo} />
        <div className="topbar-user">
          <span className="user-chip">
            {user?.name}
            <small>{user?.role}</small>
          </span>
        </div>
      </header>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Logo name={state.workspace.name} subtitle={state.workspace.subtitle} logo={state.settings?.logo} />
        </div>
        <nav className="sidenav">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} onClick={close} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-ico">{Icon[i.icon]?.()}</span>
              {i.label}
              {i.badge > 0 && <span className="nav-badge">{i.badge}</span>}
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
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <NoticePopup />

      <nav className="tabbar" aria-label="Main">
        {[
          { to: '/', label: 'Home', icon: 'home', end: true },
          { to: '/calendar', label: 'Calendar', icon: 'calendar' },
          { to: '/chat', label: 'Chat', icon: 'chat', badge: unread },
          // a fifth slot, the grid already has room for it: Finance for admins (their own
          // day-to-day number), My work for everyone else (their own jobs and payments)
          user?.role === 'admin'
            ? { to: '/finance', label: 'Finance', icon: 'finance' }
            : { to: '/mywork', label: 'My work', icon: 'mywork' },
        ].map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} onClick={close} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="tab-ico-wrap">{Icon[i.icon]?.()}{i.badge > 0 && <span className="nav-badge">{i.badge}</span>}</span>
            {i.label}
          </NavLink>
        ))}
        <button className={open ? 'active' : ''} onClick={() => setOpen((o) => !o)}>
          <span className="tab-ico-wrap">{Icon.more?.()}</span>
          More
        </button>
      </nav>
    </div>
  )
}
