import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, Field, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { formatPages } from '../../lib/breakdown.js'
import { fmtLong } from '../../lib/dates.js'
import { ATHENS, coordsFromText, forecast, geocode, sunTimes } from '../../lib/sun.js'

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
  const [mode, setMode] = useState('sheet') // sheet | sides
  const [busy, setBusy] = useState(false)
  const toast = useToast()
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

  // sun and weather for the day's location (falls back to the city in the address, then Athens)
  const coords = (loc?.lat && loc?.lon) ? { lat: Number(loc.lat), lon: Number(loc.lon) } : coordsFromText(loc?.address) || null
  const sun = sunTimes(day.date, coords?.lat ?? ATHENS.lat, coords?.lon ?? ATHENS.lon)
  const wx = sheet.forecast
  const fetchWeather = async () => {
    setBusy(true)
    try {
      let c = coords
      if (!c && loc?.address) {
        const city = loc.address.split(',').map((x) => x.trim()).filter(Boolean).slice(-2, -1)[0] || loc.address
        c = await geocode(city)
      }
      c = c || ATHENS
      const f = await forecast(day.date, c.lat, c.lon)
      setSheet('forecast', { ...f, place: c.name || loc?.name || 'location' })
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

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
          <div className="segmented small">
            <button className={mode === 'sheet' ? 'on' : ''} onClick={() => setMode('sheet')}>Call sheet</button>
            <button className={mode === 'sides' ? 'on' : ''} onClick={() => setMode('sides')}>Sides</button>
          </div>
          <Button variant="primary" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>

      {mode === 'sides' && (
        <article className="sheet sides">
          <header className="sheet-head">
            <div>
              <div className="sheet-brand">{project.producer || 'THEMADLIONS'}</div>
              <h1>{project.title}</h1>
              <div className="muted">Sides · Day {days.indexOf(day) + 1} · {fmtLong(day.date)} · {scenes.length} scenes · {formatPages(scenes.reduce((a, s) => a + (s.eighths || 0), 0))} pages</div>
            </div>
          </header>
          {!scenes.length && <p className="muted">No scenes assigned to this day.</p>}
          {scenes.map((s) => (
            <section key={s.id} className="side-scene">
              <div className="script script-heading">{s.number}. {s.heading}</div>
              <div className="script">{s.body}</div>
            </section>
          ))}
        </article>
      )}

      <article className="sheet" hidden={mode !== 'sheet'}>
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
            <h3>Sun & weather</h3>
            {sun && (
              <div className="sun-row">
                <span>Sunrise <strong>{wx?.sunrise || sun.sunrise}</strong></span>
                <span>Sunset <strong>{wx?.sunset || sun.sunset}</strong></span>
                <span className="muted small">Golden hour until {sun.goldenAmEnd}, from {sun.goldenPmStart}</span>
              </div>
            )}
            {wx ? (
              <div className="wx">
                <strong>{wx.summary}</strong> · {wx.tmin}° to {wx.tmax}°C{wx.rain != null ? ` · rain ${wx.rain}%` : ''} · wind {wx.wind} km/h
                <div className="muted small">{wx.place} · forecast from open-meteo</div>
              </div>
            ) : (
              <div className="muted small">No forecast fetched yet.</div>
            )}
            {editable && (
              <div className="no-print">
                <Button size="sm" onClick={fetchWeather} disabled={busy}>{busy ? 'Fetching…' : wx ? 'Refresh forecast' : 'Fetch forecast'}</Button>
              </div>
            )}
            {editable ? (
              <Textarea rows={2} value={sheet.weather || ''} onChange={(e) => setSheet('weather', e.target.value)} placeholder="Nearest hospital, safety notes…" />
            ) : (
              sheet.weather && <div>{sheet.weather}</div>
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
                  <td className="person-cell">
                    {r.actor?.photos?.[0]?.thumb && <img className="avatar-img" src={r.actor.photos[0].thumb} alt="" />}
                    {r.actor?.name || <span className="muted">Not cast</span>}
                  </td>
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
