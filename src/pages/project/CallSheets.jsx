import { useEffect, useState } from 'react'
import { Button, Empty, Field, Input, Modal, Textarea, useIsMobile, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { callsheetDefaults, uid, useCurrentUser, useStore } from '../../lib/store.jsx'
import { addDays } from '../../lib/dates.js'
import { ATHENS, coordsFromText, sunTimes } from '../../lib/sun.js'
import { mailLink, shortenWithBitly, waShareLink } from '../../lib/share.js'
import { ensurePin, publishShare, removeShare, shareUrl } from '../../lib/shares.js'
import LinkName from '../../components/LinkName.jsx'
import { nameParts } from '../../lib/projectName.js'
import CallSheetDesigner from '../../components/CallSheetDesigner.jsx'
import { CallSheetLinkView } from '../PublicCallSheet.jsx'
import { labelOf, layoutOf, linkLayout, normalizeLayout, titleOf } from '../../lib/callsheetLayout.js'

/* Ordino & Program (Alex, 10-11 Oct). Each ordino is one shoot day of the project (project.shootingDays,
   its fields in day.callSheet) and goes out as a link. On a computer the link as it looks on a phone
   sits on the left, live, and the ordino to fill in on the right, with Customise as a tab beside it;
   on a phone the form, with Preview for the link. What an ordino holds now: the day (date, general
   call, title, one line for everyone), Calls by group, Location (with extra locations), Program, the
   Note and the production's own sections. Cast, crew, production, scenes, department requirements,
   emergency numbers, shooting call, break, wrap, the printed sheet and Send message all went.

   `openDay` (a shoot day id) brings that day up: New call sheet sets it after making the day.
   `onNew` gives the empty state its New call sheet button. `linkOnly` is for people who may only
   view: the link as the crew get it, nothing to edit. */

// each ordino is named by its date (Alex, 10 Oct), Day 1 / Day 2 only when a date is missing
const dayLabel = (d, i) => (d.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : `Day ${i + 1}`)
const USUAL_GROUPS = ['Production crew', 'Beauty crew', 'Artist', 'Dancers', 'Cast', 'Model']
const lastOf = (e) => (e.endDate && e.endDate > e.date ? e.endDate : e.date)

export default function CallSheets({ openDay = '', onNew, linkOnly = false }) {
  const { project, edit, canEdit } = useProject()
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const mobile = useIsMobile()
  const csd = callsheetDefaults(state)
  const editable = canEdit('callsheets')
  const days = [...project.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
  const [sel, setSel] = useState(days[0]?.id || '')
  const [share, setShare] = useState(null) // { busy } | { url, pin, pinError, ref } | { error }
  const [designing, setDesigning] = useState(false) // the Customise tab
  const [mPreview, setMPreview] = useState(false) // a phone shows the link instead of the form
  const day = days.find((d) => d.id === sel) || days[0]
  useEffect(() => { if (openDay) setSel(openDay) }, [openDay])

  if (!days.length) {
    return (
      <Empty title="No ordino yet" action={editable && onNew && <Button variant="primary" onClick={onNew}>New call sheet</Button>}>
        An ordino needs only a date and a call time.
      </Empty>
    )
  }

  const dayIndex = days.indexOf(day)
  const sheet = day.callSheet || {}
  const layout = layoutOf(project, state)
  const title = sheet.title?.trim() || project.title
  const customText = (b) => sheet.custom?.[b.key] || b.text || ''
  const loc = project.locations.find((l) => l.id === day.locationId)
  const locView = loc || sheet.locName || sheet.locAddress
    ? { name: sheet.locName || loc?.name || '', address: sheet.locAddress || loc?.address || '', contact: sheet.locContact || loc?.contact || '', phone: sheet.locPhone || loc?.phone || '' }
    : null
  const groupCalls = sheet.groupCalls || [] // production crew 10:00, beauty 09:00…, typed per day
  const program = sheet.program || [] // times and what happens, typed per day
  const extraLocs = sheet.extraLocs || []
  // sunrise and sunset at the day's location (the city in its address, else Athens); the weather
  // shows only for an ordino whose forecast was fetched before (sheet.forecast)
  const coords = (loc?.lat && loc?.lon) ? { lat: Number(loc.lat), lon: Number(loc.lon) } : coordsFromText(loc?.address) || null
  const sun = sunTimes(day.date, coords?.lat ?? ATHENS.lat, coords?.lon ?? ATHENS.lon)
  const wx = sheet.forecast

  // What the link carries, built from the ordino as it is now: published by Share link and drawn
  // live by the preview. Only what the link shows goes in: anyone holding the link can read it.
  const linkData = () => {
    const on = (k) => layout.blocks.some((b) => b.key === k && b.link)
    const shows = (k) => !!layout.details[k]?.link
    return {
      project: { title, color: project.color, cover: shows('cover') ? project.coverThumb || '' : '', category: project.category },
      company: { name: state.workspace.name, address: state.settings.companyAddress || '', logo: state.settings.logo || '' },
      day: { index: dayIndex + 1, count: days.length, date: day.date, callTime: day.callTime },
      expiresAt: Number(state.settings.shareExpiryDays) > 0 ? new Date(new Date(day.date + 'T23:59:59').getTime() + Number(state.settings.shareExpiryDays) * 86400000).toISOString() : '',
      sheet: {
        // the line under the call and the hospital have no switch: each shows when filled in
        tagline: sheet.tagline || csd.tagline || '',
        notes: on('note') ? sheet.notes || '' : '',
        parking: on('location') && shows('parking') ? sheet.parking || csd.parking || '' : '',
        hospital: on('location') ? sheet.weather || csd.hospital || '' : '', // kept in `weather` since the first call sheets
        footer: csd.footer || '',
      },
      wx: wx && shows('weather') ? { tmax: wx.tmax, tmin: wx.tmin, summary: wx.summary, rain: wx.rain } : null,
      sun: sun && shows('sun') ? { sunrise: wx?.sunrise || sun.sunrise, sunset: wx?.sunset || sun.sunset } : null,
      loc: locView && on('location') ? locView : null,
      extraLocs: on('location') ? extraLocs.filter((x) => (x.name || '').trim() || (x.address || '').trim()).map((x) => ({ name: x.name || '', address: x.address || '' })) : [],
      groupCalls: on('groupcalls') ? groupCalls.filter((r) => r.who?.trim() || r.time).map((r) => ({ who: r.who || '', time: r.time || '' })) : [],
      program: on('program') ? program.filter((r) => r.from || r.to || r.what?.trim()).map((r) => ({ from: r.from || '', to: r.to || '', what: r.what || '' })) : [],
      layout: linkLayout(layout, project, customText),
    }
  }

  /* Someone who may only view gets the link as the crew get it (Alex, 10 Oct), whole, with the days
     to pick from when there are several. */
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
        <div className={`cs-linkpage pv-${layout.look.linkTheme === 'light' ? 'light' : 'glass'}`}>
          <CallSheetLinkView data={linkData()} />
        </div>
      </div>
    )
  }

  // ---- writing to the day ----
  const setSheet = (k, v) => edit((p) => {
    const d = p.shootingDays.find((x) => x.id === day.id)
    if (d) d.callSheet = { ...(d.callSheet || {}), [k]: v }
  })
  const setDay = (k, v) => edit((p) => {
    const d = p.shootingDays.find((x) => x.id === day.id)
    if (d) d[k] = v
  })
  const setRow = (key, list, i, k, v) => setSheet(key, list.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const setCustom = (key, v) => setSheet('custom', { ...(sheet.custom || {}), [key]: v })

  /* The date is changed on the ordino (Alex, 11 Oct). Everything filled in moves with it, and so does
     the project's shoot day in the Calendar, so the old date does not come back as an empty ordino
     (Ordino & Program makes a day for every Calendar date). A date inside a longer shoot is cut out
     of it and the new date added on its own. */
  const moveDate = (to) => {
    const from = day.date
    if (!to || to === from) return
    if (days.some((x) => x.id !== day.id && x.date === to)) { toast('There is already an ordino on that date.', 'error'); return }
    setDay('date', to)
    update((s) => {
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

  /* Deleting a day (Alex, 11 Oct). Its date leaves the Calendar too (a one-day shoot goes, a longer
     one shrinks or splits around it), or Ordino & Program would make it again empty; its link stops
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
    toast(`${dayLabel(gone, dayIndex)} deleted`, 'ok')
  }

  // ---- the link's layout (Customise) ----
  // saved whole on the project the first time anything in it changes
  const setLayout = (fn) => edit((p) => {
    p.callsheetLayout = fn(normalizeLayout(p.callsheetLayout || state.settings?.callsheet?.layout))
  })
  const makeDefault = () => {
    update((s) => { s.settings = { ...s.settings, callsheet: { ...(s.settings.callsheet || {}), layout } }; return s })
    toast('Every project without its own layout now uses this one', 'ok')
  }
  const resetLayout = () => edit((p) => { delete p.callsheetLayout })

  // ---- sharing ----
  const subject = `${title} · Ordino · ${dayLabel(day, dayIndex)} · call ${day.callTime}`
  const makeShare = async () => {
    setShare({ busy: true })
    try {
      const ref = `callsheet:${project.id}:${day.id}`
      const url = await publishShare({ workspaceId: state.workspace.id, kind: 'callsheet', ref, data: linkData(), userId: user?.id })
      // the code stays the same across re-shares of the same day, so crew are not asked twice
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
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('Copied', 'ok') } catch { toast('Could not copy', 'error') }
  }
  const withCode = (url) => `${url}${share?.pin ? `\nCode: ${share.pin}` : ''}`

  // ---- the form: one numbered card per part, in the link's own order (set in Customise) ----
  const fields = {
    note: <Textarea rows={3} value={sheet.notes || ''} placeholder="Parking, catering, safety, permits, transport. Everyone reads this one." onChange={(e) => setSheet('notes', e.target.value)} />,
    groupcalls: (
      <>
        {groupCalls.map((r, i) => (
          <div key={i} className="ordino-row">
            <Input value={r.who || ''} placeholder="Production crew" onChange={(e) => setRow('groupCalls', groupCalls, i, 'who', e.target.value)} aria-label="Group" />
            <Input inputMode="numeric" placeholder="00:00" className="ordino-time" value={r.time || ''} onChange={(e) => setRow('groupCalls', groupCalls, i, 'time', e.target.value)} aria-label="Call" />
            <button type="button" className="ordino-x" onClick={() => setSheet('groupCalls', groupCalls.filter((_, j) => j !== i))} aria-label="Remove">×</button>
          </div>
        ))}
        <div className="ordino-adds">
          <button type="button" className="ordino-pill" onClick={() => setSheet('groupCalls', [...groupCalls, { who: '', time: '' }])}><b>+</b>Add a group</button>
          {!groupCalls.length && <button type="button" className="ordino-pill" onClick={() => setSheet('groupCalls', USUAL_GROUPS.map((who) => ({ who, time: '' })))}><b>≡</b>Add the usual groups</button>}
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
              <Input value={x.name || ''} placeholder="Name" onChange={(e) => setRow('extraLocs', extraLocs, i, 'name', e.target.value)} aria-label="Extra location name" />
              <Input value={x.address || ''} placeholder="Address" onChange={(e) => setRow('extraLocs', extraLocs, i, 'address', e.target.value)} aria-label="Extra location address" />
              <button type="button" className="ordino-x" onClick={() => setSheet('extraLocs', extraLocs.filter((_, j) => j !== i))} aria-label="Remove">×</button>
            </div>
          ))}
          <div className="ordino-adds">
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
            <Input inputMode="numeric" placeholder="00:00" className="ordino-time" value={r.from || ''} onChange={(e) => setRow('program', program, i, 'from', e.target.value)} aria-label="From" />
            <Input inputMode="numeric" placeholder="00:00" className="ordino-time" value={r.to || ''} onChange={(e) => setRow('program', program, i, 'to', e.target.value)} aria-label="To" />
            <Input value={r.what || ''} placeholder="What happens" onChange={(e) => setRow('program', program, i, 'what', e.target.value)} aria-label="What" />
            <button type="button" className="ordino-x" onClick={() => setSheet('program', program.filter((_, j) => j !== i))} aria-label="Remove">×</button>
          </div>
        ))}
        <div className="ordino-adds"><button type="button" className="ordino-pill" onClick={() => setSheet('program', [...program, { from: '', to: '', what: '' }])}><b>+</b>Add a row</button></div>
      </>
    ),
  }
  const linkBlocks = layout.blocks.filter((b) => b.link && (b.custom || fields[b.key]))
  const ordinoForm = (
    <div className="ordino-form">
      <section className="ordino-sec">
        <h3><span className="ordino-n">1</span>The day</h3>
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
  const showPreview = !mobile || mPreview

  return (
    <div className="callsheets">
      {/* one row of the same buttons (Alex, 11 Oct): the day, Ordino | Customise, Preview on a
          phone, Share link, Delete day */}
      <div className="ordino-bar no-print">
        <div className="segmented">
          {days.map((d, i) => <button key={d.id} className={d.id === day.id ? 'on' : ''} onClick={() => setSel(d.id)}>{dayLabel(d, i)}</button>)}
        </div>
        {editable && (
          <div className="segmented ordino-tabs">
            <button className={!designing ? 'on' : ''} onClick={() => { setDesigning(false); setMPreview(false) }}>Ordino</button>
            <button className={designing ? 'on' : ''} onClick={() => { setDesigning(true); setMPreview(false) }}>Customise</button>
          </div>
        )}
        {mobile && <div className="segmented"><button className={mPreview ? 'on' : ''} onClick={() => setMPreview(!mPreview)}>Preview</button></div>}
        <div className="segmented"><button className="ordino-share" onClick={makeShare}>Share link</button></div>
        {editable && <div className="segmented"><DeleteDay onDelete={removeDay} /></div>}
      </div>

      <Modal open={!!share} title={`Share the ordino · ${dayLabel(day, dayIndex)}`} onClose={() => setShare(null)}>
        {share?.busy && <p className="muted">Preparing the link…</p>}
        {share?.error && <p className="error">{share.error}</p>}
        {share?.url && (
          <div className="stack">
            <p className="small muted">Anyone with this link sees the ordino on their phone, no login needed: the call, the location with directions, calls by group, the program and the note. Sharing again after you edit refreshes the same link.</p>
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
              <a className="btn btn-primary" href={waShareLink(`${subject}\n${withCode(share.url)}`)} target="_blank" rel="noreferrer">Send on WhatsApp</a>
              <a className="btn btn-ghost" href={mailLink({ subject, body: `${subject}\n\n${withCode(share.url)}` })}>Mail</a>
              {navigator.share && <Button variant="ghost" onClick={() => navigator.share({ title: subject, url: share.url }).catch(() => {})}>Share…</Button>}
              <Button variant="ghost" onClick={() => shortenWithBitly(share.url, toast)} title="Opens bit.ly with the link copied, for a short address of your own">Shorten with bit.ly</Button>
            </div>
          </div>
        )}
      </Modal>

      <div className={showPreview ? 'cs-with-preview' : undefined}>
        {showPreview && (
          <aside className="cs-preview no-print">
            <div className="cs-preview-head"><span className="cs-live"><i />On the phone</span><span className="muted small">What the crew see, live. Share link sends it.</span></div>
            <div className={`cs-phone pv-${layout.look.linkTheme === 'light' ? 'light' : 'glass'}`}>
              <CallSheetLinkView data={linkData()} />
            </div>
          </aside>
        )}
        {!(mobile && mPreview) && (
          <div className="ordino-pane">
            {designing && editable ? (
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

/* Delete day as one of the bar's buttons: the first tap asks, the second deletes, and it settles
   back after three seconds */
function DeleteDay({ onDelete }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return undefined
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button className={`ordino-delete${armed ? ' armed' : ''}`} onClick={() => { if (armed) { setArmed(false); onDelete() } else setArmed(true) }}>
      {armed ? 'Tap again to delete' : 'Delete day'}
    </button>
  )
}
