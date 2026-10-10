import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Textarea, useIsMobile, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { useStore } from '../../lib/store.jsx'
import { formatPages } from '../../lib/breakdown.js'
import { addDays, fmtLong } from '../../lib/dates.js'
import { ATHENS, coordsFromText, forecast, geocode, sunTimes } from '../../lib/sun.js'
import { callSheetText, mailLink, personalCallText, shortenWithBitly, waLink, waShareLink } from '../../lib/share.js'
import { Modal } from '../../components/ui.jsx'
import { ensurePin, publishShare, removeShare, shareUrl } from '../../lib/shares.js'
import LinkName from '../../components/LinkName.jsx'
import { nameParts } from '../../lib/projectName.js'
import { callsheetDefaults, uid, useCurrentUser } from '../../lib/store.jsx'
import CallSheetDesigner from '../../components/CallSheetDesigner.jsx'
import { CallSheetLinkView } from '../PublicCallSheet.jsx'
import { ZOOM, accentOf, labelOf, layoutOf, linkLayout, normalizeLayout, storedLayout, titleOf } from '../../lib/callsheetLayout.js'
import { Grip, moveItem, useDragSort } from '../../components/DragSort.jsx'

function addMinutes(hhmm, mins) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m + (mins || 0)
  const hh = Math.floor(((t % 1440) + 1440) % 1440 / 60)
  const mm = ((t % 60) + 60) % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/* `openDay` (a shoot day id) brings that day's sheet up ready to edit: New call sheet sets it
   after making the day. `onNew` puts the New call sheet button at the end of the day tabs. */
// each ordino is named by its date (Alex, 10 Oct), Day 1 / Day 2 only when a date is missing
const dayLabel = (d, i) => (d.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : `Day ${i + 1}`)

