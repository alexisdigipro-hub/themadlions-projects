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
  // Production contacts: the same on every ordino link, kept in Settings > Ordino. (The emergency
  // numbers went, Alex 11 Oct.)
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
  // the crew are no longer on the ordino (Alex, 11 Oct): not in the form, the link or the messages;
  // crewRows is only read by the old sheet renderer; the link's key crew come from the project's crew
  const hiddenPeople = castAll.filter((r) => hidden[r.key]).map((r) => ({ key: r.key, name: r.actor?.name || r.name || r.character }))
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
  const fullText = callSheetText({ project: titled, day, dayIndex, dayCount: days.length, scenes: [], loc: locView, cast: [], crew: [], sheet, extra: notes })
  // no people on the ordino any more (Alex, 11 Oct), so no personal messages and nobody to Bcc
  const emails = []
  const subject = `${title} · Call sheet Day ${dayIndex + 1} · ${day.date} · call ${day.callTime}`
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('Copied', 'ok') } catch { toast('Could not copy', 'error') }
  }
  // What the link carries, built from the sheet as it is now: used to publish, and live by the
  // phone preview next to the sheet.
  const linkData = () => {
    const on = (k) => layout.blocks.some((b) => b.key === k && b.link)
    const linkShow = (k) => layout.details[k].link
    // Only what the link shows goes into it: a section switched off for the link is left out of
    // the snapshot, not just hidden, since anyone holding the link can read the snapshot. Cast, crew,
    // production, scenes and department requirements are no longer on the ordino (Alex, 11 Oct).
    return {
      project: { title, color: project.color, cover: linkShow('cover') ? project.coverThumb || '' : '', category: project.category },
      company: { name: state.workspace.name, address: state.settings.companyAddress || '', logo: state.settings.logo || '' },
      day: { index: dayIndex + 1, count: days.length, date: day.date, callTime: day.callTime, wrapTime: day.wrapTime },
      expiresAt: Number(state.settings.shareExpiryDays) > 0 ? new Date(new Date(day.date + 'T23:59:59').getTime() + Number(state.settings.shareExpiryDays) * 86400000).toISOString() : '',
      sheet: {
        // the line under the call, the break and the hospital have no switch in Customise any more
        // (Alex, 11 Oct): each shows when it is filled in, and leaving it empty keeps it off the link
        tagline: sheet.tagline || csd.tagline || '',
        notes: on('note') ? sheet.notes || '' : '',
        lunch: '', // the break and the wrap left the ordino (Alex, 11 Oct)
        parking: on('location') && linkShow('parking') ? sheet.parking || csd.parking || '' : '',
        hospital: on('location') ? sheet.weather || csd.hospital || '' : '',
        footer: csd.footer || '',
      },
      wx: wx && linkShow('weather') ? { tmax: wx.tmax, tmin: wx.tmin, summary: wx.summary, rain: wx.rain } : null,
      sun: sun && linkShow('sun') ? { sunrise: wx?.sunrise || sun.sunrise, sunset: wx?.sunset || sun.sunset } : null,
      loc: locView && on('location') ? { name: locView.name, address: locView.address, contact: locView.contact, phone: locView.phone || '' } : null,
      extraLocs: on('location') ? (sheet.extraLocs || []).filter((x) => (x.name || '').trim() || (x.address || '').trim()).map((x) => ({ name: x.name || '', address: x.address || '' })) : [],
      scenes: [],
      cast: [],
      crew: [],
      blocks: [],
      departments: [],
      groupCalls: on('groupcalls') ? groupRows.map((r) => ({ who: r.who || '', time: r.time || '' })) : [],
      program: on('program') ? programRows.map((r) => ({ from: r.from || '', to: r.to || '', what: r.what || '' })) : [],
      keyCrew: [],
      prodContacts: [],
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
  const extraLocs = sheet.extraLocs || []
  const setExtraLoc = (i, k, v) => setSheet('extraLocs', extraLocs.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
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

  // (the old printed sheet's renderer went, Alex 11 Oct: the ordino is the form and its link)

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
          <button type="button" className="ordino-pill" onClick={() => setGroups([...groupCalls, { who: '', time: '' }])}><b>+</b>Add a group</button>
          {!groupCalls.length && <button type="button" className="ordino-pill" onClick={() => setGroups(USUAL_GROUPS.map((who) => ({ who, time: '' })))}><b>≡</b>Add the usual groups</button>}
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
          <Field label="Who to ask on location"><Input value={sheet.locContact || ''} placeholder={loc?.contact || 'Name'} onChange={(e) => setSheet('locContact', e.target.value)} /></Field>
          <Field label="Their phone"><Input value={sheet.locPhone || ''} inputMode="tel" placeholder={loc?.phone || 'Phone'} onChange={(e) => setSheet('locPhone', e.target.value)} /></Field>
        </div>
        <div className="row-2">
          <Field label="Parking"><Textarea rows={2} value={sheet.parking || ''} placeholder={csd.parking || 'Where, how many cars, who unloads where'} onChange={(e) => setSheet('parking', e.target.value)} /></Field>
          <Field label="Nearest hospital"><Textarea rows={2} value={sheet.weather || ''} placeholder={csd.hospital || 'Name, address, phone'} onChange={(e) => setSheet('weather', e.target.value)} /></Field>
        </div>
        {/* more places that day, shown small at the foot of the location on the link (Alex, 11 Oct) */}
        <div className="ordino-extra">
          <span className="ordino-extra-h">Extra Locations</span>
          {extraLocs.map((x, i) => (
            <div key={i} className="ordino-row">
              <Input value={x.name || ''} placeholder="Name" onChange={(e) => setExtraLoc(i, 'name', e.target.value)} aria-label="Extra location name" />
              <Input value={x.address || ''} placeholder="Address" onChange={(e) => setExtraLoc(i, 'address', e.target.value)} aria-label="Extra location address" />
              <button type="button" className="ordino-x" onClick={() => setSheet('extraLocs', extraLocs.filter((_, j) => j !== i))} aria-label="Remove">×</button>
            </div>
          ))}
          <div className="ordino-adds">
            {/* one of the project's locations, name and address filled in (Alex, 11 Oct) */}
            {project.locations.length > 0 && (
              <select className="input select ordino-extra-pick" value="" onChange={(e) => { const l = project.locations.find((x) => x.id === e.target.value); if (l) setSheet('extraLocs', [...extraLocs, { locationId: l.id, name: l.name || '', address: l.address || '' }]) }} aria-label="Add one of the project's locations">
                <option value="">+ From the project</option>
                {project.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
            <button type="button" className="ordino-pill" onClick={() => setSheet('extraLocs', [...extraLocs, { name: '', address: '' }])}><b>+</b>Type a location</button>
          </div>
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
        <div className="ordino-adds"><button type="button" className="ordino-pill" onClick={() => setProgram([...program, { from: '', to: '', what: '' }])}><b>+</b>Add a row</button></div>
      </>
    ),
  }
  const linkBlocks = layout.blocks.filter((b) => b.link && (b.custom || fields[b.key]))
  const ordinoForm = (
    <div className="ordino-form">
      <section className="ordino-sec">
        <h3><span className="ordino-n">1</span>The day</h3>
        {/* date, call and title on one line (Alex, 11 Oct); no Break or Est. wrap any more */}
        <div className="ordino-day">
          <Field label="Date"><Input type="date" value={day.date || ''} onChange={(e) => moveDate(e.target.value)} /></Field>
          <Field label={labelOf(layout, 'call')}><Input inputMode="numeric" placeholder="00:00" value={day.callTime || ''} onChange={(e) => setDay('callTime', e.target.value)} /></Field>
          <Field label="Title"><Input value={sheet.title || ''} placeholder={project.title} onChange={(e) => setSheet('title', e.target.value)} /></Field>
        </div>
        <Field label="One line for everyone, under the call"><Textarea rows={2} value={sheet.tagline || ''} placeholder={csd.tagline || 'Safety first, bring a jacket, no smoking on set.'} onChange={(e) => setSheet('tagline', e.target.value)} /></Field>
      </section>
      {linkBlocks.map((b, i) => (
        <section key={b.key} className="ordino-sec">
          <h3><span className="ordino-n">{i + 2}</span>{titleOf(layout, b)}</h3>
          {b.custom ? <Textarea rows={3} value={customText(b)} onChange={(e) => setCustom(b.key, e.target.value)} /> : fields[b.key]}
        </section>
      ))}
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
          {mobile && <Button className={mPreview ? 'on' : ''} onClick={() => setMPreview(!mPreview)}>{mPreview ? 'Back to the ordino' : 'Preview'}</Button>}
          <Button onClick={() => setSend(true)}>Send message</Button>
          {canShare && <Button variant="primary" onClick={makeShare}>Share link</Button>}
          {editable && <Confirm onConfirm={removeDay} label="Delete day" className="ordino-del" />}
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
              <strong>The whole ordino</strong>
              <div className="muted small">One message with the call, the times, the location, the program and the notes. Paste it in the project group or send to anyone.</div>
            </div>
            <div className="row-actions">
              <a className="btn btn-primary btn-sm" href={waShareLink(fullText)} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="btn btn-ghost btn-sm" href={mailLink({ bcc: emails, subject, body: fullText.replace(/\*/g, '') })}>Mail{emails.length ? ` (${emails.length})` : ''}</a>
              <Button size="sm" variant="ghost" onClick={() => copy(fullText)}>Copy</Button>
            </div>
          </div>
          <p className="fineprint">Mail opens your mail app with the message ready to send.</p>
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


      <div className={preview && mode === 'sheet' ? 'cs-with-preview' : undefined}>
      {preview && mode === 'sheet' && (
        <aside className="cs-preview no-print">
          <div className="cs-preview-head"><span className="cs-live"><i />On the phone</span><span className="muted small">What the crew see, live. Share link sends it.</span></div>
          <div className={`cs-phone pv-${layout.look.linkTheme || 'light'}`}>
            <CallSheetLinkView data={linkData()} />
          </div>
        </aside>
      )}
      {/* Customise is a tab beside the ordino (Alex, 11 Oct), so the preview stays in view while the
          link's layout changes */}
      {!(mobile && mPreview) && (
        <div className="ordino-pane">
          {editable && mode === 'sheet' && (
            <div className="segmented ordino-tabs">
              <button className={!designing ? 'on' : ''} onClick={() => setDesigning(false)}>Ordino</button>
              <button className={designing ? 'on' : ''} onClick={() => setDesigning(true)}>Customise</button>
            </div>
          )}
          {designing && editable && mode === 'sheet' ? (
            <CallSheetDesigner
              layout={layout} setLayout={setLayout}
              hasOwn={!!project.callsheetLayout} isAdmin={user?.role === 'admin'}
              onMakeDefault={makeDefault} onReset={resetLayout}
            />
          ) : ordinoForm}
        </div>
      )}
      </div>
    </div>
  )
}
