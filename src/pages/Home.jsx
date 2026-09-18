import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, PageHead } from '../components/ui.jsx'
import { EVENT_TYPES, today, unavailableOn, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import MiniCalendar from '../components/MiniCalendar.jsx'
import { projectProgress } from '../lib/progress.js'
import { budgetTotals, money } from './project/Budget.jsx'
import { addDays, fmtDate } from '../lib/dates.js'
import { initialsOf } from './Profile.jsx'


/* Home is a list of blocks the person can reorder. The order is a personal, per-device
   preference, so it lives in localStorage next to the theme and the text size rather than in
   the workspace, where it would follow everyone around. */
const ORDER_KEY = 'tml_home_order'
const BLOCK_NAMES = { team: 'Team', projects: 'Projects', calendar: 'Calendar' }
const DEFAULT_ORDER = ['team', 'projects', 'calendar']

/* A saved order can be stale: blocks may have been added or removed since it was written, and
   the value can be anything at all if storage was tampered with. Keep what is still known, in
   the saved order, then append whatever is new so a future block never disappears. */
export function readHomeOrder(raw) {
  let saved = []
  try { saved = JSON.parse(raw || '[]') } catch { saved = [] }
  if (!Array.isArray(saved)) saved = []
  const known = saved.filter((k) => typeof k === 'string' && DEFAULT_ORDER.includes(k))
  const seen = new Set()
  const unique = known.filter((k) => (seen.has(k) ? false : seen.add(k)))
  return [...unique, ...DEFAULT_ORDER.filter((k) => !seen.has(k))]
}

/* Move one block to where another one sits, keeping everything else in place. */
export function reorder(order, from, to) {
  if (from === to) return order
  const i = order.indexOf(from), j = order.indexOf(to)
  if (i < 0 || j < 0) return order
  const next = [...order]
  next.splice(i, 1)
  next.splice(j, 0, from)
  return next
}

export default function Home() {
  const { state } = useStore()
  const user = useCurrentUser()
  const projects = visibleProjects(state, user)
  const t0 = today(), t7 = addDays(t0, 7)
  // The team strip follows whichever day is picked in the mini calendar below it.
  const [day, setDay] = useState(t0)
  const team = state.users.filter((u) => u.active !== false)
  const away = unavailableOn(state.events, day)

  const active = projects.filter((p) => !['Delivered', 'On hold'].includes(p.status))
  const rows = projects
    .map((p) => {
      const pr = projectProgress(p, state.settings)
      const days = [...p.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
      const next = days.find((d) => d.date >= t0)
      const open = (p.tasks || []).filter((t) => t.status !== 'done')
      const overdue = open.filter((t) => t.due && t.due < t0).length
      const bt = budgetTotals(p)
      return { p, pct: pr.pct, next, open: open.length, overdue, bt, cap: Number(p.budget?.cap) || 0 }
    })
    .sort((a, b) => (a.p.status === 'Delivered') - (b.p.status === 'Delivered') || (a.next?.date || '9').localeCompare(b.next?.date || '9') || b.pct - a.pct)

  const week = projects.flatMap((p) => p.shootingDays.filter((d) => d.date >= t0 && d.date <= t7).map((d) => ({ p, d })))
    .concat(state.events.filter((e) => e.date >= t0 && e.date <= t7 && e.type !== 'shoot').map((e) => ({ e, p: projects.find((x) => x.id === e.projectId) })))
    .sort((a, b) => (a.d?.date || a.e?.date).localeCompare(b.d?.date || b.e?.date))
  const typeOf = (k) => EVENT_TYPES.find((t) => t.key === k) || EVENT_TYPES[0]
  const calItems = projects.flatMap((p) => p.shootingDays.map((d) => ({ date: d.date, time: d.callTime, color: p.color, title: p.title, sub: `${p.category === 'Event' ? 'event day' : 'shoot day'} · call ${d.callTime}`, to: `/p/${p.id}/callsheets` })))
    .concat(state.events.filter((e) => e.type !== 'shoot' && (!e.projectId || projects.some((x) => x.id === e.projectId))).map((e) => {
      const p = projects.find((x) => x.id === e.projectId)
      return { date: e.date, endDate: e.endDate, time: e.start, color: p?.color || typeOf(e.type).color, title: e.title, sub: [typeOf(e.type).label, p?.title, e.start].filter(Boolean).join(' · '), to: p ? `/p/${p.id}/calendar` : '/calendar' }
    }))
  // The page head still counts overdue tasks, so that one stays.
  const overdueTasks = [...projects.flatMap((p) => (p.tasks || []).map((t) => ({ ...t, p }))), ...(state.todos || [])].filter((t) => t.status !== 'done' && t.due && t.due < t0)

  const [order, setOrder] = useState(() => readHomeOrder(localStorage.getItem(ORDER_KEY)))
  const [arranging, setArranging] = useState(false)
  const dragKey = useRef(null)
  useEffect(() => { try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)) } catch {} }, [order])
  const nudge = (key, dir) => setOrder((o) => {
    const i = o.indexOf(key), j = i + dir
    if (i < 0 || j < 0 || j >= o.length) return o
    const next = [...o]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const blocks = {
    team: team.length > 0 && {
      wide: true,
      body: (
        <>
          <div className="team-strip-head muted small">
            {day === t0 ? 'Today' : fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
            {away.size > 0 ? ` · ${away.size} not available` : ' · everyone available'}
            {' · pick a day in the calendar below'}
          </div>
          <div className="team-strip">
            {team.map((u) => {
              const off = away.has(u.id)
              return (
                <Link
                  key={u.id}
                  to={u.id === user?.id ? '/me' : `/u/${u.id}`}
                  className={`team-chip ${off ? 'off' : ''}`}
                  title={`${u.name}${u.profile?.position ? ` · ${u.profile.position}` : ''}${off ? ' · not available' : ''}`}
                >
                  <span className="team-chip-photo">
                    {/* the 320px photo, not the 96px thumb: these faces are large and would look soft on a retina screen */}
                    {(u.profile?.photo || u.profile?.thumb) ? <img src={u.profile.photo || u.profile.thumb} alt="" /> : <span className="team-chip-initials">{initialsOf(u.name)}</span>}
                    {off && <span className="team-chip-off" aria-hidden="true">✕</span>}
                  </span>
                  <span className="team-chip-name">{(u.name || '').split(' ')[0]}</span>
                </Link>
              )
            })}
          </div>
        </>
      ),
    },
    calendar: {
      body: (
        <>
          <div className="panel-head"><h2>Calendar</h2><Link className="link small" to="/calendar">Full calendar</Link></div>
          <MiniCalendar items={calItems} onSelect={setDay} />
        </>
      ),
    },
    projects: {
      body: (
        <>
          <div className="panel-head"><h2>Projects</h2><Link className="link small" to="/">All projects</Link></div>
          {!rows.length ? <p className="muted">No projects yet.</p> : (
            <div className="table-wrap home-table-wrap">
              <table className="table home-projects">
                <thead><tr><th>Project</th><th>Status</th><th>Progress</th><th>Next day</th><th className="num">Open tasks</th><th className="num">Budget</th></tr></thead>
                <tbody>
                  {rows.map(({ p, pct, next, open, overdue, bt, cap }) => (
                    <tr key={p.id} className={p.status === 'Delivered' ? 'dim' : ''}>
                      <td className="person-cell">
                        {p.coverThumb ? <img className="avatar-img sq" src={p.coverThumb} alt="" /> : <span className="dot" style={{ '--pc': p.color }} />}
                        <span><Link to={`/p/${p.id}`}><strong>{p.title}</strong></Link><div className="muted small">{p.category}{p.client ? ` · ${p.client}` : ''}</div></span>
                      </td>
                      <td className="small">{p.status}</td>
                      <td><div className="mini-progress" title={`${pct}%`}><span style={{ width: `${pct}%`, background: p.color }} /></div><span className="small muted">{pct}%</span></td>
                      <td className="small">{next ? `${fmtDate(next.date)} · ${next.callTime}` : <span className="muted">–</span>}</td>
                      <td className={`num ${overdue ? 'late' : ''}`}>{open}{overdue ? ` (${overdue} late)` : ''}</td>
                      <td className={`num small ${cap && bt.total > cap ? 'over' : ''}`}>{bt.lines ? `${money(bt.total, bt.currency)}${cap ? ` / ${money(cap, bt.currency)}` : ''}` : <span className="muted">–</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ),
    },
  }
  const visible = order.filter((k) => blocks[k])

  return (
    <div className="home">
      <PageHead title={`Hello ${(user?.name || '').split(' ')[0]}`} sub={`${active.length} active project${active.length === 1 ? '' : 's'} · ${week.length} thing${week.length === 1 ? '' : 's'} this week · ${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`}>
        {arranging && <button className="link small" onClick={() => setOrder(DEFAULT_ORDER)}>Reset order</button>}
        <Button variant={arranging ? 'primary' : 'ghost'} onClick={() => setArranging((v) => !v)}>{arranging ? 'Done' : 'Arrange'}</Button>
      </PageHead>

      {arranging && <p className="muted small home-arrange-hint">Drag a block, or use the arrows, to put it where you want it. The order is saved on this device only.</p>}

      <div className={`home-blocks ${arranging ? 'arranging' : ''}`}>
        {visible.map((key, i) => (
          <section
            key={key}
            className={`panel home-block ${blocks[key].wide ? 'wide' : ''}`}
            draggable={arranging}
            onDragStart={arranging ? () => { dragKey.current = key } : undefined}
            onDragEnd={arranging ? () => { dragKey.current = null } : undefined}
            onDragOver={arranging ? (e) => {
              e.preventDefault()
              if (dragKey.current && dragKey.current !== key) setOrder((o) => reorder(o, dragKey.current, key))
            } : undefined}
            onDrop={arranging ? (e) => e.preventDefault() : undefined}
          >
            {arranging && (
              <div className="home-block-bar">
                <span className="home-block-name">⠿ {BLOCK_NAMES[key] || key}</span>
                <span className="home-block-moves">
                  <button className="link small" onClick={() => nudge(key, -1)} disabled={i === 0} aria-label={`Move ${BLOCK_NAMES[key]} up`}>↑</button>
                  <button className="link small" onClick={() => nudge(key, 1)} disabled={i === visible.length - 1} aria-label={`Move ${BLOCK_NAMES[key]} down`}>↓</button>
                </span>
              </div>
            )}
            {blocks[key].body}
          </section>
        ))}
      </div>
    </div>
  )
}
