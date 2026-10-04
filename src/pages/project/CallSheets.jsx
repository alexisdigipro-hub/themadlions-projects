import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { useStore } from '../../lib/store.jsx'
import { formatPages } from '../../lib/breakdown.js'
import { fmtLong } from '../../lib/dates.js'
import { ATHENS, coordsFromText, forecast, geocode, sunTimes } from '../../lib/sun.js'
import { callSheetText, mailLink, personalCallText, waLink, waShareLink } from '../../lib/share.js'
import { Modal } from '../../components/ui.jsx'
import { ensurePin, publishShare, shareUrl } from '../../lib/shares.js'
import LinkName from '../../components/LinkName.jsx'
import { nameParts } from '../../lib/projectName.js'
import { callsheetDefaults, uid, useCurrentUser } from '../../lib/store.jsx'
import CallSheetDesigner from '../../components/CallSheetDesigner.jsx'
import { CallSheetLinkView } from '../PublicCallSheet.jsx'
import { ZOOM, accentOf, labelOf, layoutOf, linkLayout, normalizeLayout, storedLayout, titleOf } from '../../lib/callsheetLayout.js'

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
  const { state, update } = useStore()
  const days = [...project.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
  const [sel, setSel] = useState(days[0]?.id || '')
  const [mode, setMode] = useState('sheet') // sheet | sides
  const [busy, setBusy] = useState(false)
  const [send, setSend] = useState(false)
  const [share, setShare] = useState(null) // { url } | { busy } | { error }
  const [designing, setDesigning] = useState(false)
  // The phone next to the sheet showing the link as it will look; remembered on this device.
  const [preview, setPreviewState] = useState(() => { try { return localStorage.getItem('tml_cs_preview') === '1' } catch { return false } })
  const setPreview = (v) => { setPreviewState(v); try { localStorage.setItem('tml_cs_preview', v ? '1' : '0') } catch { /* private window */ } }
  const user = useCurrentUser()
  const csd = callsheetDefaults(state)
  const canShare = true
  const toast = useToast()
  const day = days.find((d) => d.id === sel) || days[0]
  const editable = canEdit('callsheets')
  // Printed on every call sheet and carried into the shared link. Both live in Settings.
  const emergency = (state.settings.emergency || []).filter((n) => n && n.number)
  const prodContacts = (state.settings.productionContacts || []).filter((c) => c && (c.role || c.name))
  // Default lunch time: the day's call plus the company default. Declared after `day`, which it reads.
  const lunchDefault = (() => { const m = /^(\d{1,2}):(\d{2})$/.exec(day?.callTime || ''); if (!m || !csd.lunchAfterHours) return ''; const t = (Number(m[1]) * 60 + Number(m[2]) + Number(csd.lunchAfterHours) * 60) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` })()

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
  const sheet = day.callSheet || {}
  const calls = sheet.calls || {}
  const hidden = sheet.hidden || {}
  const extra = (sheet.extra || []).filter((x) => x.name?.trim())
  // Every person row carries a key, so a call time changed or a person left out on this one day
  // sticks to them: the contact id, or the character's name while nobody is cast for it.
  const castAll = (project.category === 'Event'
    ? project.contacts.filter((x) => x.kind === 'cast').map((actor) => ({ character: actor.character || actor.role || 'Talent', actor }))
    : chars.map((c) => ({ character: c, actor: project.contacts.find((x) => x.kind === 'cast' && x.character?.toUpperCase() === c.toUpperCase()) }))
  ).map((r) => {
    const key = r.actor ? r.actor.id : `ch:${r.character}`
    const auto = addMinutes(day.callTime, r.actor?.callOffset ?? 0)
    return { ...r, key, auto, call: calls[key] || auto }
  })
  const castRows = [
    ...castAll.filter((r) => !hidden[r.key]),
    ...extra.filter((x) => x.kind === 'cast').map((x) => ({ key: x.id, extra: true, character: x.role || 'Cast', actor: { id: x.id, kind: 'cast', name: x.name, phone: x.phone, character: x.role }, call: x.call || day.callTime })),
  ]
  const crew = project.contacts.filter((c) => c.kind === 'crew')
  const crewAll = crew.map((c) => {
    const auto = addMinutes(day.callTime, c.callOffset ?? 0)
    return { ...c, key: c.id, auto, call: calls[c.id] || auto }
  })
  const crewRows = [
    ...crewAll.filter((c) => !hidden[c.key]),
    ...extra.filter((x) => x.kind !== 'cast').map((x) => ({ id: x.id, key: x.id, extra: true, kind: 'crew', name: x.name, role: x.role, phone: x.phone, call: x.call || day.callTime })),
  ]
  const hiddenPeople = [...castAll, ...crewAll].filter((r) => hidden[r.key]).map((r) => ({ key: r.key, name: r.actor?.name || r.name || r.character }))
  const departments = {}
  for (const s of scenes) for (const [cat, items] of Object.entries(s.elements || {})) departments[cat] = [...new Set([...(departments[cat] || []), ...items])]
  const dayIndex = days.indexOf(day)
  const layout = layoutOf(project, state)
  const event = project.category === 'Event'
  const show = (k) => layout.details[k].sheet
  const title = sheet.title?.trim() || project.title
  const customText = (b) => sheet.custom?.[b.key] || b.text || ''
  const locView = loc || sheet.locName || sheet.locAddress
    ? { name: sheet.locName || loc?.name || '', address: sheet.locAddress || loc?.address || '', contact: sheet.locContact || loc?.contact || '', phone: sheet.locPhone || loc?.phone || '', notes: loc?.notes || '' }
    : null
  const titled = { ...project, title }
  // Program: rows typed by hand on the day (time and what happens), like the scene times
  const program = sheet.program || []
  const programRows = program.filter((r) => r.from || r.to || r.what?.trim())
  // Calls by group: production crew 10:00, beauty 09:00, dancers 14:00…, typed by hand per day
  const groupCalls = sheet.groupCalls || []
  const groupRows = groupCalls.filter((r) => r.who?.trim() || r.time)
  const notes = [
    ...(groupRows.length ? [{ title: titleOf(layout, layout.blocks.find((b) => b.key === 'groupcalls') || { key: 'groupcalls' }), text: groupRows.map((r) => `⏰ ${(r.who || '').toUpperCase()}: ${r.time || ''}`).join('\n') }] : []),
    ...(programRows.length ? [{ title: titleOf(layout, layout.blocks.find((b) => b.key === 'program') || { key: 'program' }), text: programRows.map((r) => `${r.from || ''}${r.to ? `–${r.to}` : ''} ${r.what || ''}`.trim()).join('\n') }] : []),
    ...layout.blocks.filter((b) => b.custom && customText(b)).map((b) => ({ title: titleOf(layout, b), text: customText(b) })),
  ]
  const fullText = callSheetText({ project: titled, day, dayIndex, dayCount: days.length, scenes, loc: locView, cast: castRows, crew: crewRows, sheet, extra: notes })
  const people = [...castRows.filter((r) => r.actor).map((r) => ({ ...r.actor, call: r.call, character: r.character, scenes: scenes.filter((s) => s.characters?.includes(r.character)) })), ...crewRows.map((c) => ({ ...c, scenes }))]
  const personal = (pp) => personalCallText({ project: titled, day, dayIndex, loc: locView, person: pp, call: pp.call, scenes: pp.scenes })
  const emails = people.map((pp) => pp.email).filter(Boolean)
  const subject = `${title} · Call sheet Day ${dayIndex + 1} · ${day.date} · call ${day.callTime}`
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('Copied', 'ok') } catch { toast('Could not copy', 'error') }
  }
  // What the link carries, built from the sheet as it is now: used to publish, and live by the
  // phone preview next to the sheet.
  const linkData = () => {
    const on = (k) => layout.blocks.some((b) => b.key === k && b.link)
    const linkShow = (k) => layout.details[k].link
    const phone = (x) => (linkShow('phones') ? x || '' : '')
    // Only what the link shows goes into it: a section switched off for the link is left out of
    // the snapshot, not just hidden, since anyone holding the link can read the snapshot.
    const keyCrew = !linkShow('keycrew') ? [] : crew.filter((c) => /1st AD|assistant director|production manager|UPM|line producer|DoP|photography|producer/i.test(c.role || '')).slice(0, 5).map((c) => ({ role: c.role, name: c.name, phone: phone(c.phone) }))
    if (project.producer && linkShow('keycrew')) keyCrew.unshift({ role: 'Producer', name: project.producer })
    return {
      project: { title, color: project.color, cover: linkShow('cover') ? project.coverThumb || '' : '', category: project.category },
      company: { name: state.workspace.name, address: state.settings.companyAddress || '', logo: state.settings.logo || '' },
      day: { index: dayIndex + 1, count: days.length, date: day.date, callTime: day.callTime, wrapTime: day.wrapTime },
      expiresAt: Number(state.settings.shareExpiryDays) > 0 ? new Date(new Date(day.date + 'T23:59:59').getTime() + Number(state.settings.shareExpiryDays) * 86400000).toISOString() : '',
      sheet: {
        tagline: linkShow('tagline') ? sheet.tagline || csd.tagline || '' : '',
        notes: on('note') ? sheet.notes || '' : '',
        shootingCall: sheet.shootingCall || '',
        lunch: linkShow('lunch') ? sheet.lunch || lunchDefault : '',
        parking: on('location') && linkShow('parking') ? sheet.parking || csd.parking || '' : '',
        hospital: on('location') && linkShow('hospital') ? sheet.weather || csd.hospital || '' : '',
        footer: csd.footer || '',
      },
      wx: wx && csd.showWeather !== false && linkShow('weather') ? { tmax: wx.tmax, tmin: wx.tmin, summary: wx.summary, rain: wx.rain } : null,
      sun: sun && csd.showSun !== false && linkShow('sun') ? { sunrise: wx?.sunrise || sun.sunrise, sunset: wx?.sunset || sun.sunset } : null,
      loc: locView && on('location') ? { name: locView.name, address: locView.address, contact: locView.contact, phone: phone(locView.phone) } : null,
      scenes: on('schedule') ? scenes.map((s) => ({ location: s.location, heading: s.heading, from: sceneTime(s.id).from, to: sceneTime(s.id).to })) : [],
      cast: on('cast') ? castRows.map((r) => ({ character: r.character, name: r.actor?.name || '', phone: phone(r.actor?.phone), call: r.call, photo: r.actor?.photos?.[0]?.thumb || '' })) : [],
      crew: on('crew') ? crewRows.map((c) => ({ name: c.name, role: c.role || c.dept, phone: phone(c.phone), call: c.call, photo: c.photos?.[0]?.thumb || '' })) : [],
      blocks: on('schedule') ? (day.blocks || []).map((b) => ({ time: b.time, end: b.end, item: b.item, owner: b.owner, notes: b.notes })) : [],
      departments: on('departments') ? Object.entries(departments).map(([cat, items]) => ({ cat, items })) : [],
      groupCalls: on('groupcalls') ? groupRows.map((r) => ({ who: r.who || '', time: r.time || '' })) : [],
      program: on('program') ? programRows.map((r) => ({ from: r.from || '', to: r.to || '', what: r.what || '' })) : [],
      keyCrew,
      emergency: on('contacts') ? emergency : [],
      prodContacts: on('contacts') ? prodContacts : [],
      layout: linkLayout(layout, project, customText),
    }
  }
  const makeShare = async () => {
    setShare({ busy: true })
    try {
      const data = linkData()
      const ref = `callsheet:${project.id}:${day.id}`
      const url = await publishShare({ workspaceId: state.workspace.id, kind: 'callsheet', ref, data, userId: user?.id })
      // The code stays the same across re-shares of the same day, so crew are not asked twice.
      let pin = ''
      let pinError = ''
      if (state.settings.sharePin) {
        try { pin = await ensurePin({ workspaceId: state.workspace.id, ref }) } catch (e) { pinError = e.message }
      }
      setShare({ url, pin, pinError, ref })
    } catch (e) {
      setShare({ error: e.message })
    }
  }

  const sceneTime = (id) => (sheet.sceneTimes || {})[id] || { from: '', to: '' }
  const setGroups = (list) => setSheet('groupCalls', list)
  const setGroupRow = (i, k, v) => setGroups(groupCalls.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const moveGroup = (i, d) => {
    const j = i + d
    if (j < 0 || j >= groupCalls.length) return
    const list = [...groupCalls]
    ;[list[i], list[j]] = [list[j], list[i]]
    setGroups(list)
  }
  const USUAL_GROUPS = ['Production crew', 'Beauty crew', 'Artist', 'Dancers', 'Cast', 'Model']
  const setProgram = (list) => setSheet('program', list)
  const setProgramRow = (i, k, v) => setProgram(program.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const moveProgram = (i, d) => {
    const j = i + d
    if (j < 0 || j >= program.length) return
    const list = [...program]
    ;[list[i], list[j]] = [list[j], list[i]]
    setProgram(list)
  }
  const setSceneTime = (id, k, v) => edit((p) => {
    const d = p.shootingDays.find((x) => x.id === day.id)
    if (!d) return
    d.callSheet = d.callSheet || {}
    d.callSheet.sceneTimes = { ...(d.callSheet.sceneTimes || {}), [id]: { ...((d.callSheet.sceneTimes || {})[id] || { from: '', to: '' }), [k]: v } }
  })

  const setSheet = (k, v) => edit((p) => {
    const d = p.shootingDays.find((x) => x.id === day.id)
    if (d) d.callSheet = { ...(d.callSheet || {}), [k]: v }
  })

  const setDay = (k, v) => edit((p) => {
    const d = p.shootingDays.find((x) => x.id === day.id)
    if (d) d[k] = v
  })
  const setCall = (key, v) => setSheet('calls', { ...calls, [key]: v })
  const hidePerson = (key, on) => {
    const next = { ...hidden }
    if (on) next[key] = true
    else delete next[key]
    setSheet('hidden', next)
  }
  const setCustom = (key, v) => setSheet('custom', { ...(sheet.custom || {}), [key]: v })
  // The layout is saved whole on the project the first time anything in it changes.
  const setLayout = (fn) => edit((p) => {
    p.callsheetLayout = storedLayout(fn(normalizeLayout(p.callsheetLayout || state.settings?.callsheet?.layout, { event })))
  })
  const makeDefault = () => {
    update((s) => { s.settings = { ...s.settings, callsheet: { ...(s.settings.callsheet || {}), layout: storedLayout(layout) } }; return s })
    toast('Every project without its own layout now uses this one', 'ok')
  }
  const resetLayout = () => edit((p) => { delete p.callsheetLayout })

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

  const accent = accentOf(layout, project)
  const showWx = show('weather') && csd.showWeather !== false
  const showSun = show('sun') && csd.showSun !== false
  const named = (b) => !!b.title // note and numbers carry their own labels, so a heading only when renamed
  const phoneOf = (x) => (show('phones') ? x || '' : '')

  const renderBlock = (b) => {
    const h = <h3>{titleOf(layout, b)}</h3>
    switch (b.key) {
      case 'note':
        return (sheet.notes || editable) ? (
          <>
            {named(b) && h}
            <div className="cs-note">
              <span className="cs-pin">📌</span>
              {editable ? (
                <textarea rows={2} value={sheet.notes || ''} onChange={(e) => setSheet('notes', e.target.value)} placeholder="Parking, catering, safety, permits, transport. Everyone reads this one." />
              ) : <p>{sheet.notes}</p>}
            </div>
          </>
        ) : null
      case 'location':
        return (
          <section>
            {h}
            <div className="cs-locgrid" style={{ '--cs-loc-cols': 1 + (show('parking') ? 1 : 0) + (show('hospital') ? 1 : 0) }}>
              <div>
                <div className="cs-loc-h">Set location</div>
                {locView ? (
                  <>
                    <strong className="cs-loc-name">{locView.name}</strong>
                    <div>{locView.address}</div>
                    {(locView.contact || phoneOf(locView.phone)) && <div className="muted small">{[locView.contact, phoneOf(locView.phone)].filter(Boolean).join(' · ')}</div>}
                    {locView.address && <a className="link no-print small" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locView.address)}`} target="_blank" rel="noreferrer">Open in Google Maps</a>}
                  </>
                ) : <span className="muted">Set the location on the shoot day.</span>}
              </div>
              {show('parking') && <div>
                <div className="cs-loc-h">Parking</div>
                {editable ? <textarea rows={3} value={sheet.parking || ''} onChange={(e) => setSheet('parking', e.target.value)} placeholder={csd.parking || 'Where, how many cars, who unloads where'} /> : <div>{sheet.parking || csd.parking || '–'}</div>}
              </div>}
              {show('hospital') && <div>
                <div className="cs-loc-h">Nearest hospital</div>
                {editable ? <textarea rows={3} value={sheet.weather || ''} onChange={(e) => setSheet('weather', e.target.value)} placeholder={csd.hospital || 'Name, address, phone'} /> : <div>{sheet.weather || csd.hospital || '–'}</div>}
              </div>}
            </div>
            {wx && showWx && <div className="muted small no-print">{wx.place} · forecast from open-meteo · {editable && <button className="link" onClick={fetchWeather} disabled={busy}>{busy ? 'fetching…' : 'refresh'}</button>}</div>}
          </section>
        )
      case 'contacts':
        return (emergency.length > 0 || prodContacts.length > 0) ? (
          <section>
            {named(b) && h}
            <div className="cs-safety">
              {emergency.length > 0 && (
                <div className="cs-emergency">
                  <div className="cs-loc-h">Emergency</div>
                  <ul className="plain">
                    {emergency.map((n) => <li key={n.id}><span>{n.label}</span><a href={`tel:${n.number}`}>{n.number}</a></li>)}
                  </ul>
                </div>
              )}
              {prodContacts.length > 0 && (
                <div className="cs-prodcontacts">
                  <div className="cs-loc-h">Production</div>
                  <ul className="plain">
                    {prodContacts.map((c) => <li key={c.id}><span>{c.role}{c.name ? ` · ${c.name}` : ''}</span>{c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>
        ) : null
      case 'schedule':
        return event ? (
          <section>
            {h}
            <table className="table">
              <thead><tr><th>Time</th><th>Block</th><th>Owner</th><th>Notes</th></tr></thead>
              <tbody>
                {(day.blocks || []).map((x) => (
                  <tr key={x.id}><td className="nowrap">{x.time}{x.end ? ` – ${x.end}` : ''}</td><td><strong>{x.item}</strong></td><td>{x.owner}</td><td className="small">{x.notes}</td></tr>
                ))}
                {!(day.blocks || []).length && <tr><td colSpan={4} className="muted">No run of show yet. Build it in the Run of show tab.</td></tr>}
              </tbody>
            </table>
          </section>
        ) : (
          <section>
            {h}
            <table className="table">
              <thead><tr><th>Time</th><th>I/E</th><th>Set</th><th>D/N</th><th>Description</th><th>Cast</th></tr></thead>
              <tbody>
                {scenes.map((sc) => (
                  <tr key={sc.id}>
                    <td className="nowrap cs-scene-time">
                      {editable ? (
                        <span className="cs-range"><input className="cs-time" value={sceneTime(sc.id).from} placeholder="09:00" onChange={(e) => setSceneTime(sc.id, 'from', e.target.value)} /> – <input className="cs-time" value={sceneTime(sc.id).to} placeholder="11:00" onChange={(e) => setSceneTime(sc.id, 'to', e.target.value)} /></span>
                      ) : sceneTime(sc.id).from || sceneTime(sc.id).to ? `${sceneTime(sc.id).from}${sceneTime(sc.id).to ? ` – ${sceneTime(sc.id).to}` : ''}` : <span className="muted">–</span>}
                    </td>
                    <td>{sc.intExt}</td>
                    <td>{sc.location}</td>
                    <td>{sc.timeOfDay}</td>
                    <td>{sc.synopsis}</td>
                    <td>{sc.characters.join(', ')}</td>
                  </tr>
                ))}
                {!scenes.length && <tr><td colSpan={6} className="muted">No scenes assigned to this day.</td></tr>}
              </tbody>
            </table>
          </section>
        )
      case 'cast':
        return (event && !castRows.length) ? null : (
          <section>
            {h}
            <table className="table">
              <thead><tr><th>Character</th><th>Actor</th>{show('phones') && <th>Phone</th>}<th>Call</th>{editable && <th className="no-print" />}</tr></thead>
              <tbody>
                {castRows.map((r) => (
                  <tr key={r.key}>
                    <td>{r.character}</td>
                    <td>
                      <div className="person-cell">
                        {r.actor?.photos?.[0]?.thumb && <img className="avatar-img" src={r.actor.photos[0].thumb} alt="" />}
                        {r.actor?.name || <span className="muted">Not cast</span>}
                      </div>
                    </td>
                    {show('phones') && <td>{r.actor?.phone || ''}</td>}
                    <td>{editable && !r.extra ? <input className="cs-time" value={calls[r.key] ?? ''} placeholder={r.auto} onChange={(e) => setCall(r.key, e.target.value)} aria-label={`Call for ${r.actor?.name || r.character}`} /> : r.call}</td>
                    {editable && <td className="no-print row-actions">{!r.extra && <button onClick={() => hidePerson(r.key, true)} title="Leave out of this day">×</button>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      case 'groupcalls':
        if (!editable && !groupRows.length) return null
        return (
          <section>
            {h}
            <ul className="plain cs-groups">
              {(editable ? groupCalls : groupRows).map((r, i) => (
                <li key={r.id}>
                  {editable ? <input className="cs-program-input cs-group-who" value={r.who || ''} placeholder="Production crew" onChange={(e) => setGroupRow(i, 'who', e.target.value)} aria-label="Who" /> : <span className="cs-group-who">{r.who}</span>}
                  {editable ? <input className="cs-time" value={r.time || ''} placeholder={day.callTime || '10:00'} onChange={(e) => setGroupRow(i, 'time', e.target.value)} aria-label={`Call for ${r.who || 'this group'}`} /> : <strong className="cs-group-time">{r.time}</strong>}
                  {editable && (
                    <span className="row-actions no-print">
                      <button onClick={() => moveGroup(i, -1)} disabled={i === 0} aria-label="Up">↑</button>
                      <button onClick={() => moveGroup(i, 1)} disabled={i === groupCalls.length - 1} aria-label="Down">↓</button>
                      <button onClick={() => setGroups(groupCalls.filter((_, j) => j !== i))} aria-label="Remove">×</button>
                    </span>
                  )}
                </li>
              ))}
              {editable && !groupCalls.length && <li className="muted">Nothing yet. One row per group: production crew, beauty, artist, dancers…</li>}
            </ul>
            {editable && (
              <div className="no-print cs-program-add row-actions wrap">
                <Button size="sm" onClick={() => setGroups([...groupCalls, { id: uid(), who: '', time: '' }])}>Add a group</Button>
                {!groupCalls.length && <Button size="sm" variant="ghost" onClick={() => setGroups(USUAL_GROUPS.map((who) => ({ id: uid(), who, time: '' })))}>Add the usual groups</Button>}
              </div>
            )}
          </section>
        )
      case 'program':
        if (!editable && !programRows.length) return null
        return (
          <section>
            {h}
            <table className="table cs-program">
              <thead><tr><th>Time</th><th>Description</th>{editable && <th className="no-print" />}</tr></thead>
              <tbody>
                {(editable ? program : programRows).map((r, i) => (
                  <tr key={r.id}>
                    <td className="nowrap cs-scene-time">
                      {editable ? (
                        <span className="cs-range"><input className="cs-time" value={r.from || ''} placeholder="09:00" onChange={(e) => setProgramRow(i, 'from', e.target.value)} aria-label="From" /> – <input className="cs-time" value={r.to || ''} placeholder="end" onChange={(e) => setProgramRow(i, 'to', e.target.value)} aria-label="To" /></span>
                      ) : `${r.from || ''}${r.to ? ` – ${r.to}` : ''}`}
                    </td>
                    <td className="cs-program-what">{editable ? <input className="cs-program-input" value={r.what || ''} placeholder="Hair & make-up, first setup, lunch…" onChange={(e) => setProgramRow(i, 'what', e.target.value)} aria-label="Description" /> : r.what}</td>
                    {editable && (
                      <td className="row-actions no-print nowrap">
                        <button onClick={() => moveProgram(i, -1)} disabled={i === 0} aria-label="Earlier">↑</button>
                        <button onClick={() => moveProgram(i, 1)} disabled={i === program.length - 1} aria-label="Later">↓</button>
                        <button onClick={() => setProgram(program.filter((_, j) => j !== i))} aria-label="Remove">×</button>
                      </td>
                    )}
                  </tr>
                ))}
                {editable && !program.length && <tr><td colSpan={3} className="muted">Nothing yet. Add a row for each part of the day.</td></tr>}
              </tbody>
            </table>
            {editable && <div className="no-print cs-program-add"><Button size="sm" onClick={() => setProgram([...program, { id: uid(), from: '', to: '', what: '' }])}>Add a row</Button></div>}
          </section>
        )
      case 'departments':
        return Object.keys(departments).length > 0 ? (
          <section>
            {h}
            <div className="dept-grid">
              {Object.entries(departments).map(([cat, items]) => (
                <div key={cat}>
                  <strong>{cat}</strong>
                  <div className="small">{items.join(', ')}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null
      case 'crew':
        return (
          <section>
            {h}
            <div className="dept-grid">
              {crewRows.map((c) => (
                <div key={c.key} className="cs-crew">
                  <strong>{c.name}</strong>
                  {editable && !c.extra && <button className="cs-x no-print" onClick={() => hidePerson(c.key, true)} title="Leave out of this day">×</button>}
                  <div className="small muted">
                    {c.role || c.dept} · call {editable && !c.extra ? <input className="cs-time" value={calls[c.key] ?? ''} placeholder={c.auto} onChange={(e) => setCall(c.key, e.target.value)} aria-label={`Call for ${c.name}`} /> : c.call}
                    {phoneOf(c.phone) ? ` · ${c.phone}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      default:
        if (!b.custom) return null
        if (!editable && !customText(b)) return null
        return (
          <section>
            {h}
            {editable
              ? <textarea className="cs-custom-edit" rows={3} value={sheet.custom?.[b.key] ?? ''} placeholder={b.text || 'Anything you want on the sheet'} onChange={(e) => setCustom(b.key, e.target.value)} />
              : <p className="cs-custom">{customText(b)}</p>}
          </section>
        )
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
          {editable && mode === 'sheet' && <Button variant={designing ? 'primary' : 'default'} onClick={() => setDesigning(!designing)}>{designing ? 'Done' : 'Customise'}</Button>}
          {mode === 'sheet' && <Button variant={preview ? 'primary' : 'default'} onClick={() => setPreview(!preview)}>{preview ? 'Hide link preview' : 'Link preview'}</Button>}
          {canShare && <Button onClick={makeShare}>Share link</Button>}
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
            <LinkName
              key={share.ref}
              workspaceId={state.workspace.id} shareRef={share.ref} url={share.url} makeUrl={shareUrl}
              suggestion={`${nameParts(project).shortTitle || project.title} day ${dayIndex + 1}`}
              hasCode={!!share.pin}
              onRenamed={(url) => { setShare({ ...share, url }); toast('Link renamed', 'ok') }}
            />
            {share.pin && (
              <p className="share-pin">Access code <b>{share.pin}</b> <span className="muted small">· the page shows nothing without it. It goes out with the link below.</span></p>
            )}
            {share.pinError && <p className="error small">{share.pinError}</p>}
            <div className="row-actions wrap">
              <a className="btn btn-primary" href={waShareLink(`${title} · Call sheet Day ${dayIndex + 1} · ${day.date} · call ${day.callTime}\n${share.url}${share.pin ? `\nCode: ${share.pin}` : ''}`)} target="_blank" rel="noreferrer">Send on WhatsApp</a>
              <a className="btn btn-ghost" href={mailLink({ bcc: emails, subject, body: `${subject}\n\n${share.url}${share.pin ? `\nCode: ${share.pin}` : ''}` })}>Mail</a>
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
                  <td><div className="person-cell">{pp.photos?.[0]?.thumb && <img className="avatar-img" src={pp.photos[0].thumb} alt="" />}<strong>{pp.name}</strong></div></td>
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

      {designing && editable && mode === 'sheet' && (
        <CallSheetDesigner
          layout={layout} setLayout={setLayout}
          sheet={sheet} setSheet={setSheet} day={day} setDay={setDay} loc={loc}
          hiddenPeople={hiddenPeople} onShowPerson={(k) => hidePerson(k, false)}
          hasOwn={!!project.callsheetLayout} isAdmin={user?.role === 'admin'}
          onMakeDefault={makeDefault} onReset={resetLayout}
        />
      )}

      <div className={preview && mode === 'sheet' ? 'cs-with-preview' : undefined}>
      {preview && mode === 'sheet' && (
        <aside className="cs-preview no-print">
          <div className="cs-preview-head"><strong>The link on a phone</strong><span className="muted small">Live: changes show here at once. Press Share link to send them.</span></div>
          <div className={`cs-phone pv-${layout.look.linkTheme || 'light'}`}>
            <CallSheetLinkView data={linkData()} />
          </div>
        </aside>
      )}
      <article
        className={`sheet cs${layout.look.header === 'centred' ? ' cs-centred' : ''}${accent ? ' cs-accented' : ''}`}
        style={{ ...(accent ? { '--cs-accent': accent } : {}), ...(ZOOM[layout.look.size] !== 1 ? { zoom: ZOOM[layout.look.size] } : {}) }}
        hidden={mode !== 'sheet'}
      >
        <header className="cs-head">
          <div className="cs-company">
            <div className="cs-brand">{state.settings.logo ? <img className="cs-logo" src={state.settings.logo} alt="" /> : <span className="cs-mark" />}{state.workspace.name}</div>
            {state.settings.companyAddress && <div className="muted small cs-addr">{state.settings.companyAddress}</div>}
            {show('keycrew') && (
              <dl className="cs-kv">
                {project.producer && (<><dt>Producer</dt><dd>{project.producer}</dd></>)}
                {crew.filter((c) => /1st AD|assistant director|production manager|UPM|line producer|DoP|photography/i.test(c.role || '')).slice(0, 4).map((c) => (
                  <span key={c.id} className="cs-kv-row"><dt>{c.role}</dt><dd>{c.name}{c.phone && show('phones') ? <span className="muted"> {c.phone}</span> : null}</dd></span>
                ))}
              </dl>
            )}
          </div>
          <div className="cs-center">
            {project.coverThumb && show('cover') ? <img className="cs-key" src={project.coverThumb} alt="" /> : null}
            <h1>{title}</h1>
            <div className="cs-call-label">{labelOf(layout, 'call')}</div>
            <div className="cs-call-time">{day.callTime}</div>
            {!show('tagline') ? null : editable ? (
              <textarea className="cs-tagline" rows={3} value={sheet.tagline || ''} onChange={(e) => setSheet('tagline', e.target.value)} placeholder={csd.tagline || 'One line for everyone: safety first, bring a jacket, no smoking on set.'} />
            ) : (sheet.tagline || csd.tagline) ? <p className="cs-tagline-text">{sheet.tagline || csd.tagline}</p> : null}
          </div>
          <div className="cs-side">
            <div className="cs-day">Day {dayIndex + 1} of {days.length}</div>
            <div className="cs-date">{new Date(day.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</div>
            {(showWx || showSun) && (
              <div className="cs-wx">
                {!showWx ? null : wx ? (
                  <>
                    <div className="cs-temp"><span className="cs-sun-ico">☀</span> {wx.tmax}° <span className="muted">/ {wx.tmin}°</span></div>
                    <div className="muted small"><em>{wx.summary}{wx.rain != null ? `, rain ${wx.rain}%` : ''}</em></div>
                  </>
                ) : (
                  <div className="muted small no-print">No forecast yet{editable ? <> · <button className="link" onClick={fetchWeather} disabled={busy}>{busy ? 'fetching…' : 'fetch'}</button></> : null}</div>
                )}
                {showSun && sun && <div className="small"><strong>Sunrise</strong> {wx?.sunrise || sun.sunrise} · <strong>Sunset</strong> {wx?.sunset || sun.sunset}</div>}
              </div>
            )}
            {(show('shooting') || show('lunch') || show('wrap')) && <dl className="cs-times">
              {show('shooting') && <><dt>{labelOf(layout, 'shooting')}</dt><dd>{editable ? <input className="cs-time" value={sheet.shootingCall ?? ''} placeholder={day.callTime} onChange={(e) => setSheet('shootingCall', e.target.value)} /> : sheet.shootingCall || day.callTime}</dd></>}
              {show('lunch') && <><dt>{labelOf(layout, 'lunch')}</dt><dd>{editable ? <input className="cs-time" value={sheet.lunch ?? ''} placeholder={lunchDefault || '13:00'} onChange={(e) => setSheet('lunch', e.target.value)} /> : sheet.lunch || lunchDefault || ''}</dd></>}
              {show('wrap') && <><dt>{labelOf(layout, 'wrap')}</dt><dd>{day.wrapTime}</dd></>}
            </dl>}
          </div>
        </header>

        {layout.blocks.filter((b) => b.sheet).map((b) => <Fragment key={b.key}>{renderBlock(b)}</Fragment>)}

        {csd.footer && <p className="cs-footer">{csd.footer}</p>}
        {editable && (
          <p className="fineprint no-print">Edits here are saved automatically to this day's call sheet.</p>
        )}
      </article>
      </div>
    </div>
  )
}
