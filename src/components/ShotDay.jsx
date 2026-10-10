import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty } from './ui.jsx'
import { toISODate } from '../lib/dates.js'
import { dayPlan, newBreak, shotMinutes, timeline, toHHMM, toMin } from '../lib/shotLayout.js'
import { Grip, moveItem, useDragSort } from './DragSort.jsx'

const plain = (it) => (it.shotId ? { id: it.id, shotId: it.shotId } : { id: it.id, label: it.label, min: it.min })
const nowHHMM = () => toHHMM(new Date().getHours() * 60 + new Date().getMinutes())

/* The shoot day shot by shot, the way Shot Lister runs a day: the shots of the day's scenes in
   the order you will shoot them, with breaks, each with setup and shoot minutes, so every shot
   gets a planned time from the first call. On the day, Done stamps the real time and the head
   says how many minutes ahead or behind you are. */
export default function ShotDay({ project, shots, layout, edit, editable, dayId, setDayId, onOpenShot }) {
  const days = [...(project.shootingDays || [])].sort((a, b) => a.date.localeCompare(b.date))
  // drag a shot or a break by its ⋮⋮ to change the order of the day (Alex, 10 Oct: no more arrows);
  // the hook comes before the early return below, and what a drop does is filled in once the plan is known
  const dropRef = useRef(null)
  const sort = useDragSort((from, to) => dropRef.current?.(from, to))
  if (!days.length) {
    return <Empty title="No shoot days yet">Add a shoot day in <Link to="../schedule">Schedule</Link> and put scenes on it. Their shots show up here in shooting order.</Empty>
  }
  const day = days.find((d) => d.id === dayId) || days[0]
  const plan = dayPlan(day, shots, project.scenes)
  const start = day.callSheet?.shootingCall || day.callTime
  const { rows, end, drift } = timeline(plan, start, layout)
  const shotRows = rows.filter((r) => r.shot)
  const done = shotRows.filter((r) => r.shot.status === 'shot').length
  const wrapMin = toMin(day.wrapTime)
  let over = wrapMin == null ? null : end - wrapMin
  if (over != null && over < -720) over += 1440 // a wrap after midnight
  const isToday = day.date === toISODate(new Date())
  const nowMin = toMin(nowHHMM())
  const due = isToday ? rows.find((r) => r.shot && r.start <= nowMin && nowMin < r.end) : null

  const savePlan = (list) => edit((p) => {
    const d = p.shootingDays.find((x) => x.id === day.id)
    if (d) d.shotPlan = list.map(plain)
  })
  dropRef.current = (from, to) => savePlan(moveItem(plan, from, to))
  const setShot = (id, patch) => edit((p) => {
    const s = (p.shots || []).find((x) => x.id === id)
    if (s) Object.assign(s, patch)
  })
  const setBreak = (id, patch) => savePlan(plan.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  return (
    <div className="shot-day">
      <div className="toolbar no-print">
        <div className="segmented">
          {days.map((d, i) => <button key={d.id} className={d.id === day.id ? 'on' : ''} onClick={() => setDayId(d.id)}>Day {i + 1}</button>)}
        </div>
        {editable && (
          <div className="toolbar-actions">
            <Button size="sm" onClick={() => savePlan([...plan, newBreak('Lunch', 60)])}>Add lunch</Button>
            <Button size="sm" onClick={() => savePlan([...plan, newBreak('Company move', 30)])}>Add company move</Button>
            <Button size="sm" onClick={() => savePlan([...plan, newBreak('Break', 15)])}>Add break</Button>
          </div>
        )}
      </div>

      <div className="sd-head">
        <div><span className="sd-label">Day {days.indexOf(day) + 1} · {new Date(day.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span><strong>{start || '–'} → {toHHMM(end)}</strong></div>
        <div><span className="sd-label">Shots done</span><strong>{done} / {shotRows.length}</strong></div>
        {over != null && <div><span className="sd-label">Against the wrap {day.wrapTime}</span><strong className={over > 0 ? 'sd-bad' : 'sd-good'}>{over > 0 ? `${over} min over` : over < 0 ? `${-over} min to spare` : 'On the wrap'}</strong></div>}
        {drift != null && <div className="sd-live"><span className="sd-label">Live</span><strong className={drift > 0 ? 'sd-bad' : 'sd-good'}>{drift > 0 ? `${drift} min behind` : drift < 0 ? `${-drift} min ahead` : 'On time'}</strong></div>}
        {due && <div><span className="sd-label">By the plan, now</span><strong>{due.shot.number}</strong></div>}
      </div>

      {!rows.length ? (
        <Empty title="No shots on this day">Put scenes on this day in <Link to="../schedule">Schedule</Link>, and give those scenes shots in the List view.</Empty>
      ) : (
        <>
        {/* on a phone: one card per shot, Done big enough to hit on set */}
        <ul className="sd-cards mob-only">
          {rows.map((r, i) => r.shot ? (
            <li key={r.id} {...sort.row('m', i)} className={`sd-card${r.shot.status === 'shot' ? ' sd-done' : ''}${due?.id === r.id ? ' sd-now' : ''} ${sort.cls('m', i)}`}>
              <div className="sd-card-time">{toHHMM(r.start)}<span className="muted">{r.len}′</span></div>
              <div className="grow">
                <div><button className="link" onClick={() => onOpenShot(r.shot)} disabled={!editable}><strong>{r.shot.number}</strong></button> <span className="muted small">Sc. {r.scene?.number} · {[r.shot.size, r.shot.movement].filter(Boolean).join(' · ')}</span></div>
                <div className="small">{r.shot.subject && <strong>{r.shot.subject}. </strong>}{r.shot.description}</div>
                {editable && (
                  <div className="row-actions sd-card-tools"><Grip {...sort.grip('m', i)} /></div>
                )}
              </div>
              {r.shot.status === 'shot'
                ? <button className="sd-check on" disabled={!editable} onClick={() => setShot(r.shot.id, { status: 'planned', doneAt: '' })} title="Undo">✓ {r.shot.doneAt || ''}</button>
                : editable && <button className="sd-check" onClick={() => setShot(r.shot.id, { status: 'shot', doneAt: nowHHMM() })}>Done</button>}
            </li>
          ) : (
            <li key={r.id} {...sort.row('m', i)} className={`sd-card sd-break ${sort.cls('m', i)}`}>
              <div className="sd-card-time">{toHHMM(r.start)}<span className="muted">{r.len}′</span></div>
              <strong className="grow">{r.label}</strong>
              {editable && (
                <div className="row-actions">
                  <Grip {...sort.grip('m', i)} />
                  <button onClick={() => savePlan(plan.filter((x) => x.id !== r.id))} aria-label="Remove">×</button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="table-wrap desk-only">
          <table className="table sd-table">
            <thead><tr><th>Time</th><th>Shot</th><th>What</th><th>Setup</th><th>Shoot</th><th>Done</th>{editable && <th className="no-print" />}</tr></thead>
            <tbody>
              {rows.map((r, i) => r.shot ? (
                <tr key={r.id} {...sort.row('d', i)} className={`${r.shot.status === 'shot' ? 'sd-done' : ''}${r.shot.status === 'skipped' ? ' dim' : ''}${due?.id === r.id ? ' sd-now' : ''} ${sort.cls('d', i)}`}>
                  <td className="nowrap sd-time">{toHHMM(r.start)}<span className="muted">–{toHHMM(r.end)}</span></td>
                  <td className="nowrap"><button className="link" onClick={() => onOpenShot(r.shot)} disabled={!editable}><strong>{r.shot.number}</strong></button><div className="muted small">Sc. {r.scene?.number}</div></td>
                  <td>
                    <span className="muted small">{[r.shot.size, r.shot.movement, r.shot.lens && `${r.shot.lens}${/^\d+$/.test(r.shot.lens) ? 'mm' : ''}`].filter(Boolean).join(' · ')}</span>
                    <div>{r.shot.subject && <strong>{r.shot.subject}. </strong>}{r.shot.description}</div>
                  </td>
                  <td className="nowrap">{editable ? <input className="cs-time sd-min" value={r.shot.setupMin ?? ''} placeholder={String(layout.timing.setup)} inputMode="numeric" onChange={(e) => setShot(r.shot.id, { setupMin: e.target.value.replace(/[^\d]/g, '') })} aria-label={`Setup minutes for ${r.shot.number}`} /> : (r.shot.setupMin || layout.timing.setup)}′</td>
                  <td className="nowrap">{editable ? <input className="cs-time sd-min" value={r.shot.shootMin ?? ''} placeholder={String(layout.timing.shoot)} inputMode="numeric" onChange={(e) => setShot(r.shot.id, { shootMin: e.target.value.replace(/[^\d]/g, '') })} aria-label={`Shoot minutes for ${r.shot.number}`} /> : (r.shot.shootMin || layout.timing.shoot)}′</td>
                  <td className="nowrap">
                    {r.shot.status === 'shot'
                      ? <button className="sd-check on" disabled={!editable} onClick={() => setShot(r.shot.id, { status: 'planned', doneAt: '' })} title="Undo">✓ {r.shot.doneAt || ''}</button>
                      : editable ? <button className="sd-check" onClick={() => setShot(r.shot.id, { status: 'shot', doneAt: nowHHMM() })}>Done</button> : <span className="muted">–</span>}
                  </td>
                  {editable && (
                    <td className="row-actions no-print nowrap"><Grip {...sort.grip('d', i)} /></td>
                  )}
                </tr>
              ) : (
                <tr key={r.id} {...sort.row('d', i)} className={`sd-break ${sort.cls('d', i)}`}>
                  <td className="nowrap sd-time">{toHHMM(r.start)}<span className="muted">–{toHHMM(r.end)}</span></td>
                  <td colSpan={2}>{editable ? <input className="input sm sd-break-name" value={r.label} onChange={(e) => setBreak(r.id, { label: e.target.value })} aria-label="Break name" /> : <strong>{r.label}</strong>}</td>
                  <td colSpan={2} className="nowrap">{editable ? <input className="cs-time sd-min" value={r.min} inputMode="numeric" onChange={(e) => setBreak(r.id, { min: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} aria-label="Break minutes" /> : r.min}′</td>
                  <td />
                  {editable && (
                    <td className="row-actions no-print nowrap">
                      <Grip {...sort.grip('d', i)} />
                      <button onClick={() => savePlan(plan.filter((x) => x.id !== r.id))} aria-label="Remove">×</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
      <p className="fineprint no-print">
        Times start from the shooting call on the day&#39;s call sheet ({start || 'not set'}). Each shot takes its setup plus shoot minutes; empty means the defaults in Customise ({layout.timing.setup}′ + {layout.timing.shoot}′, total {shotMinutes({}, layout)}′). Press Done as each shot is in the can; the time is stamped and the head shows how far ahead or behind you are.
      </p>
    </div>
  )
}
