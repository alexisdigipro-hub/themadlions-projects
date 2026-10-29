import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { can, canSeeEvent, eventTypesOf, today, useCurrentUser, useStore } from '../lib/store.jsx'
import { addDays, fmtDate } from '../lib/dates.js'
import { setSoftMode, softMode } from '../lib/skin.js'

const SUN = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></svg>
const MOON = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
const AUTO = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" /></svg>

/* The Island of the Soft aurora looks (Alex, 29 Oct: "the Dynamic Island pattern"): a black pill at the top centre of
   the screen with the next thing in the calendar and the time; a hover or a tap grows it into a card with the next
   few, Calendar and Office a tap away. Drawn always, shown only by the Soft aurora skins (styles.css, .island). */
export default function Island() {
  const { state } = useStore()
  const user = useCurrentUser()
  const { pathname } = useLocation()
  const [now, setNow] = useState(() => new Date())
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(softMode)
  const dark = document.documentElement.dataset.skin === 'soft'
  const pick = (m) => { setSoftMode(m); setMode(m) }
  const box = useRef(null)
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(t) }, [])
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const off = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    window.addEventListener('pointerdown', off)
    return () => window.removeEventListener('pointerdown', off)
  }, [open])

  const day = today()
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const types = useMemo(() => Object.fromEntries(eventTypesOf(state.settings).map((t) => [t.key, t])), [state.settings])
  // what is next: today's still to come (or all day), then the days after, two weeks ahead at most
  const next = useMemo(() => {
    if (!can(user, 'calendar')) return []
    const last = addDays(day, 14)
    return (state.events || [])
      .filter((e) => e.date && (e.endDate || e.date) >= day && e.date <= last && e.type !== 'unavailable' && canSeeEvent(state.settings, user, e))
      .filter((e) => !(e.date === day && e.start && (e.end || e.start) < hm && !e.endDate))
      .sort((a, b) => (a.date < day ? day : a.date).localeCompare(b.date < day ? day : b.date) || String(a.start || '').localeCompare(String(b.start || '')))
      .slice(0, 4)
  }, [state.events, state.settings, user, day, hm])
  const when = (e) => {
    const d = e.date < day ? day : e.date
    const label = d === day ? 'Today' : d === addDays(day, 1) ? 'Tomorrow' : fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })
    return e.start ? `${label} ${e.start}` : label
  }
  const first = next[0]
  const hour = now.getHours()
  const hello = `${hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`

  return (
    <div className={`island${open ? ' open' : ''}`} ref={box} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="island-pill" onClick={() => setOpen(true)} onMouseEnter={() => window.matchMedia?.('(hover: hover)').matches && setOpen(true)}
        aria-expanded={open} aria-label={first ? `Next: ${first.title}, ${when(first)}` : hello}>
        <i className="island-dot" aria-hidden="true" />
        <span className="island-txt">{first ? <>{first.title || types[first.type]?.label || 'Event'}<small>{when(first)}</small></> : hello}</span>
        <span className="island-time">{hm}</span>
      </button>
      <div className="island-card" role="dialog" aria-label="What is next" aria-hidden={!open}>
        <div className="island-head"><b>{hm}</b><span>{fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
        {/* dark mode, this person's own (Alex, 29 Oct) */}
        <div className="island-mode" role="group" aria-label="Dark mode">
          {[['light', 'Light', SUN], ['dark', 'Dark', MOON], ['auto', 'Auto', AUTO]].map(([m, l, ico]) => (
            <button key={m} type="button" className={(mode || (dark ? 'dark' : 'light')) === m ? 'on' : ''} onClick={() => pick(m)} tabIndex={open ? 0 : -1} aria-pressed={(mode || (dark ? 'dark' : 'light')) === m}>{ico}<span>{l}</span></button>
          ))}
        </div>
        <div className="island-list">
          {next.length ? next.map((e) => (
            <Link key={e.id} to="/calendar" className="island-row" style={{ '--c': types[e.type]?.color }} tabIndex={open ? 0 : -1}>
              <i aria-hidden="true" /><span>{e.title || types[e.type]?.label || 'Event'}</span><small>{when(e)}</small>
            </Link>
          )) : <p className="island-empty">{can(user, 'calendar') ? 'Nothing in the calendar for the next two weeks.' : hello}</p>}
        </div>
        <div className="island-foot">
          {can(user, 'calendar') && <Link to="/calendar" tabIndex={open ? 0 : -1}>Calendar</Link>}
          <Link to={can(user, 'tasks') ? '/tasks' : '/notes'} tabIndex={open ? 0 : -1}>Office</Link>
          {can(user, 'projects') && <Link to="/" tabIndex={open ? 0 : -1}>Projects</Link>}
        </div>
      </div>
    </div>
  )
}
