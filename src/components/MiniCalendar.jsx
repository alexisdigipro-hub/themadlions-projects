import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { today, useStore } from '../lib/store.jsx'
import { addDays, fmtDate, holidayName, monthGrid, monthLabel, weekdayShort } from '../lib/dates.js'


// items: { date, endDate?, color, title, sub?, to? }
export default function MiniCalendar({ items = [], onItemClick, onAddDay, addLabel = 'Add event', large = false, onSelect }) {
  const { state } = useStore()
  const t0 = today()
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [sel, setSel] = useState(t0)
  // Parents can follow the picked day (Home greys out whoever is away on it).
  const pick = (iso) => { setSel(iso); onSelect?.(iso) }

  const byDate = useMemo(() => {
    const m = {}
    for (const it of items) {
      if (it.endDate && it.endDate > it.date) {
        let d = it.date, guard = 0
        while (d <= it.endDate && guard < 60) { (m[d] = m[d] || []).push(it); d = addDays(d, 1); guard += 1 }
      } else (m[it.date] = m[it.date] || []).push(it)
    }
    for (const k in m) m[k].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    return m
  }, [items])

  const grid = monthGrid(ym.y, ym.m, state.settings?.weekStart)
  const holiday = (iso) => holidayName(iso, state.settings?.greekHolidays !== false)
  const shift = (n) => { const d = new Date(ym.y, ym.m + n, 1); setYm({ y: d.getFullYear(), m: d.getMonth() }) }
  const goToday = () => { setYm({ y: now.getFullYear(), m: now.getMonth() }); pick(t0) }
  const dayItems = byDate[sel] || []
  const selIsToday = sel === t0
  // The large calendar (the Calendar page on a phone) also lists what comes next after the day
  // picked, so a glance shows the coming weeks without tapping day after day.
  const upcoming = useMemo(() => {
    if (!large) return []
    const until = addDays(sel, 45)
    const days = Object.keys(byDate).filter((d) => d > sel && d <= until).sort().slice(0, 8)
    return days.map((d) => [d, byDate[d].filter((it) => it.date === d || d === days[0])]).filter(([, its]) => its.length)
  }, [byDate, sel, large])
  const row = (it, i) => (
    <li key={i} className="mc-ev" style={{ '--ev': it.color }}>
      <button type="button" className="mc-ev-btn" onClick={() => (onItemClick && it.ev ? onItemClick(it.ev) : null)} disabled={!(onItemClick && it.ev)}>
        <span className="mc-ev-time">{it.time || (it.endDate && it.endDate > it.date ? 'Days' : 'All day')}</span>
        <span className="mc-ev-main">
          <span className="mc-ev-title">{it.title}</span>
          {it.sub && <span className="mc-ev-sub">{it.sub}</span>}
        </span>
      </button>
    </li>
  )

  return (
    <div className={`mini-cal ${large ? 'large' : ''}`}>
      <div className="mini-cal-nav">
        <button className="link" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <button className="mini-cal-month" onClick={goToday} title="Back to today">{monthLabel(ym.y, ym.m)}</button>
        <button className="link" onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>
      <div className="mini-cal-grid">
        {weekdayShort(state.settings?.weekStart).map((d) => <span key={d} className="mini-cal-dow">{d[0]}</span>)}
        {grid.map((d) => {
          const its = byDate[d.iso] || []
          return (
            <button
              key={d.iso}
              className={`mini-cal-cell ${d.inMonth ? '' : 'dim'} ${d.iso === t0 ? 'today' : ''} ${d.iso === sel ? 'sel' : ''} ${d.weekend ? 'weekend' : ''} ${holiday(d.iso) ? 'holiday' : ''}`}
              onClick={() => pick(d.iso)}
              title={holiday(d.iso) || undefined}
              aria-label={`${fmtDate(d.iso, { weekday: 'long', day: 'numeric', month: 'long' })}${holiday(d.iso) ? `, ${holiday(d.iso)}` : ''}`}
            >
              <span className="mini-cal-day">{Number(d.iso.slice(8))}</span>
              {its.length > 0 && (
                <span className="mini-cal-dots">
                  {its.slice(0, 3).map((it, i) => <i key={i} style={{ background: it.color }} />)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mini-cal-list">
        <div className="mini-cal-sel">
          <span>{selIsToday ? (large ? `Today · ${fmtDate(sel, { weekday: 'short', day: 'numeric', month: 'short' })}` : 'Today') : fmtDate(sel, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          {onAddDay && <button className="link small" onClick={() => onAddDay(sel)}>{addLabel}</button>}
        </div>
        {large ? (
          <>
            {!dayItems.length ? <p className="muted small mc-none">Nothing on this day.</p> : <ul className="plain mc-evs">{dayItems.map(row)}</ul>}
            {upcoming.length > 0 && (
              <div className="mc-upcoming">
                <div className="mc-upcoming-head">Coming up</div>
                {upcoming.map(([d, its]) => (
                  <div key={d} className="mc-upcoming-day">
                    <button type="button" className="mc-upcoming-date" onClick={() => { const x = new Date(d + 'T00:00'); setYm({ y: x.getFullYear(), m: x.getMonth() }); pick(d) }}>
                      {d === addDays(t0, 1) ? 'Tomorrow' : fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </button>
                    <ul className="plain mc-evs">{its.map(row)}</ul>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : !dayItems.length ? <p className="muted small">Nothing on this day.</p> : (
          <ul className="plain">
            {dayItems.map((it, i) => (
              <li key={i}>
                <span className="dot" style={{ '--pc': it.color }} />
                {onItemClick && it.ev ? <button className="link mini-cal-item" onClick={() => onItemClick(it.ev)}>{it.title}</button> : it.to ? <Link to={it.to}>{it.title}</Link> : <span>{it.title}</span>}
                {it.sub && <span className="muted small">{it.sub}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