export default function CallSheets({ openDay = '', onNew, linkOnly = false }) {
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
  // Ordino & Program (Alex, 10 Oct): the template on the left and the link as it looks on a phone beside
  // it, always, on a computer; on a phone the template, with Preview to see the link full screen
  const mobile = useIsMobile()
  const [mPreview, setMPreview] = useState(false)
  const preview = !mobile || mPreview
  const user = useCurrentUser()
  const csd = callsheetDefaults(state)
  const canShare = true
  const toast = useToast()
  const day = days.find((d) => d.id === sel) || days[0]
  const editable = canEdit('callsheets')
  // The sheet opens the way the crew will see it; Edit switches the fields on. Remembered per device.
  // the ordino is a template, always open for whoever may edit it
  const editing = editable
  useEffect(() => {
    if (!openDay) return
    setSel(openDay)
    setMode('sheet')
  }, [openDay]) // eslint-disable-line react-hooks/exhaustive-deps
  // Printed on every call sheet and carried into the shared link. Both live in Settings.
  const emergency = (state.settings.emergency || []).filter((n) => n && n.number)
  const prodContacts = (state.settings.productionContacts || []).filter((c) => c && (c.role || c.name))
  // Default lunch time: the day's call plus the company default. Declared after `day`, which it reads.
  const lunchDefault = (() => { const m = /^(\d{1,2}):(\d{2})$/.exec(day?.callTime || ''); if (!m || !csd.lunchAfterHours) return ''; const t = (Number(m[1]) * 60 + Number(m[2]) + Number(csd.lunchAfterHours) * 60) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` })()

  if (!days.length) {
    return (
      <Empty title="No call sheets yet" action={editable && onNew && <Button variant="primary" onClick={onNew}>New call sheet</Button>}>
        A call sheet needs only a date and a call time. Scenes from the <Link to="../schedule">schedule</Link> are optional.
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
  // group calls and the programme are put in order by dragging their ⋮⋮ (Alex, 10 Oct: no more arrows)
  const sort = useDragSort((from, to, group) => (group === 'groups' ? setGroups(moveItem(groupCalls, from, to)) : setProgram(moveItem(program, from, to))))
  const USUAL_GROUPS = ['Production crew', 'Beauty crew', 'Artist', 'Dancers', 'Cast', 'Model']
  const setProgram = (list) => setSheet('program', list)
  const setProgramRow = (i, k, v) => setProgram(program.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
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
  /* The date is changed here, on the ordino (Alex, 11 Oct). Everything filled in moves with it, and so
     does the project's shoot day in the Calendar, so the old date does not come back as an empty
     ordino (Ordino & Program makes a day for every Calendar date). A date inside a longer shoot is
     cut out of it and the new date added on its own. */
  const moveDate = (to) => {
    const from = day.date
    if (!to || to === from) return
    if (days.some((x) => x.id !== day.id && x.date === to)) { toast('There is already an ordino on that date.', 'error'); return }
    setDay('date', to)
    update((s) => {
      const lastOf = (e) => (e.endDate && e.endDate > e.date ? e.endDate : e.date)
      const covers = (e, d) => e.date <= d && d <= lastOf(e)
      const shoots = s.events.filter((e) => e.projectId === project.id && e.type === 'shoot' && e.date)
      const ev = from && shoots.find((e) => covers(e, from))
      const taken = shoots.some((e) => e !== ev && covers(e, to))
      if (ev && ev.date === lastOf(ev)) {
        if (taken) s.events = s.events.filter((e) => e !== ev)
        else { ev.date = to; if (ev.endDate) ev.endDate = to }
        return s
      }
      if (ev) {
        const last = lastOf(ev)
        if (from === ev.date) ev.date = addDays(from, 1)
        else if (from === last) ev.endDate = addDays(from, -1)
        else { s.events.push({ ...ev, id: uid(), date: addDays(from, 1), endDate: last }); ev.endDate = addDays(from, -1) }
      }
      if (!taken && !(ev && covers(ev, to))) {
        s.events.push({ id: uid(), projectId: project.id, type: 'shoot', title: ev?.title || `Shoot day · ${project.title}`, date: to, start: ev?.start || '', end: ev?.end || '', locationText: ev?.locationText || '', notes: '' })
      }
      return s
    })
  }
  /* Deleting a day (Alex, 11 Oct). Its date leaves the Calendar too (a one-day shoot goes, a longer one
     shrinks or splits around it), or Ordino & Program would make it again empty; its share link stops
     opening; scenes put on it go back to not scheduled. ordinoDeleted stops the project's start date
     from bringing a day back when the last one is deleted. */
  const removeDay = () => {
    const gone = day
    const from = gone.date
    edit((p) => {
      p.shootingDays = (p.shootingDays || []).filter((x) => x.id !== gone.id)
      ;(p.scenes || []).forEach((sc) => { if (sc.dayId === gone.id) sc.dayId = '' })
      p.ordinoDeleted = true
    })
    if (from) update((s) => {
      const lastOf = (e) => (e.endDate && e.endDate > e.date ? e.endDate : e.date)
      const ev = s.events.find((e) => e.projectId === project.id && e.type === 'shoot' && e.date && e.date <= from && from <= lastOf(e))
      if (!ev) return s
      const last = lastOf(ev)
      if (ev.date === last) s.events = s.events.filter((e) => e !== ev)
      else if (from === ev.date) ev.date = addDays(from, 1)
      else if (from === last) ev.endDate = addDays(from, -1)
      else { s.events.push({ ...ev, id: uid(), date: addDays(from, 1), endDate: last }); ev.endDate = addDays(from, -1) }
      return s
    })
    removeShare({ workspaceId: state.workspace.id, ref: `callsheet:${project.id}:${gone.id}` }).catch(() => {})
    setSel(days.find((x) => x.id !== gone.id)?.id || '')
    toast(`${dayLabel(gone, days.indexOf(gone))} deleted`, 'ok')
  }
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
        return (sheet.notes || editing) ? (
          <>
            {named(b) && h}
            <div className="cs-note">
              <span className="cs-pin">📌</span>
              {editing ? (
                <textarea rows={2} value={sheet.notes || ''} onChange={(e) => setSheet('notes', e.target.value)} placeholder="Parking, catering, safety, permits, transport. Everyone reads this one." />
              ) : <p>{sheet.notes}</p>}
            </div>
          </>
        ) : null
      case 'location': {
        // while reading, an empty Parking or Hospital column is left out rather than shown as a dash
        const showParking = show('parking') && (editing || sheet.parking || csd.parking)
        const showHospital = show('hospital') && (editing || sheet.weather || csd.hospital)
        return (
          <section>
            {h}
            <div className="cs-locgrid" style={{ '--cs-loc-cols': 1 + (showParking ? 1 : 0) + (showHospital ? 1 : 0) }}>
              <div>
                <div className="cs-loc-h">Set location</div>
                {/* A call sheet can now be started without going through the Schedule, so its
                    location is set right here too: one from the project's locations, or a name
                    and address typed for this sheet alone. */}
                {editing && (
                  <div className="cs-loc-edit no-print">
                    <select className="input select" value={day.locationId || ''} onChange={(e) => setDay('locationId', e.target.value)}>
                      <option value="">{project.locations.length ? 'Pick a location' : 'No locations in this project'}</option>
                      {project.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <input className="input" value={sheet.locName || ''} onChange={(e) => setSheet('locName', e.target.value)} placeholder={loc?.name || 'Or type a name'} />
                    <input className="input" value={sheet.locAddress || ''} onChange={(e) => setSheet('locAddress', e.target.value)} placeholder={loc?.address || 'and an address'} />
                  </div>
                )}
                {locView ? (
                  <>
                    <strong className="cs-loc-name">{locView.name}</strong>
                    <div>{locView.address}</div>
                    {(locView.contact || phoneOf(locView.phone)) && <div className="muted small">{[locView.contact, phoneOf(locView.phone)].filter(Boolean).join(' · ')}</div>}
                    {locView.address && <a className="link no-print small" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locView.address)}`} target="_blank" rel="noreferrer">Open in Google Maps</a>}
                  </>
                ) : !editing && <span className="muted">No location yet.</span>}
              </div>
              {showParking && <div>
                <div className="cs-loc-h">Parking</div>
                {editing ? <textarea rows={3} value={sheet.parking || ''} onChange={(e) => setSheet('parking', e.target.value)} placeholder={csd.parking || 'Where, how many cars, who unloads where'} /> : <div>{sheet.parking || csd.parking || '–'}</div>}
              </div>}
              {showHospital && <div>
                <div className="cs-loc-h">Nearest hospital</div>
                {editing ? <textarea rows={3} value={sheet.weather || ''} onChange={(e) => setSheet('weather', e.target.value)} placeholder={csd.hospital || 'Name, address, phone'} /> : <div>{sheet.weather || csd.hospital || '–'}</div>}
              </div>}
            </div>
            {wx && showWx && <div className="muted small no-print">{wx.place} · forecast from open-meteo · {editing && <button className="link" onClick={fetchWeather} disabled={busy}>{busy ? 'fetching…' : 'refresh'}</button>}</div>}
          </section>
        )
      }
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
                      {editing ? (
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
              <thead><tr><th>Character</th><th>Actor</th>{show('phones') && <th>Phone</th>}<th>Call</th>{editing && <th className="no-print" />}</tr></thead>
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
                    <td>{editing && !r.extra ? <input className="cs-time" value={calls[r.key] ?? ''} placeholder={r.auto} onChange={(e) => setCall(r.key, e.target.value)} aria-label={`Call for ${r.actor?.name || r.character}`} /> : r.call}</td>
                    {editing && <td className="no-print row-actions">{!r.extra && <button onClick={() => hidePerson(r.key, true)} title="Leave out of this day">×</button>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      case 'groupcalls':
        if (!editing && !groupRows.length) return null
        return (
          <section>
            {h}
            <ul className="plain cs-groups">
              {(editing ? groupCalls : groupRows).map((r, i) => (
                <li key={r.id} {...(editing ? sort.row('groups', i) : {})} className={editing ? sort.cls('groups', i) : undefined}>
                  {editing ? <input className="cs-program-input cs-group-who" value={r.who || ''} placeholder="Production crew" onChange={(e) => setGroupRow(i, 'who', e.target.value)} aria-label="Who" /> : <span className="cs-group-who">{r.who}</span>}
                  {editing ? <input className="cs-time" value={r.time || ''} placeholder={day.callTime || '10:00'} onChange={(e) => setGroupRow(i, 'time', e.target.value)} aria-label={`Call for ${r.who || 'this group'}`} /> : <strong className="cs-group-time">{r.time}</strong>}
                  {editing && (
                    <span className="row-actions no-print">
                      <Grip {...sort.grip('groups', i)} />
                      <button onClick={() => setGroups(groupCalls.filter((_, j) => j !== i))} aria-label="Remove">×</button>
                    </span>
                  )}
                </li>
              ))}
              {editing && !groupCalls.length && <li className="muted">Nothing yet. One row per group: production crew, beauty, artist, dancers…</li>}
            </ul>
            {editing && (
              <div className="no-print cs-program-add row-actions wrap">
                <Button size="sm" onClick={() => setGroups([...groupCalls, { id: uid(), who: '', time: '' }])}>Add a group</Button>
                {!groupCalls.length && <Button size="sm" variant="ghost" onClick={() => setGroups(USUAL_GROUPS.map((who) => ({ id: uid(), who, time: '' })))}>Add the usual groups</Button>}
              </div>
            )}
          </section>
        )
      case 'program':
        if (!editing && !programRows.length) return null
        return (
          <section>
            {h}
            <table className="table cs-program">
              <thead><tr><th>Time</th><th>Description</th>{editing && <th className="no-print" />}</tr></thead>
              <tbody>
                {(editing ? program : programRows).map((r, i) => (
                  <tr key={r.id} {...(editing ? sort.row('program', i) : {})} className={editing ? sort.cls('program', i) : undefined}>
                    <td className="nowrap cs-scene-time">
                      {editing ? (
                        <span className="cs-range"><input className="cs-time" value={r.from || ''} placeholder="09:00" onChange={(e) => setProgramRow(i, 'from', e.target.value)} aria-label="From" /> – <input className="cs-time" value={r.to || ''} placeholder="end" onChange={(e) => setProgramRow(i, 'to', e.target.value)} aria-label="To" /></span>
                      ) : `${r.from || ''}${r.to ? ` – ${r.to}` : ''}`}
                    </td>
                    <td className="cs-program-what">{editing ? <input className="cs-program-input" value={r.what || ''} placeholder="Hair & make-up, first setup, lunch…" onChange={(e) => setProgramRow(i, 'what', e.target.value)} aria-label="Description" /> : r.what}</td>
                    {editing && (
                      <td className="row-actions no-print nowrap">
                        <Grip {...sort.grip('program', i)} />
                        <button onClick={() => setProgram(program.filter((_, j) => j !== i))} aria-label="Remove">×</button>
                      </td>
                    )}
                  </tr>
                ))}
                {editing && !program.length && <tr><td colSpan={3} className="muted">Nothing yet. Add a row for each part of the day.</td></tr>}
              </tbody>
            </table>
            {editing && <div className="no-print cs-program-add"><Button size="sm" onClick={() => setProgram([...program, { id: uid(), from: '', to: '', what: '' }])}>Add a row</Button></div>}
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
                  {editing && !c.extra && <button className="cs-x no-print" onClick={() => hidePerson(c.key, true)} title="Leave out of this day">×</button>}
                  <div className="small muted">
                    {c.role || c.dept} · call {editing && !c.extra ? <input className="cs-time" value={calls[c.key] ?? ''} placeholder={c.auto} onChange={(e) => setCall(c.key, e.target.value)} aria-label={`Call for ${c.name}`} /> : c.call}
                    {phoneOf(c.phone) ? ` · ${c.phone}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      default:
        if (!b.custom) return null
        if (!editing && !customText(b)) return null
        return (
          <section>
            {h}
            {editing
              ? <textarea className="cs-custom-edit" rows={3} value={sheet.custom?.[b.key] ?? ''} placeholder={b.text || 'Anything you want on the sheet'} onChange={(e) => setCustom(b.key, e.target.value)} />
              : <p className="cs-custom">{customText(b)}</p>}
          </section>
        )
    }
  }

  /* Someone with Call sheets on view sees only what the crew get (Alex, 10 Oct): the sheet as its
     link looks on a phone, with the days to pick from when there are several, and nothing to edit. */
  if (linkOnly) {
    return (
      <div className="callsheets cs-link-only">
        {days.length > 1 && (
          <div className="toolbar no-print">
            <div className="segmented">
              {days.map((d, i) => <button key={d.id} className={d.id === day.id ? 'on' : ''} onClick={() => setSel(d.id)}>{dayLabel(d, i)}</button>)}
            </div>
          </div>
        )}
        {/* the whole sheet, no phone frame and no scroll box of its own (Alex, 10 Oct) */}
        <div className={`cs-linkpage pv-${layout.look.linkTheme || 'light'}`}>
          <CallSheetLinkView data={linkData()} />
        </div>
      </div>
    )
  }

  /* The ordino as a form (Alex, 10 Oct: "I only care about On the phone: put the fields to fill in there
     and the preview on the right"). Every field writes where the sheet always kept it, so the link,
     Send message and older ordinos read the same data; what each part shows on the link is still
     chosen in Customise. */
  // one row per person with their call, crew and cast apart, as the link lists them
  const crewCalls = crewRows.map((c) => ({ key: c.key, name: c.name, role: c.role || c.dept || 'Crew', call: c.call, extra: c.extra }))
  const castCalls = castRows.map((r) => ({ key: r.key, name: r.actor?.name || r.character, role: r.character || 'Cast', call: r.call, extra: r.extra }))
  const callList = (list) => (
    <>
      {list.map((pp) => (
        <div key={pp.key} className="ordino-row ordino-person">
          <span className="ordino-who"><strong>{pp.name}</strong><span className="muted small">{pp.role}</span></span>
          {!pp.extra && <Input inputMode="numeric" placeholder="00:00" className="ordino-time" value={pp.call || ''} onChange={(e) => setCall(pp.key, e.target.value)} aria-label={`Call for ${pp.name}`} />}
          {!pp.extra && <button type="button" className="ordino-x" onClick={() => hidePerson(pp.key, true)} aria-label="Leave out of this ordino" title="Leave out of this ordino">×</button>}
        </div>
      ))}
      {!list.length && <p className="muted small">Nobody yet. People come from the project&#39;s Project Database.</p>}
    </>
  )
  // what each part of the link takes, in the link's own order (the order set in Customise)
  const fields = {
    note: <Textarea rows={3} value={sheet.notes || ''} placeholder="Parking, catering, safety, permits, transport. Everyone reads this one." onChange={(e) => setSheet('notes', e.target.value)} />,
    groupcalls: (
      <>
        {groupCalls.map((r, i) => (
          <div key={i} className="ordino-row">
            <Input value={r.who || ''} placeholder="Production crew" onChange={(e) => setGroupRow(i, 'who', e.target.value)} aria-label="Group" />
            <Input inputMode="numeric" placeholder="00:00" className="ordino-time" value={r.time || ''} onChange={(e) => setGroupRow(i, 'time', e.target.value)} aria-label="Call" />
            <button type="button" className="ordino-x" onClick={() => setGroups(groupCalls.filter((_, j) => j !== i))} aria-label="Remove">×</button>
          </div>
        ))}
        <div className="ordino-adds">
          <button type="button" className="link small" onClick={() => setGroups([...groupCalls, { who: '', time: '' }])}>+ Add a group</button>
          {!groupCalls.length && <button type="button" className="link small" onClick={() => setGroups(USUAL_GROUPS.map((who) => ({ who, time: '' })))}>Add the usual groups</button>}
        </div>
      </>
    ),
    location: (
      <>
        {project.locations.length > 0 && (
          <Field label="From the project">
            <select className="input select" value={day.locationId || ''} onChange={(e) => setDay('locationId', e.target.value)}>
              <option value="">None</option>
              {project.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
        )}
        <div className="row-2">
          <Field label="Name"><Input value={sheet.locName || ''} placeholder={loc?.name || 'Location name'} onChange={(e) => setSheet('locName', e.target.value)} /></Field>
          <Field label="Address"><Input value={sheet.locAddress || ''} placeholder={loc?.address || 'Street, area'} onChange={(e) => setSheet('locAddress', e.target.value)} /></Field>
        </div>
        <div className="row-2">
          <Field label={labelOf(layout, 'parking')}><Textarea rows={2} value={sheet.parking || ''} placeholder={csd.parking || 'Where, how many cars, who unloads where'} onChange={(e) => setSheet('parking', e.target.value)} /></Field>
          <Field label={labelOf(layout, 'hospital')}><Textarea rows={2} value={sheet.weather || ''} placeholder={csd.hospital || 'Name, address, phone'} onChange={(e) => setSheet('weather', e.target.value)} /></Field>
        </div>
      </>
    ),
    program: (
      <>
        {program.map((r, i) => (
          <div key={i} className="ordino-row ordino-prog">
            <Input inputMode="numeric" placeholder="00:00" className="ordino-time" value={r.from || ''} onChange={(e) => setProgramRow(i, 'from', e.target.value)} aria-label="From" />
            <Input inputMode="numeric" placeholder="00:00" className="ordino-time" value={r.to || ''} onChange={(e) => setProgramRow(i, 'to', e.target.value)} aria-label="To" />
            <Input value={r.what || ''} placeholder="What happens" onChange={(e) => setProgramRow(i, 'what', e.target.value)} aria-label="What" />
            <button type="button" className="ordino-x" onClick={() => setProgram(program.filter((_, j) => j !== i))} aria-label="Remove">×</button>
          </div>
        ))}
        <div className="ordino-adds"><button type="button" className="link small" onClick={() => setProgram([...program, { from: '', to: '', what: '' }])}>+ Add a row</button></div>
      </>
    ),
    contacts: <p className="muted small">The emergency numbers and the production contacts come from Settings &gt; Call sheets, the same on every ordino.</p>,
    cast: callList(castCalls),
    crew: callList(crewCalls),
  }
  const linkBlocks = layout.blocks.filter((b) => b.link && (b.custom || fields[b.key]))
  const ordinoForm = (
    <div className="ordino-form">
      <section className="ordino-sec">
        <h3><span className="ordino-n">1</span>The day</h3>
        <Field label="Date"><Input type="date" value={day.date || ''} onChange={(e) => moveDate(e.target.value)} /></Field>
        <Field label="Title"><Input value={sheet.title || ''} placeholder={project.title} onChange={(e) => setSheet('title', e.target.value)} /></Field>
        <div className="ordino-times">
          <Field label={labelOf(layout, 'call')}><Input inputMode="numeric" placeholder="00:00" value={day.callTime || ''} onChange={(e) => setDay('callTime', e.target.value)} /></Field>
          <Field label={labelOf(layout, 'shooting')}><Input inputMode="numeric" placeholder="00:00" value={sheet.shootingCall || ''} onChange={(e) => setSheet('shootingCall', e.target.value)} /></Field>
          <Field label={labelOf(layout, 'lunch')}><Input inputMode="numeric" placeholder="00:00" value={sheet.lunch || lunchDefault || ''} onChange={(e) => setSheet('lunch', e.target.value)} /></Field>
          <Field label={labelOf(layout, 'wrap')}><Input inputMode="numeric" placeholder="00:00" value={day.wrapTime || ''} onChange={(e) => setDay('wrapTime', e.target.value)} /></Field>
        </div>
        <Field label="One line for everyone, under the call"><Textarea rows={2} value={sheet.tagline || ''} placeholder={csd.tagline || 'Safety first, bring a jacket, no smoking on set.'} onChange={(e) => setSheet('tagline', e.target.value)} /></Field>
      </section>
      {linkBlocks.map((b, i) => (
        <section key={b.key} className="ordino-sec">
          <h3><span className="ordino-n">{i + 2}</span>{titleOf(layout, b)}</h3>
          {b.custom ? <Textarea rows={3} value={customText(b)} onChange={(e) => setCustom(b.key, e.target.value)} /> : fields[b.key]}
        </section>
      ))}
      {hiddenPeople.length > 0 && (
        <div className="ordino-adds">
          <span className="muted small">Left out of this ordino:</span>
          {hiddenPeople.map((h) => <button key={h.key} type="button" className="link small" onClick={() => hidePerson(h.key, false)}>+ {h.name}</button>)}
        </div>
      )}
      <p className="muted small">Saved as you type. Customise chooses which parts the link shows and in what order.</p>
    </div>
  )

  return (
    <div className="callsheets">
      <div className="toolbar no-print">
        <div className="cs-days">
          <div className="segmented">
            {days.map((d, i) => (
              <button key={d.id} className={d.id === day.id ? 'on' : ''} onClick={() => setSel(d.id)}>
                {dayLabel(d, i)}
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar-actions">
          {editable && <Button className={designing ? 'on' : ''} onClick={() => setDesigning(!designing)}>{designing ? 'Close Customise' : 'Customise'}</Button>}
          {mobile && <Button className={mPreview ? 'on' : ''} onClick={() => setMPreview(!mPreview)}>{mPreview ? 'Back to the ordino' : 'Preview'}</Button>}
          <Button onClick={() => setSend(true)}>Send message</Button>
          {canShare && <Button variant="primary" onClick={makeShare}>Share link</Button>}
          {editable && <Confirm onConfirm={removeDay} label="Delete day" />}
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
              <Button variant="ghost" onClick={() => shortenWithBitly(share.url, toast)} title="Opens bit.ly with the link copied, for a short address of your own">Shorten with bit.ly</Button>
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
          <div className="cs-preview-head"><strong>On the phone</strong><span className="muted small">What the crew see. Changes show here at once; Share link sends it.</span></div>
          <div className={`cs-phone pv-${layout.look.linkTheme || 'light'}`}>
            <CallSheetLinkView data={linkData()} />
          </div>
        </aside>
      )}
      {!(mobile && mPreview) && ordinoForm}
      </div>
    </div>
  )
}
