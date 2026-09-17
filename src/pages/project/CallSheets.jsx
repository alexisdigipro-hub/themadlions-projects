import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, Field, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { useStore } from '../../lib/store.jsx'
import { formatPages } from '../../lib/breakdown.js'
import { fmtLong } from '../../lib/dates.js'
import { ATHENS, coordsFromText, forecast, geocode, sunTimes } from '../../lib/sun.js'
import { callSheetText, mailLink, personalCallText, waLink, waShareLink } from '../../lib/share.js'
import { Modal } from '../../components/ui.jsx'
import { publishShare } from '../../lib/shares.js'
import { useCurrentUser } from '../../lib/store.jsx'

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
  const { state } = useStore()
  const days = [...project.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
  const [sel, setSel] = useState(days[0]?.id || '')
  const [mode, setMode] = useState('sheet') // sheet | sides
  const [busy, setBusy] = useState(false)
  const [send, setSend] = useState(false)
  const [share, setShare] = useState(null) // { url } | { busy } | { error }
  const user = useCurrentUser()
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
  const castRows = project.category === 'Event'
    ? project.contacts.filter((x) => x.kind === 'cast').map((actor) => ({ character: actor.character || actor.role || 'Talent', actor, call: addMinutes(day.callTime, actor.callOffset ?? 0) }))
    : chars.map((c) => {
        const actor = project.contacts.find((x) => x.kind === 'cast' && x.character?.toUpperCase() === c.toUpperCase())
        return { character: c, actor, call: addMinutes(day.callTime, actor?.callOffset ?? 0) }
      })
  const crew = project.contacts.filter((c) => c.kind === 'crew')
  const departments = {}
  for (const s of scenes) for (const [cat, items] of Object.entries(s.elements || {})) departments[cat] = [...new Set([...(departments[cat] || []), ...items])]
  const sheet = day.callSheet || {}
  const dayIndex = days.indexOf(day)
  const crewRows = crew.map((c) => ({ ...c, call: addMinutes(day.callTime, c.callOffset ?? 0) }))
  const fullText = callSheetText({ project, day, dayIndex, dayCount: days.length, scenes, loc, cast: castRows, crew: crewRows, sheet })
  const people = [...castRows.filter((r) => r.actor).map((r) => ({ ...r.actor, call: r.call, character: r.character, scenes: scenes.filter((s) => s.characters?.includes(r.character)) })), ...crewRows.map((c) => ({ ...c, scenes }))]
  const personal = (pp) => personalCallText({ project, day, dayIndex, loc, person: pp, call: pp.call, scenes: pp.scenes })
  const emails = people.map((pp) => pp.email).filter(Boolean)
  const subject = `${project.title} · Call sheet Day ${dayIndex + 1} · ${day.date} · call ${day.callTime}`
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('Copied', 'ok') } catch { toast('Could not copy', 'error') }
  }
  const makeShare = async () => {
    setShare({ busy: true })
    try {
      const keyCrew = crew.filter((c) => /1st AD|assistant director|production manager|UPM|line producer|DoP|photography|producer/i.test(c.role || '')).slice(0, 5).map((c) => ({ role: c.role, name: c.name, phone: c.phone }))
      if (project.producer) keyCrew.unshift({ role: 'Producer', name: project.producer })
      if (project.director) keyCrew.unshift({ role: 'Director', name: project.director })
      const data = {
        project: { title: project.title, color: project.color, cover: project.coverThumb || '', category: project.category },
        company: { name: state.workspace.name, address: state.settings.companyAddress || '' },
        day: { index: dayIndex + 1, count: days.length, date: day.date, callTime: day.callTime, wrapTime: day.wrapTime },
        sheet: { tagline: sheet.tagline || '', notes: sheet.notes || '', shootingCall: sheet.shootingCall || '', lunch: sheet.lunch || '', parking: sheet.parking || '', hospital: sheet.weather || '' },
        wx: wx ? { tmax: wx.tmax, tmin: wx.tmin, summary: wx.summary, rain: wx.rain } : null,
        sun: sun ? { sunrise: wx?.sunrise || sun.sunrise, sunset: wx?.sunset || sun.sunset } : null,
        loc: loc ? { name: loc.name, address: loc.address, contact: loc.contact, phone: loc.phone } : null,
        scenes: scenes.map((s) => ({ number: s.number, intExt: s.intExt, location: s.location, timeOfDay: s.timeOfDay, synopsis: s.synopsis, characters: s.characters, pages: formatPages(s.eighths) })),
        cast: castRows.map((r) => ({ character: r.character, name: r.actor?.name || '', phone: r.actor?.phone || '', call: r.call, photo: r.actor?.photos?.[0]?.thumb || '' })),
        crew: crewRows.map((c) => ({ name: c.name, role: c.role || c.dept, phone: c.phone || '', call: c.call, photo: c.photos?.[0]?.thumb || '' })),
        blocks: (day.blocks || []).map((b) => ({ time: b.time, end: b.end, item: b.item, owner: b.owner, notes: b.notes })),
        keyCrew,
      }
      const url = await publishShare({ workspaceId: state.workspace.id, kind: 'callsheet', ref: `callsheet:${project.id}:${day.id}`, data, userId: user?.id })
      setShare({ url })
    } catch (e) {
      setShare({ error: e.message })
    }
  }

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
          {project.category !== 'Event' && (
            <div className="segmented small">
              <button className={mode === 'sheet' ? 'on' : ''} onClick={() => setMode('sheet')}>Call sheet</button>
              <button className={mode === 'sides' ? 'on' : ''} onClick={() => setMode('sides')}>Sides</button>
            </div>
          )}
          <Button onClick={makeShare}>Share link</Button>
          <Button onClick={() => setSend(true)}>Send message</Button>
          <Button variant="primary" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>

      <Modal open={!!share} title={`Share call sheet · Day ${dayIndex + 1}`} onClose={() => setShare(null)}>
        {share?.busy && <p className="muted">Preparing the link…</p>}
        {share?.error && <p className="error">{share.error}</p>}
        {share?.url && (
          <div className="stack">
            <p className="small muted">Anyone with this link sees the call sheet on their phone, no login needed: call times, location with directions, the pinned note, cast and crew calls and scenes. Department requirements and budgets stay inside the app. Sharing again after you edit refreshes the same link.</p>
            <div className="share-link"><input className="input" readOnly value={share.url} onFocus={(e) => e.target.select()} /><Button variant="ghost" onClick={() => copy(share.url)}>Copy</Button></div>
            <div className="row-actions wrap">
              <a className="btn btn-primary" href={waShareLink(`${project.title} · Call sheet Day ${dayIndex + 1} · ${day.date} · call ${day.callTime}\n${share.url}`)} target="_blank" rel="noreferrer">Send on WhatsApp</a>
              <a className="btn btn-ghost" href={mailLink({ bcc: emails, subject, body: `${subject}\n\n${share.url}` })}>Mail</a>
              {navigator.share && <Button variant="ghost" onClick={() => navigator.share({ title: subject, url: share.url }).catch(() => {})}>Share…</Button>}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={send} wide title={`Send call sheet · Day ${dayIndex + 1}`} onClose={() => setSend(false)}>
        <div className="stack">
          <div className="send-row">
            <div>
              <strong>Whole call sheet</strong>
              <div className="muted small">One message with call, location, scenes, cast and crew calls. Paste it in the project group or send to anyone.</div>
            </div>
            <div className="row-actions">
              <a className="btn btn-primary btn-sm" href={waShareLink(fullText)} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="btn btn-ghost btn-sm" href={mailLink({ bcc: emails, subject, body: fullText.replace(/\*/g, '') })}>Mail{emails.length ? ` (${emails.length})` : ''}</a>
              <Button size="sm" variant="ghost" onClick={() => copy(fullText)}>Copy</Button>
            </div>
          </div>
          <p className="fineprint">The PDF is not attached automatically: use Print / Save PDF and add it to the message if you want it. Mail opens your mail app with everyone in Bcc.</p>
          <div className="panel-head"><h3>Personal messages</h3><span className="muted small">Each one gets only their own call time</span></div>
          <table className="table send-table">
            <thead><tr><th>Name</th><th>Role</th><th>Call</th><th>Phone</th><th /></tr></thead>
            <tbody>
              {people.map((pp) => (
                <tr key={pp.id}>
                  <td className="person-cell">{pp.photos?.[0]?.thumb && <img className="avatar-img" src={pp.photos[0].thumb} alt="" />}<strong>{pp.name}</strong></td>
                  <td className="small">{pp.kind === 'cast' ? pp.character : pp.role || pp.dept}</td>
                  <td>{pp.call}</td>
                  <td className="small">{pp.phone || <span className="muted">no phone</span>}</td>
                  <td className="row-actions">
                    {pp.phone && <a className="btn btn-primary btn-sm" href={waLink(pp.phone, personal(pp))} target="_blank" rel="noreferrer">WhatsApp</a>}
                    {pp.email && <a className="btn btn-ghost btn-sm" href={mailLink({ to: [pp.email], subject, body: personal(pp).replace(/\*/g, '') })}>Mail</a>}
                    <button onClick={() => copy(personal(pp))}>Copy</button>
                  </td>
                </tr>
              ))}
              {!people.length && <tr><td colSpan={5} className="muted">Assign scenes and cast people first.</td></tr>}
            </tbody>
          </table>
          <details className="send-preview">
            <summary className="small muted">Preview the group message</summary>
            <pre className="script small">{fullText}</pre>
          </details>
        </div>
      </Modal>

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

      <article className="sheet cs" hidden={mode !== 'sheet'}>
        <header className="cs-head">
          <div className="cs-company">
            <div className="cs-brand"><span className="cs-mark" />{state.workspace.name}</div>
            {state.settings.companyAddress && <div className="muted small cs-addr">{state.settings.companyAddress}</div>}
            <dl className="cs-kv">
              {project.producer && (<><dt>Producer</dt><dd>{project.producer}</dd></>)}
              {project.director && (<><dt>Director</dt><dd>{project.director}</dd></>)}
              {crew.filter((c) => /1st AD|assistant director|production manager|UPM|line producer|DoP|photography/i.test(c.role || '')).slice(0, 4).map((c) => (
                <span key={c.id} className="cs-kv-row"><dt>{c.role}</dt><dd>{c.name}{c.phone ? <span className="muted"> {c.phone}</span> : null}</dd></span>
              ))}
            </dl>
          </div>
          <div className="cs-center">
            {project.coverThumb ? <img className="cs-key" src={project.coverThumb} alt="" /> : null}
            <h1>{project.title}</h1>
            <div className="cs-call-label">General crew call</div>
            <div className="cs-call-time">{day.callTime}</div>
            {editable ? (
              <textarea className="cs-tagline" rows={3} value={sheet.tagline || ''} onChange={(e) => setSheet('tagline', e.target.value)} placeholder="One line for everyone: safety first, bring a jacket, no smoking on set." />
            ) : sheet.tagline ? <p className="cs-tagline-text">{sheet.tagline}</p> : null}
          </div>
          <div className="cs-side">
            <div className="cs-day">Day {dayIndex + 1} of {days.length}</div>
            <div className="cs-date">{new Date(day.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div className="cs-wx">
              {wx ? (
                <>
                  <div className="cs-temp"><span className="cs-sun-ico">☀</span> {wx.tmax}° <span className="muted">/ {wx.tmin}°</span></div>
                  <div className="muted small"><em>{wx.summary}{wx.rain != null ? `, rain ${wx.rain}%` : ''}</em></div>
                </>
              ) : (
                <div className="muted small no-print">No forecast yet{editable ? <> · <button className="link" onClick={fetchWeather} disabled={busy}>{busy ? 'fetching…' : 'fetch'}</button></> : null}</div>
              )}
              {sun && <div className="small"><strong>Sunrise</strong> {wx?.sunrise || sun.sunrise} · <strong>Sunset</strong> {wx?.sunset || sun.sunset}</div>}
            </div>
            <dl className="cs-times">
              <dt>Shooting call</dt><dd>{editable ? <input className="cs-time" value={sheet.shootingCall ?? ''} placeholder={day.callTime} onChange={(e) => setSheet('shootingCall', e.target.value)} /> : sheet.shootingCall || day.callTime}</dd>
              <dt>Lunch</dt><dd>{editable ? <input className="cs-time" value={sheet.lunch ?? ''} placeholder="13:00" onChange={(e) => setSheet('lunch', e.target.value)} /> : sheet.lunch || ''}</dd>
              <dt>Est. wrap</dt><dd>{day.wrapTime}</dd>
            </dl>
          </div>
        </header>

        {(sheet.notes || editable) && (
          <div className="cs-note">
            <span className="cs-pin">📌</span>
            {editable ? (
              <textarea rows={2} value={sheet.notes || ''} onChange={(e) => setSheet('notes', e.target.value)} placeholder="Parking, catering, safety, permits, transport. Everyone reads this one." />
            ) : <p>{sheet.notes}</p>}
          </div>
        )}

        <section>
          <h3>Location</h3>
          <div className="cs-locgrid">
            <div>
              <div className="cs-loc-h">Set location</div>
              {loc ? (
                <>
                  <strong className="cs-loc-name">{loc.name}</strong>
                  <div>{loc.address}</div>
                  {loc.phone && <div className="muted small">{loc.contact ? `${loc.contact} · ` : ''}{loc.phone}</div>}
                  <a className="link no-print small" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`} target="_blank" rel="noreferrer">Open in Google Maps</a>
                </>
              ) : <span className="muted">Set the location on the shoot day.</span>}
            </div>
            <div>
              <div className="cs-loc-h">Parking</div>
              {editable ? <textarea rows={3} value={sheet.parking || ''} onChange={(e) => setSheet('parking', e.target.value)} placeholder="Where, how many cars, who unloads where" /> : <div>{sheet.parking || '–'}</div>}
            </div>
            <div>
              <div className="cs-loc-h">Nearest hospital</div>
              {editable ? <textarea rows={3} value={sheet.weather || ''} onChange={(e) => setSheet('weather', e.target.value)} placeholder="Name, address, phone" /> : <div>{sheet.weather || '–'}</div>}
            </div>
          </div>
          {wx && <div className="muted small no-print">{wx.place} · forecast from open-meteo · {editable && <button className="link" onClick={fetchWeather} disabled={busy}>{busy ? 'fetching…' : 'refresh'}</button>}</div>}
        </section>

        {project.category === 'Event' && (
          <section>
            <h3>Run of show</h3>
            <table className="table">
              <thead><tr><th>Time</th><th>Block</th><th>Owner</th><th>Notes</th></tr></thead>
              <tbody>
                {(day.blocks || []).map((b) => (
                  <tr key={b.id}><td className="nowrap">{b.time}{b.end ? ` – ${b.end}` : ''}</td><td><strong>{b.item}</strong></td><td>{b.owner}</td><td className="small">{b.notes}</td></tr>
                ))}
                {!(day.blocks || []).length && <tr><td colSpan={4} className="muted">No run of show yet. Build it in the Run of show tab.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        <section hidden={project.category === 'Event'}>
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

        <section hidden={project.category === 'Event' && !project.contacts.some((c) => c.kind === 'cast')}>
          <h3>{project.category === 'Event' ? 'Talent' : 'Cast'}</h3>
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

        {editable && (
          <p className="fineprint no-print">Edits here are saved automatically to this day's call sheet.</p>
        )}
      </article>
    </div>
  )
}
