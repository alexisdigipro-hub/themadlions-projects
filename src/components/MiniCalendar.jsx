import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { today } from '../lib/store.jsx'
import { fmtDate, monthGrid, monthLabel, weekdayShort } from '../lib/dates.js'

const addDay = (iso, n) => { const d = new Date(iso + 'T00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

// items: { date, endDate?, color, title, sub?, to? }
export default function MiniCalendar({ items = [] }) {
  const t0 = today()
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [sel, setSel] = useState(t0)

  const byDate = useMemo(() => {
    const m = {}
    for (const it of items) {
      if (it.endDate && it.endDate > it.date) {
        let d = it.date, guard = 0
        while (d <= it.endDate && guard < 60) { (m[d] = m[d] || []).push(it); d = addDay(d, 1); guard += 1 }
      } else (m[it.date] = m[it.date] || []).push(it)
    }
    for (const k in m) m[k].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    return m
  }, [items])

  const grid = monthGrid(ym.y, ym.m)
  const shift = (n) => { const d = new Date(ym.y, ym.m + n, 1); setYm({ y: d.getFullYear(), m: d.getMonth() }) }
  const goToday = () => { setYm({ y: now.getFullYear(), m: now.getMonth() }); setSel(t0) }
  const dayItems = byDate[sel] || []
  const selIsToday = sel === t0

  return (
    <div className="mini-cal">
      <div className="mini-cal-nav">
        <button className="link" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <button className="mini-cal-month" onClick={goToday} title="Back to today">{monthLabel(ym.y, ym.m)}</button>
        <button className="link" onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>
      <div className="mini-cal-grid">
        {weekdayShort().map((d) => <span key={d} className="mini-cal-dow">{d[0]}</span>)}
        {grid.map((d) => {
          const its = byDate[d.iso] || []
          return (
            <button
              key={d.iso}
              className={`mini-cal-cell ${d.inMonth ? '' : 'dim'} ${d.iso === t0 ? 'today' : ''} ${d.iso === sel ? 'sel' : ''} ${d.dow >= 5 ? 'weekend' : ''}`}
              onClick={() => setSel(d.iso)}
              aria-label={fmtDate(d.iso, { weekday: 'long', day: 'numeric', month: 'long' })}
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
        <div className="mini-cal-sel">{selIsToday ? 'Today' : fmtDate(sel, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        {!dayItems.length ? <p className="muted small">Nothing on this day.</p> : (
          <ul className="plain">
            {dayItems.map((it, i) => (
              <li key={i}>
                <span className="dot" style={{ '--pc': it.color }} />
                {it.to ? <Link to={it.to}>{it.title}</Link> : <span>{it.title}</span>}
                {it.sub && <span className="muted small">{it.sub}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
