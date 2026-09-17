import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, Field, Input, Textarea } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { formatPages } from '../../lib/breakdown.js'
import { fmtLong } from '../../lib/dates.js'

const SCENE_STATES = [['', 'Not shot'], ['completed', 'Completed'], ['partial', 'Partial'], ['pickup', 'Pickup needed']]

export function reportSummary(project) {
  const days = [...project.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
  const sceneById = Object.fromEntries(project.scenes.map((s) => [s.id, s]))
  const done = new Set()
  let pagesShot = 0
  let daysReported = 0
  days.forEach((d) => {
    const r = d.report
    if (!r || !r.wrap) return
    daysReported += 1
    Object.entries(r.sceneStatus || {}).forEach(([id, st]) => {
      const s = sceneById[id]
      if (!s) return
      if (st === 'completed') { done.add(id); pagesShot += s.eighths || 0 }
      if (st === 'partial') pagesShot += Math.round((s.eighths || 0) / 2)
    })
  })
  const totalEighths = project.scenes.reduce((a, s) => a + (s.eighths || 0), 0)
  const plannedByNow = days.slice(0, daysReported).reduce((a, d) => a + d.sceneIds.length, 0)
  return { daysReported, daysTotal: days.length, scenesDone: done.size, scenesTotal: project.scenes.length, pagesShot, totalEighths, behind: plannedByNow - done.size }
}

function minutesBetween(a, b) {
  if (!a || !b) return null
  const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number)
  return h2 * 60 + m2 - (h1 * 60 + m1)
}
const hours = (mins) => (mins == null ? '' : `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`)

