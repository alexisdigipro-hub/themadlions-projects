import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, Field, Textarea } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { formatPages } from '../../lib/breakdown.js'
import { fmtLong } from '../../lib/dates.js'

function addMinutes(hhmm, mins) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m + (mins || 0)
  const hh = Math.floor(((t % 1440) + 1440) % 1440 / 60)
  const mm = ((t % 60) + 60) % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export default function CallSheets() {
  const { project, edit, canEdit } = useProject()
  const days = [...project.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
  const [sel, setSel] = useState(days[0]?.id || '')
  const day = days.find((d) => d.id === sel) || days[0]
  const editable = canEdit('callsheets')

  if (!days.length) {
    return (
      <Empty title="No shoot days yet">
        Call sheets are generated from the <Link to="../schedule">schedule</Link>. Add a shoot day and assign scenes, then come back.
      </Empty>
    )
  }

  const sceneById = Object.fromEntries(project.scenes.map((s) => [s.id, s]))
  const scenes = day.sceneIds.map((id) => sceneById[id]).filter(Boolean)
  const loc = project.locations.find((l) => l.id === day.locationId)
  const chars = [...new Set(scenes.flatMap((s) => s.characters))]
  const castRows = chars.map((c) => {
    const actor = project.contacts.find((x) => x.kind === 'cast' && x.character?.toUpperCase() === c.toUpperCase())
    return { character: c, actor, call: addMinutes(day.callTime, actor?.callOffset ?? 0) }
  })
  const crew = project.contacts.filter((c) => c.kind === 'crew')
  const departments = {}
  for (const s of scenes) for (const [cat, items] of Object.entries(s.elements || {})) departments[cat] = [...new Set([...(departments[cat] || []), ...items])]
  const sheet = day.callSheet || {}
  const setSheet = (k, v) => edit((p) => {
    const d = p.shootingDays.find((x) => x.id === day.id)
    if (d) d.callSheet = { ...(d.callSheet || {}), [k]: v }
  })

  return (
    <div className="callsheets">
      <div className="toolbar no-print">
        <div className="segmented">
          {days.map((d, i) => (
            <button key={d.id} className={d.id === day.id ? 'on' : ''} onClick={() => setSel(d.id)}>
              Day {i + 1}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <Button variant="primary" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>

      <article className="sheet">
        <header className="sheet-head">
          <div>
            <div className="sheet-brand">{project.producer || 'THEMADLIONS'}</div>
            <h1>{project.title}</h1>
            <div className="muted">
              Call sheet · Day {days.indexOf(day) + 1} of {days.length} · {day.unit}
            </div>
          </div>
          <div className="sheet-call">
            <div className="sheet-call-label">General call</div>
            <div className="sheet-call-time">{day.callTime}</div>
            <div className="muted">{fmtLong(day.date)}</div>
            <div className="muted">Est. wrap {day.wrapTime}</div>
          </div>
        </header>

        <div className="sheet-grid">
          <section>
            <h3>Location</h3>
            {loc ? (
              <>
                <strong>{loc.name}</strong>
                <div>{loc.address}</div>
                {loc.notes && <div className="muted small">{loc.notes}</div>}
                <a className="link no-print" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              </>
            ) : (
              <span className="muted">Set the location on the shoot day.</span>
            )}
          </section>
          <section>
            <h3>Key contacts</h3>
            {project.director && <div>Director: {project.director}</div>}
            {crew.slice(0, 6).map((c) => (
              <div key={c.id}>
                {c.role || c.dept}: {c.name} {c.phone && <span className="muted">{c.phone}</span>}
              </div>
            ))}
            {!crew.length && <span className="muted">Add crew in Cast & crew.</span>}
          </section>
          <section>
            <h3>Weather & sunrise</h3>
            {editable ? (
              <Textarea rows={3} value={sheet.weather || ''} onChange={(e) => setSheet('weather', e.target.value)} placeholder="e.g. 24°C, clear. Sunrise 07:12, sunset 19:40. Hospital: Evangelismos, Ypsilantou 45." />
            ) : (
              <div>{sheet.weather || '–'}</div>
            )}
          </section>
        </div>

        <section>
          <h3>Scenes</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Sc.</th>
                <th>I/E</th>
                <th>Set</th>
                <th>D/N</th>
                <th>Description</th>
                <th>Cast</th>
                <th>Pgs</th>
              </tr>
            </thead>
            <tbody>
              {scenes.map((s) => (
                <tr key={s.id}>
                  <td>{s.number}</td>
                  <td>{s.intExt}</td>
                  <td>{s.location}</td>
                  <td>{s.timeOfDay}</td>
                  <td>{s.synopsis}</td>
                  <td>{s.characters.join(', ')}</td>
                  <td>{formatPages(s.eighths)}</td>
                </tr>
              ))}
              {!scenes.length && (
                <tr>
                  <td colSpan={7} className="muted">
                    No scenes assigned to this day.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section>
          <h3>Cast</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Character</th>
                <th>Actor</th>
                <th>Phone</th>
                <th>Call</th>
              </tr>
            </thead>
            <tbody>
              {castRows.map((r) => (
                <tr key={r.character}>
                  <td>{r.character}</td>
                  <td>{r.actor?.name || <span className="muted">Not cast</span>}</td>
                  <td>{r.actor?.phone || ''}</td>
                  <td>{r.call}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {Object.keys(departments).length > 0 && (
          <section>
            <h3>Department requirements</h3>
            <div className="dept-grid">
              {Object.entries(departments).map(([cat, items]) => (
                <div key={cat}>
                  <strong>{cat}</strong>
                  <div className="small">{items.join(', ')}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3>Crew</h3>
          <div className="dept-grid">
            {crew.map((c) => (
              <div key={c.id}>
                <strong>{c.name}</strong>
                <div className="small muted">
                  {c.role || c.dept} · call {addMinutes(day.callTime, c.callOffset ?? 0)}
                  {c.phone ? ` · ${c.phone}` : ''}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3>Notes</h3>
          {editable ? (
            <Field>
              <Textarea rows={4} value={sheet.notes || day.notes || ''} onChange={(e) => setSheet('notes', e.target.value)} placeholder="Parking, catering, safety, permits, transport…" />
            </Field>
          ) : (
            <div>{sheet.notes || day.notes || '–'}</div>
          )}
        </section>
        {editable && (
          <p className="fineprint no-print">Edits here are saved automatically to this day's call sheet.</p>
        )}
      </article>
    </div>
  )
}
