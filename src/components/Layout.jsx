import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Fragment, Suspense, lazy, useEffect, useRef, useState } from 'react'
import { can, seesDatabase, useCurrentUser, useLive, useStore, viewAsReturnPath, whenMs } from '../lib/store.jsx'
import { Icon } from './icons.jsx'
import { NoticePopup } from './Notices.jsx'
import { useToast } from './ui.jsx'
import { backupDue, pcloudBackup } from '../lib/pcloud.js'
import { remote } from '../lib/supabase.js'
import { listenSwipes, swipeTabs } from '../lib/swipeTabs.js'
import { isStandalone, roarmeAppUrl, roarmeInstalled } from '../lib/roarmeApp.js'
import { applyTeamLook, localLook } from '../lib/teamLook.js'
import { useArrowPages } from '../lib/arrowTabs.js'

// Roardino's frame, kept alive between visits (Alex, 25 Oct: it flickered and was slow to open every time)
const RoardinoFrame = lazy(() => import('../pages/RoardinoPage.jsx').then((m) => ({ default: m.RoardinoFrame })))

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
  const { state, logout, viewAs, setViewAs, sessionId, update } = useStore()
  const { replies } = useLive()
  const user = useCurrentUser()
  const nav = useNavigate()
  const { pathname, search } = useLocation()

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

  /* The hub's look is the administrator's (Alex, 22 Oct): the team's theme, accent, typeface and icons go on every
     app as it opens (lib/teamLook.js). Until one is kept, the administrator's own look becomes the team's. */
  const teamLook = state.settings?.look
  const lookKey = JSON.stringify(teamLook || null)
  useEffect(() => {
    if (teamLook) { applyTeamLook(teamLook); return }
    if (user?.role === 'admin' && !viewAs && sessionId) update((st) => { st.settings = { ...st.settings, look: localLook() }; return st })
  }, [lookKey, user?.role, viewAs, sessionId]) // eslint-disable-line react-hooks/exhaustive-deps
  /* Answers left by clients on delivery pages. What came in since the last time the Share page
     was opened. */
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
    // Office, once the Organizer (Alex, 10 Oct; renamed 29 Oct): Tasks, Notes, RoarList and Documents as tabs of one
    // page, opening on Tasks (or on Notes for someone without Tasks); where Tasks was, so on a phone it is among the first five
    { to: can(user, 'tasks') ? '/tasks' : '/notes', label: 'Office', show: true, icon: 'tasks', also: ['/tasks', '/notes', '/office', '/roarlist'] },
    // the team's chat is RoarMe (Alex, 20 Oct): Hub Chat is gone, RoarMe takes its place
    { to: '/roarme', label: 'RoarMe', show: remote, icon: 'chat', also: ['/chat'] },
    // Roardino, the ordino maker, in the hub (Alex, 23 Oct): for whoever has the Ordino permission, in the side menu
    // and in a phone's bar, right after RoarMe
    // since 27 Oct a tab of Share (Alex); the side menu keeps it only for someone with the Ordino permission but not Share
    { to: '/roardino', label: 'Roardino', show: remote && can(user, 'roardino') && !can(user, 'share'), icon: 'callsheets' },
    // RoarList, the shot lists (Alex, 27 Oct), is a tab of Office since 29 Oct, after Notes
    { to: '/mywork', label: 'My Finance', show: user?.role !== 'admin', icon: 'mywork' },
    { to: '/database', label: 'Database', show: seesDatabase(user), icon: 'database' },
    // Drives is a tab of the Database now (Alex, 10 Oct)
    { to: '/share', label: 'Share', show: mayShare, icon: 'post', badge: newReplies, also: ['/roardino'] },
    // Invoices is a tab of Finance again (Alex, 10 Oct), so /invoices lights Finance
    { to: '/finance', label: 'Finance', show: user?.role === 'admin', icon: 'finance', also: ['/invoices'] },
    // Vault (Alex, 28 Oct): each person's own passwords, encrypted with a master password only they know
    { to: '/vault', label: 'Vault', show: true, icon: 'vault' },
    // My profile is now the first tab of Settings, on every platform (Alex, 10 Oct)
    { to: '/settings', label: 'Settings', show: true, icon: 'settings' },
  ].filter((i) => i.show)
  const tabItems = items.filter((i) => i.phone !== false) // the phone's bar and its swipe

  /* The RoarMe tab on a phone opens RoarMe as its own app (Alex, 20 Oct; lib/roarmeApp.js). In a browser: /roarme/
     in the same tab, where Chrome hands it to RoarMe if it is installed and otherwise RoarMe offers to install itself
     (on an iPhone, how to Add to Home Screen). In the hub's own home-screen app: the installed RoarMe if Android
     reports it, else the hub's RoarMe page as before (no app can install another from inside itself). A computer,
     and the swipe between tabs (not a real tap), keep the hub's own RoarMe page. */
  const roarmeApp = useRef(false)
  useEffect(() => {
    if (!remote || !window.matchMedia?.('(max-width: 820px)').matches) return
    roarmeInstalled().then((yes) => { roarmeApp.current = yes })
  }, [])
  const roarmeTap = (e) => {
    if (!e.isTrusted || !window.matchMedia?.('(max-width: 820px)').matches) return
    if (isStandalone()) {
      if (roarmeApp.current) { e.preventDefault(); window.open(roarmeAppUrl(), '_blank', 'noopener') }
      return
    }
    e.preventDefault()
    window.location.assign(roarmeAppUrl())
  }

  /* On a phone there is no side menu any more (Alex, 10 Oct): every page is in the bar at the foot,
     which slides sideways when they do not fit; the page you are on is brought into view. */
  const tabsRef = useRef(null)
  // the bar's real height as --tabbar-real, so what floats above it (the chat's folders) clears it
  useEffect(() => {
    const el = tabsRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const set = () => { if (el.offsetHeight) document.documentElement.style.setProperty('--tabbar-real', `${el.offsetHeight}px`) }
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // a sideways swipe on a phone: the next or previous tab of a project when one is open; else of the
  // page's own tabs (Organizer's Tasks · Notes · Office, the Database's, Finance's, Settings' chips;
  // Alex, 14 Oct), tapped as if by hand, and past its first or last one the bar's; else of this bar
  const swipeRef = useRef(null)
  // mode 'dry' only says whether there is somewhere to go (the magnetic swipe asks while the finger moves)
  swipeRef.current = (dir, mode) => {
    if (swipeTabs.project) return swipeTabs.project(dir, mode)
    const own = [...document.querySelectorAll('.content :is(nav.db-tabs, nav.settings-chips, nav.settings-tabs) > :is(a, button)')].filter((el) => el.offsetParent)
    const on = own.findIndex((el) => el.classList.contains('active') || el.classList.contains('on'))
    const next = on < 0 ? null : own[on + (dir === 'next' ? 1 : -1)]
    if (next) {
      if (mode !== 'dry') { next.click(); next.scrollIntoView?.({ inline: 'nearest', block: 'nearest' }) }
      return true
    }
    const at = tabItems.findIndex((i) => (i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(`${i.to}/`) || i.also?.some((p) => pathname.startsWith(p))))
    const to = at < 0 ? null : tabItems[at + (dir === 'next' ? 1 : -1)]
    if (to && mode !== 'dry') nav(to.to)
    return !!to
  }
  // ↑ / ↓ go up and down the side menu on a computer (Alex, 27 Oct)
  const sideNavRef = useRef(null)
  useArrowPages(sideNavRef)
  useEffect(() => listenSwipes((dir, mode) => (window.matchMedia?.('(max-width: 820px)').matches ? swipeRef.current?.(dir, mode) : false)), [])
  // on a phone a new page comes in with a short slide and its tiles one after another (Alex, 16 Oct);
  // not when a magnetic swipe already brought it in
  // Roardino opens once and then stays, hidden on the other pages, so coming back to it is instant
  // and in Share, as its Roardino tab (Alex, 27 Oct: "I go to Share to make whatever is to be sent")
  const onRoardino = pathname === '/roardino' || (pathname === '/share' && new URLSearchParams(search).get('tab') === 'roardino')
  const [keepRoardino, setKeepRoardino] = useState(false)
  useEffect(() => { if (onRoardino) setKeepRoardino(true) }, [onRoardino])
  // not for the pages that are a frame (Roardino, RoarList, RoarMe): the slide moved their fixed frame and it jumped
  const framePage = pathname === '/roardino' || pathname === '/roarlist' || pathname.startsWith('/roarme')
  useEffect(() => {
    const el = document.querySelector('.content')
    if (!el || framePage || !window.matchMedia?.('(max-width: 820px)').matches || el.dataset.magnet) return undefined
    el.classList.remove('page-in')
    void el.offsetWidth
    el.classList.add('page-in')
    const t = setTimeout(() => el.classList.remove('page-in'), 700)
    return () => clearTimeout(t)
  }, [pathname])
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
        <nav className="sidenav" ref={sideNavRef}>
          {items.map((i) => (
            <Fragment key={i.to}>
              {/* the app skins split the menu like their designs: the work above, you below */}
              {i.to === '/settings' && <span className="nav-section">Account</span>}
              <NavLink to={i.to} end={i.end} className={({ isActive }) => (isActive || i.also?.some((p) => pathname.startsWith(p)) ? 'active' : '')}>
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
        {keepRoardino && <Suspense fallback={null}><RoardinoFrame shown={onRoardino} inShare={pathname === '/share'} /></Suspense>}
      </main>
      <NoticePopup />

      <nav className="tabbar" aria-label="Main" ref={tabsRef}>
        {tabItems.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} onClick={i.to === '/roarme' ? roarmeTap : undefined} className={({ isActive }) => (isActive || i.also?.some((p) => pathname.startsWith(p)) ? 'active' : '')}>
            <span className="tab-ico-wrap">{Icon[i.icon]?.()}{i.badge > 0 && <span className="nav-badge">{i.badge}</span>}</span>
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