export default function Reports() {
  const { project, edit, canEdit } = useProject()
  const days = [...project.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
  const [sel, setSel] = useState(days[0]?.id || '')
  const day = days.find((d) => d.id === sel) || days[0]
  const editable = canEdit('reports')

  if (!days.length) {
    return (
      <Empty title="No shoot days yet">
        Production reports are filled in at wrap, one per shoot day. Build the <Link to="../schedule">schedule</Link> first.
      </Empty>
    )
  }

  const sceneById = Object.fromEntries(project.scenes.map((s) => [s.id, s]))
  const r = day.report || {}
  const set = (k, v) => edit((p) => {
    const d = p.shootingDays.find((x) => x.id === day.id)
    if (!d) return
    d.report = { ...(d.report || {}), [k]: v }
  })
  const setScene = (id, st) => edit((p) => {
    const d = p.shootingDays.find((x) => x.id === day.id)
    if (!d) return
    d.report = { ...(d.report || {}), sceneStatus: { ...((d.report || {}).sceneStatus || {}), [id]: st } }
    const s = p.scenes.find((x) => x.id === id)
    if (s) s.shot = st === 'completed'
  })
  const addExtraScene = (id) => id && edit((p) => {
    const d = p.shootingDays.find((x) => x.id === day.id)
    if (!d) return
    d.report = { ...(d.report || {}), extraScenes: [...new Set([...((d.report || {}).extraScenes || []), id])] }
  })

  const scenes = [...day.sceneIds, ...(r.extraScenes || [])].map((id) => sceneById[id]).filter(Boolean)
  const status = r.sceneStatus || {}
  const dayPages = scenes.reduce((a, s) => a + (status[s.id] === 'completed' ? s.eighths || 0 : status[s.id] === 'partial' ? Math.round((s.eighths || 0) / 2) : 0), 0)
  const plannedPages = scenes.reduce((a, s) => a + (s.eighths || 0), 0)
  const sum = reportSummary(project)
  const dayLen = minutesBetween(r.crewCall || day.callTime, r.wrap)
  const otherScenes = project.scenes.filter((s) => !scenes.some((x) => x.id === s.id))

  const time = (label, key, fallback) => (
    <Field label={label}>
      {editable ? <Input type="time" value={r[key] ?? fallback ?? ''} onChange={(e) => set(key, e.target.value)} /> : <div>{r[key] || fallback || '–'}</div>}
    </Field>
  )

  return (
    <div className="reports">
      <div className="toolbar no-print">
        <div className="toolbar-info">
          <strong>{sum.daysReported} of {sum.daysTotal} days reported</strong>
          <span className="muted">
            {sum.scenesDone}/{sum.scenesTotal} scenes · {formatPages(sum.pagesShot)} of {formatPages(sum.totalEighths)} pages shot
            {sum.daysReported > 0 && (sum.behind > 0 ? ` · ${sum.behind} scene${sum.behind === 1 ? '' : 's'} behind` : sum.behind < 0 ? ` · ${-sum.behind} ahead` : ' · on schedule')}
          </span>
        </div>
        <div className="toolbar-actions">
          <div className="segmented">
            {days.map((d, i) => (
              <button key={d.id} className={d.id === day.id ? 'on' : ''} onClick={() => setSel(d.id)}>
                Day {i + 1}{d.report?.wrap ? ' ✓' : ''}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      </div>

      <article className="sheet report">
        <header className="sheet-head">
          <div>
            <div className="sheet-brand">{project.producer || 'THEMADLIONS'}</div>
            <h1>{project.title}</h1>
            <div className="muted">Daily production report · Day {days.indexOf(day) + 1} of {days.length} · {fmtLong(day.date)} · {day.unit}</div>
          </div>
          <div className="sheet-call">
            <div className="sheet-call-label">Pages today</div>
            <div className="sheet-call-time">{formatPages(dayPages)}</div>
            <div className="muted">of {formatPages(plannedPages)} planned{dayLen != null ? ` · ${hours(dayLen)} day` : ''}</div>
          </div>
        </header>

        <section>
          <h3>Times</h3>
          <div className="report-times">
            {time('Crew call', 'crewCall', day.callTime)}
            {time('First shot', 'firstShot')}
            {time('Lunch out', 'lunchOut')}
            {time('Lunch in', 'lunchIn')}
            {time('Camera wrap', 'cameraWrap')}
            {time('Wrap', 'wrap')}
          </div>
          {r.firstShot && (
            <div className="muted small">Call to first shot: {hours(minutesBetween(r.crewCall || day.callTime, r.firstShot))}{r.wrap ? ` · wrap ${minutesBetween(day.wrapTime, r.wrap) > 0 ? `${minutesBetween(day.wrapTime, r.wrap)} min late` : 'on time'}` : ''}</div>
          )}
        </section>

        <section>
          <h3>Scenes</h3>
          <table className="table">
            <thead>
              <tr><th>Sc.</th><th>Set</th><th>D/N</th><th>Pgs</th><th>Status</th><th>Setups</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {scenes.map((s) => (
                <tr key={s.id} className={status[s.id] === 'completed' ? '' : status[s.id] ? '' : 'dim'}>
                  <td>{s.number}</td>
                  <td>{s.intExt} {s.location}</td>
                  <td>{s.timeOfDay}</td>
                  <td>{formatPages(s.eighths)}</td>
                  <td>
                    {editable ? (
                      <select className="input select tiny" value={status[s.id] || ''} onChange={(e) => setScene(s.id, e.target.value)}>
                        {SCENE_STATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    ) : SCENE_STATES.find(([v]) => v === (status[s.id] || ''))?.[1]}
                  </td>
                  <td>{editable ? <input className="input tiny-num" type="number" min="0" value={r.setups?.[s.id] ?? ''} onChange={(e) => set('setups', { ...(r.setups || {}), [s.id]: e.target.value })} /> : r.setups?.[s.id] || ''}</td>
                  <td>{editable ? <input className="input" value={r.sceneNotes?.[s.id] ?? ''} onChange={(e) => set('sceneNotes', { ...(r.sceneNotes || {}), [s.id]: e.target.value })} placeholder="Circled takes, issues" /> : r.sceneNotes?.[s.id] || ''}</td>
                </tr>
              ))}
              {!scenes.length && <tr><td colSpan={7} className="muted">No scenes assigned to this day.</td></tr>}
            </tbody>
          </table>
          {editable && otherScenes.length > 0 && (
            <div className="no-print">
              <select className="input select" value="" onChange={(e) => addExtraScene(e.target.value)}>
                <option value="">Add a scene that was shot today but not planned…</option>
                {otherScenes.map((s) => <option key={s.id} value={s.id}>{s.number} · {s.location || s.heading}</option>)}
              </select>
            </div>
          )}
        </section>

        <div className="sheet-grid">
          <section>
            <h3>On set</h3>
            <div className="row-2">
              <Field label="Cast">{editable ? <Input type="number" min="0" value={r.castCount ?? ''} onChange={(e) => set('castCount', e.target.value)} placeholder={String([...new Set(scenes.flatMap((s) => s.characters))].length)} /> : <div>{r.castCount || ''}</div>}</Field>
              <Field label="Extras">{editable ? <Input type="number" min="0" value={r.extrasCount ?? ''} onChange={(e) => set('extrasCount', e.target.value)} /> : <div>{r.extrasCount || ''}</div>}</Field>
            </div>
            <div className="row-2">
              <Field label="Crew">{editable ? <Input type="number" min="0" value={r.crewCount ?? ''} onChange={(e) => set('crewCount', e.target.value)} placeholder={String(project.contacts.filter((c) => c.kind === 'crew').length)} /> : <div>{r.crewCount || ''}</div>}</Field>
              <Field label="Meals served">{editable ? <Input type="number" min="0" value={r.meals ?? ''} onChange={(e) => set('meals', e.target.value)} /> : <div>{r.meals || ''}</div>}</Field>
            </div>
          </section>
          <section>
            <h3>Weather & conditions</h3>
            {editable ? <Textarea rows={3} value={r.weather || ''} onChange={(e) => set('weather', e.target.value)} placeholder="Actual weather, light, wind. Delays caused by it." /> : <div>{r.weather || '–'}</div>}
          </section>
          <section>
            <h3>Incidents & safety</h3>
            {editable ? <Textarea rows={3} value={r.incidents || ''} onChange={(e) => set('incidents', e.target.value)} placeholder="None, or what happened and what was done." /> : <div>{r.incidents || '–'}</div>}
          </section>
        </div>

        <section>
          <h3>Notes for production</h3>
          {editable ? <Textarea rows={4} value={r.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Equipment issues, overtime, pickups needed, tomorrow's changes…" /> : <div>{r.notes || '–'}</div>}
        </section>
        <section>
          <h3>Signed</h3>
          <div className="row-2">
            <Field label="1st AD">{editable ? <Input value={r.signedAd || ''} onChange={(e) => set('signedAd', e.target.value)} /> : <div>{r.signedAd || ''}</div>}</Field>
            <Field label="Production manager">{editable ? <Input value={r.signedPm || ''} onChange={(e) => set('signedPm', e.target.value)} /> : <div>{r.signedPm || ''}</div>}</Field>
          </div>
        </section>
        {editable && <p className="fineprint no-print">Saved automatically. A day counts as reported once the wrap time is filled in.</p>}
      </article>
    </div>
  )
}
