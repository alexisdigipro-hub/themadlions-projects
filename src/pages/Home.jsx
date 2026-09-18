import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '../components/ui.jsx'
import { CATEGORIES, EVENT_TYPES, STATUSES, today, unavailableOn, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import MiniCalendar from '../components/MiniCalendar.jsx'
import { projectProgress } from '../lib/progress.js'
import { budgetTotals, money } from './project/Budget.jsx'
import { summarize } from '../lib/finance.js'
import { fmtDate } from '../lib/dates.js'
import { initialsOf } from './Profile.jsx'

const addDaysISO = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

export default function Home() {
  const { state } = useStore()
  const user = useCurrentUser()
  const projects = visibleProjects(state, user)
  const isAdmin = user?.role === 'admin'
  const t0 = today(), t7 = addDaysISO(7)
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
  const overdueTasks = [...projects.flatMap((p) => (p.tasks || []).map((t) => ({ ...t, p }))), ...(state.todos || [])].filter((t) => t.status !== 'done' && t.due && t.due < t0)
  const mine = (t) => !t.assignee || t.assignee.trim().toLowerCase() === (user?.name || '').trim().toLowerCase()
  const dueSoon = [...projects.flatMap((p) => (p.tasks || []).map((t) => ({ ...t, p }))), ...(state.todos || [])].filter((t) => t.status !== 'done' && t.due && t.due >= t0 && t.due <= t7 && mine(t))
  const byStatus = STATUSES.map((st) => [st, projects.filter((p) => p.status === st).length]).filter(([, n]) => n)
  const byCat = CATEGORIES.map((c) => [c, projects.filter((p) => p.category === c).length]).filter(([, n]) => n)
  const overCap = rows.filter((r) => r.cap && r.bt.total > r.cap)
  const fin = isAdmin ? summarize(state.finance?.transactions || [], { year: new Date().getFullYear(), projects: state.projects }) : null
  const cur = state.finance?.settings?.currency || 'EUR'
  const totalBudget = active.reduce((a, p) => a + budgetTotals(p).total, 0)

  return (
    <div className="home">
      <PageHead title={`Hello ${(user?.name || '').split(' ')[0]}`} sub={`${active.length} active project${active.length === 1 ? '' : 's'} · ${week.length} thing${week.length === 1 ? '' : 's'} this week · ${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`} />

      {team.length > 0 && (
        <section className="panel team-strip-panel">
          <div className="panel-head">
            <h2>The team</h2>
            <span className="muted small">
              {day === t0 ? 'Today' : fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
              {away.size > 0 ? ` · ${away.size} not available` : ' · everyone available'}
              {' · pick a day in the calendar below'}
            </span>
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
                    {u.profile?.thumb ? <img src={u.profile.thumb} alt="" /> : <span className="team-chip-initials">{initialsOf(u.name)}</span>}
                    {off && <span className="team-chip-off" aria-hidden="true">✕</span>}
                  </span>
                  <span className="team-chip-name">{(u.name || '').split(' ')[0]}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <div className="home-grid">
        <section className="panel">
          <div className="panel-head"><h2>Calendar</h2><Link className="link small" to="/calendar">Full calendar</Link></div>
          <MiniCalendar items={calItems} onSelect={setDay} />
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Needs attention</h2><Link className="link small" to="/tasks">Tasks</Link></div>
          <ul className="plain home-alerts">
            {overdueTasks.slice(0, 6).map((t) => <li key={t.id} className="late">Overdue: {t.title}{t.p ? ` · ${t.p.title}` : ''}</li>)}
            {overCap.map((r) => <li key={r.p.id} className="late">Budget over cap: {r.p.title} ({money(r.bt.total - r.cap, r.p.budget?.currency || 'EUR')} over)</li>)}
            {dueSoon.slice(0, 5).map((t) => <li key={t.id}>Due {fmtDate(t.due)}: {t.title}</li>)}
            {isAdmin && fin && fin.owedCount > 0 && <li>{fin.owedCount} unpaid invoice{fin.owedCount === 1 ? '' : 's'} · {money(fin.owedToUs, cur)} owed to us</li>}
            {!overdueTasks.length && !overCap.length && !dueSoon.length && !(isAdmin && fin?.owedCount) && <li className="muted">All clear.</li>}
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Projects</h2><Link className="link small" to="/">All projects</Link></div>
        {!rows.length ? <p className="muted">No projects yet.</p> : (
          <div className="table-wrap">
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
      </section>

      <div className="home-grid">
        <section className="panel">
          <h2>By status</h2>
          <ul className="plain bars">{byStatus.map(([k, n]) => <li key={k}><span>{k}</span><span className="bar"><span style={{ width: `${(n / projects.length) * 100}%` }} /></span><span className="num">{n}</span></li>)}</ul>
        </section>
        <section className="panel">
          <h2>By type</h2>
          <ul className="plain bars">{byCat.map(([k, n]) => <li key={k}><span>{k}</span><span className="bar"><span style={{ width: `${(n / projects.length) * 100}%` }} /></span><span className="num">{n}</span></li>)}</ul>
          <p className="muted small">Active budgets total {money(totalBudget, cur)}.</p>
        </section>
        {isAdmin && fin && (
          <section className="panel">
            <div className="panel-head"><h2>Finance {new Date().getFullYear()}</h2><Link className="link small" to="/finance">Finance</Link></div>
            <dl className="details">
              <dt>Profit</dt><dd className={fin.profit < 0 ? 'over' : 'under'}>{money(fin.profit, cur)}</dd>
              <dt>Owed to us</dt><dd>{money(fin.owedToUs, cur)}</dd>
              <dt>We owe</dt><dd>{money(fin.weOwe, cur)}</dd>
              <dt>This month</dt><dd>{money(fin.monthIn - fin.monthOut, cur)}</dd>
            </dl>
          </section>
        )}
      </div>
    </div>
  )
}
