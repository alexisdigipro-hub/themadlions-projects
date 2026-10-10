import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Fragment, Suspense, useEffect, useRef, useState } from 'react'
import { can, seesDatabase, useCurrentUser, useStore, viewAsReturnPath, whenMs } from '../lib/store.jsx'
import { Icon } from './icons.jsx'
import { NoticePopup } from './Notices.jsx'
import { useToast } from './ui.jsx'
import { loadRead, totalUnread, unreadByRoom } from '../lib/chat.js'
import { chimeFor } from '../lib/chatPrefs.js'
import { backupDue, pcloudBackup } from '../lib/pcloud.js'
import { remote } from '../lib/supabase.js'

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


/* The skins' bar across the top (chat and you) is gone (Alex, 9 Oct): both are in the sidebar. */

export default function Layout() {
  const { state, logout, viewAs, setViewAs, replies, sessionId, update } = useStore()
  const user = useCurrentUser()
  const nav = useNavigate()
  const { pathname } = useLocation()

  /* When each person was last in the app, so Alex can see it in Settings > Team. Supabase keeps
     the real sign-in time in auth.users, which a browser cannot read, so everyone stamps their
     own member row instead: it goes through the same profile column a member is already allowed
     to write, so there is no new table and no SQL to run. Once per half hour at most, never
     while viewing as someone else, and never from a stale render. */
  const stamped = useRef(false)
  /* Settings > Data > Backup to pCloud > Every week: an administrator opening the app takes it when
     the last one is a week old, quietly, once per visit; a failure waits for the next visit. */
  const backedUp = useRef(false)
  const latest = useRef(state)
  latest.current = state
  useEffect(() => {
    if (backedUp.current || !remote || viewAs || user?.role !== 'admin' || !state.users.length || !backupDue(state.settings)) return
    backedUp.current = true
    // after the app has settled, so the backup holds everything loaded
    setTimeout(() => {
      if (!backupDue(latest.current.settings)) return
      pcloudBackup(latest.current)
        .then(() => update((s) => { s.settings = { ...s.settings, pcloudBackupAt: new Date().toISOString() }; return s }))
        .catch(() => {})
    }, 20000)
  }, [user?.role, viewAs, state.settings?.pcloudAutoBackup, state.users.length]) // eslint-disable-line react-hooks/exhaustive-deps
  // The phone's header height as --topbar-h, so a bar that sticks under it (a project's tabs)
  // sits flush whatever the logo and text size make it. 0 on a computer, where it is hidden.
  const topbarRef = useRef(null)
  useEffect(() => {
    const el = topbarRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (stamped.current || viewAs || !sessionId) return
    const me = state.users.find((u) => u.id === sessionId)
    if (!me) return
    stamped.current = true
    const last = me.profile?.lastSeen
    if (last && Date.now() - whenMs(last) < 30 * 60 * 1000) return
    update((s) => {
      const u = s.users.find((x) => x.id === sessionId)
      if (u) u.profile = { ...(u.profile || {}), lastSeen: new Date().toISOString() }
      return s
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, viewAs, state.users.length])
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
      chimeFor(fresh, openRoom)
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
    // each person's own notes, like Apple Notes; nobody else reads them (Alex, 8 Oct)
    { to: '/notes', label: 'Notes', show: true, icon: 'notes' },
    { to: '/mywork', label: 'My Finance', show: user?.role !== 'admin', icon: 'mywork' },
    { to: '/database', label: 'Database', show: seesDatabase(user), icon: 'database' },
    { to: '/drives', label: 'Drives', show: can(user, 'drives'), icon: 'drives' },
    // Word and Excel inside the app, each file kept with its project (Alex, 8 Oct)
    { to: '/office', label: 'Office', show: can(user, 'files'), icon: 'office' },
    { to: '/share', label: 'Share', show: mayShare, icon: 'post', badge: newReplies },
    { to: '/finance', label: 'Finance', show: user?.role === 'admin', icon: 'finance' },
    // Invoices came out of Finance's tab row into its own page (Alex). Team went the other way,
    // into Settings > Team, so it is no longer here.
    { to: '/invoices', label: 'Invoices', show: user?.role === 'admin', icon: 'finance' },
    // My profile is now the first tab of Settings, on every platform (Alex, 10 Oct)
    { to: '/settings', label: 'Settings', show: true, icon: 'settings' },
  ].filter((i) => i.show)

  /* On a phone there is no side menu any more (Alex, 10 Oct): every page is in the bar at the foot,
     which slides sideways when they do not fit; the page you are on is brought into view. */
  const tabsRef = useRef(null)
  useEffect(() => {
    const bar = tabsRef.current
    const on = bar?.querySelector('a.active')
    if (!bar || !on || bar.scrollWidth <= bar.clientWidth) return
    bar.scrollTo({ left: on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' })
  }, [pathname])

  return (
    <div className="shell">
      {viewAs && (
        <div className="viewas-bar" role="status">
          <span>You are looking at the app as <b>{user?.name || 'someone else'}</b>. Nothing can be changed while you do.</span>
          <button type="button" onClick={() => { setViewAs(''); nav(viewAsReturnPath()) }}>Stop</button>
        </div>
      )}
      {/* a phone's top bar: the name in the middle, MAD heavier, as in TML Chat (Alex, 10 Oct) */}
      <header className="topbar" ref={topbarRef}>
        <span className="tg-brand topbar-brand">THE<b>MAD</b>LIONS</span>
      </header>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <Logo name={state.workspace.name} subtitle={state.workspace.subtitle} logo={state.settings?.logo} />
        </div>
        <nav className="sidenav">
          {items.map((i) => (
            <Fragment key={i.to}>
              {/* the app skins split the menu like their designs: the work above, you below */}
              {i.to === '/settings' && <span className="nav-section">Account</span>}
              <NavLink to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-ico">{Icon[i.icon]?.()}</span>
                {i.label}
                {i.badge > 0 && <span className="nav-badge">{i.badge}</span>}
              </NavLink>
            </Fragment>
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

      <main className="content">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <NoticePopup />

      <nav className="tabbar" aria-label="Main" ref={tabsRef}>
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="tab-ico-wrap">{Icon[i.icon]?.()}{i.badge > 0 && <span className="nav-badge">{i.badge}</span>}</span>
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
