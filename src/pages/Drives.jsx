import { Fragment, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useIsMobile, useToast } from '../components/ui.jsx'
import { DbAdd, DbBar, DbFilter } from '../components/DbTools.jsx'
import { can, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'

const STATUS = [['empty', 'Empty'], ['inuse', 'In use'], ['full', 'Full'], ['offline', 'Not around']]
const statusLabel = (k) => STATUS.find((s) => s[0] === k)?.[1] || 'In use'
const emptyDrive = () => ({ id: uid(), name: '', series: '', capacity: '', free: '', status: 'empty', where: '', notes: '', items: [], createdAt: new Date().toISOString() })
const emptyItem = () => ({ id: uid(), title: '', projectId: '', size: '', date: '', notes: '' })
const seriesOf = (d) => d.series || d.name.replace(/[\s\d(].*$/, '').toUpperCase() || 'Other'

/* Capacity and free space are typed by hand ("4 TB", "1,5 TB", "904 GB"), so the fullness bar
   only appears when both of them can actually be read. Anything unparseable just stays text. */
export const parseSize = (s) => {
  const m = /^\s*([\d.,]+)\s*(tb|gb|mb|t|g|m)?b?\s*$/i.exec(String(s || ''))
  if (!m) return 0
  const n = Number(m[1].replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return 0
  const u = (m[2] || 'gb').toLowerCase()
  return n * (u.startsWith('t') ? 1024 : u.startsWith('m') ? 1 / 1024 : 1)
}
export const fullness = (capacity, free) => {
  const c = parseSize(capacity)
  if (!c || !String(free || '').trim()) return null // no free space typed in means we do not know
  return Math.min(100, Math.max(0, Math.round(((c - parseSize(free)) / c) * 100)))
}

/* Database > Drives (Alex, 10 Oct: the drives archive moved into the Database, before Equipment, for
   whoever has the Drives permission). It follows the Database: the search line with a round series
   filter and a round +, short cards (the disk, its size and free space, how many projects, its status
   and how full it is), and a disk's contents open under its row. Shelf / Contents stays on a computer. */
export default function Drives({ slot }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const mobile = useIsMobile()
  if (!can(user, 'drives')) return <Navigate to="/" replace />
  const editable = can(user, 'drives', 'edit')
  const drives = state.library.drives || []
  const projects = visibleProjects(state, user)
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState(null)
  const [item, setItem] = useState(null) // { driveId, ...item }
  const [openId, setOpenId] = useState('') // the disk whose contents are open below the shelf
  const [seriesF, setSeriesF] = useState('') // one series only (LION, SIMBA…), or all
  /* Two ways of looking at the same shelf. Shelf is the disks as objects, one click to see
     inside. Contents lays every disk open at once with its projects under it, for reading down
     the whole archive rather than hunting one disk (Alex). The choice is remembered per device. */
  const [view, setView] = useState(() => { try { return localStorage.getItem('tml_drives_view') || 'shelf' } catch { return 'shelf' } })
  const pickView = (v) => { setView(v); try { localStorage.setItem('tml_drives_view', v) } catch { /* private window */ } }
  const shownView = mobile ? 'shelf' : view // a phone has no room for Contents

  const filtered = useMemo(() => {
    if (!q.trim()) return drives
    return drives.filter((d) => matchText(q, d.name, d.where, d.notes) || (d.items || []).some((it) => matchText(q, it.title, it.notes, projects.find((p) => p.id === it.projectId)?.title)))
  }, [drives, q, projects])
  const order = state.settings?.driveSeriesOrder || []
  const groups = useMemo(() => {
    const m = {}
    for (const d of filtered) if (!seriesF || seriesOf(d) === seriesF) (m[seriesOf(d)] = m[seriesOf(d)] || []).push(d)
    const rank = (k) => { const i = order.indexOf(k); return i === -1 ? 1000 : i }
    return Object.entries(m).map(([k, v]) => [k, v.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
  }, [filtered, order, seriesF])
  const allSeries = useMemo(() => {
    const set = [...new Set(drives.map(seriesOf))]
    const rank = (k) => { const i = order.indexOf(k); return i === -1 ? 1000 : i }
    return set.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  }, [drives, order])
  const moveSeries = (k, dir) => update((s) => {
    const cur = [...allSeries]
    const i = cur.indexOf(k), j = i + dir
    if (i < 0 || j < 0 || j >= cur.length) return s
    ;[cur[i], cur[j]] = [cur[j], cur[i]]
    s.settings = { ...s.settings, driveSeriesOrder: cur }
    return s
  })
  const searching = !!q.trim()
  // Searching is a different question from browsing: you are not asking what is on the shelf,
  // you are asking which disk holds one thing. So it answers with the things, not the shelf.
  const results = useMemo(() => {
    if (!searching) return []
    const out = []
    for (const d of drives) {
      for (const it of d.items || []) {
        if (matchText(q, it.title, it.notes, projects.find((p) => p.id === it.projectId)?.title, d.name, d.where)) out.push({ d, it })
      }
    }
    return out.sort((a, b) => a.d.name.localeCompare(b.d.name, undefined, { numeric: true }) || (a.it.title || '').localeCompare(b.it.title || ''))
  }, [drives, q, projects, searching])
  const diskHits = useMemo(() => (searching ? drives.filter((d) => matchText(q, d.name, d.where, d.notes)) : []), [drives, q, searching])
  const openDisk = (id) => { setQ(''); setOpenId(id) }

  const saveDrive = () => {
    if (!draft.name.trim()) return toast('Name the disk (LION 13, SIMBA 05…).', 'error')
    update((s) => {
      s.library.drives = s.library.drives || []
      const i = s.library.drives.findIndex((d) => d.id === draft.id)
      if (i >= 0) s.library.drives[i] = draft
      else s.library.drives.push(draft)
      return s
    })
    setDraft(null)
  }
  const removeDrive = (id) => update((s) => { s.library.drives = (s.library.drives || []).filter((d) => d.id !== id); return s })
  const saveItem = () => {
    if (!item.title.trim() && !item.projectId) return toast('What is on the disk? Type a title or pick a project.', 'error')
    const it = { ...item, title: item.title.trim() || projects.find((p) => p.id === item.projectId)?.title || '' }
    delete it.driveId
    update((s) => {
      const d = (s.library.drives || []).find((x) => x.id === item.driveId)
      if (!d) return s
      d.items = d.items || []
      const i = d.items.findIndex((x) => x.id === it.id)
      if (i >= 0) d.items[i] = it
      else d.items.push(it)
      if (d.status === 'empty') d.status = 'inuse'
      return s
    })
    setItem(null)
  }
  const removeItem = (driveId, id) => update((s) => {
    const d = (s.library.drives || []).find((x) => x.id === driveId)
    if (d) d.items = (d.items || []).filter((x) => x.id !== id)
    if (d && !d.items.length && d.status === 'inuse') d.status = 'empty'
    return s
  })
  const projTitle = (id) => projects.find((p) => p.id === id)?.title

  const openedDisk = drives.find((d) => d.id === openId)

  const itemRow = (d, it) => (
    <li key={it.id} className="drive-row">
      <div className="grow">
        {it.projectId && projTitle(it.projectId)
          ? <Link to={`/p/${it.projectId}`} className="drive-item-title">{it.title || projTitle(it.projectId)}</Link>
          : <span className="drive-item-title">{it.title}</span>}
        {(it.size || it.date || it.notes) && <div className="small muted">{[it.size, it.date, it.notes].filter(Boolean).join(' · ')}</div>}
      </div>
      {editable && (
        <span className="drive-item-tools">
          <button className="link small" onClick={() => setItem({ driveId: d.id, ...it })}>Edit</button>
          <Confirm onConfirm={() => removeItem(d.id, it.id)} label="Remove">×</Confirm>
        </span>
      )}
    </li>
  )

  const contents = (d) => (
    <section className="panel drive-open">
      <div className="panel-head drive-open-head">
        <h2>{d.name}</h2>
        <span className="muted small">
          {[d.capacity, d.free ? `${d.free} free` : '', d.where, `${(d.items || []).length} project${(d.items || []).length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
        </span>
        <span className="grow" />
        {editable && <button className="link small" onClick={() => setItem({ driveId: d.id, ...emptyItem() })}>Add project</button>}
        {editable && <button className="link small" onClick={() => setDraft({ ...d })}>Edit disk</button>}
        {editable && <Confirm onConfirm={() => { removeDrive(d.id); setOpenId('') }} label="Delete disk">×</Confirm>}
        <button className="link small" onClick={() => setOpenId('')}>Close</button>
      </div>
      {d.notes && <p className="small muted drive-open-notes">{d.notes}</p>}
      {(d.items || []).length
        ? <ul className="plain drive-rows">{d.items.map((it) => itemRow(d, it))}</ul>
        : <p className="muted drive-open-empty">Nothing listed on this disk yet.{editable ? ' Use Add project above.' : ''}</p>}
    </section>
  )

  // the short Database card: the disk, its size and free space, how many projects and its status, how full
  const card = (d) => {
    const pct = fullness(d.capacity, d.free)
    const n = (d.items || []).length
    return (
      <article key={d.id} className={`person loc-card drive-card st-${d.status || 'inuse'} ${openId === d.id ? 'on' : ''}`} onClick={() => setOpenId(openId === d.id ? '' : d.id)} role="button" tabIndex={0}>
        <div className="person-photo drive-photo" aria-hidden="true"><div className="drive-icon"><span /></div></div>
        <div className="person-body">
          <strong>{d.name}</strong>
          <div className="small muted">{[d.capacity, d.free ? `${d.free} free` : ''].filter(Boolean).join(' · ') || d.where || 'No details yet'}</div>
          <div className="small muted drive-card-line">{n > 0 && <span>{`${n} project${n === 1 ? '' : 's'}`}</span>}<span className={`drive-status ${d.status || 'inuse'}`}>{statusLabel(d.status)}</span></div>
          {pct !== null && <div className="drive-bar" title={`${pct}% full`}><span style={{ width: `${pct}%` }} /></div>}
        </div>
      </article>
    )
  }

  return (
    <section className="panel db-card drives">
      <DbBar slot={slot}>
        <div className="toolbar-info"><strong>Drives</strong> <span className="muted">{drives.length}</span></div>
        <div className="toolbar-actions">
          <Input className="input search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Which disk has… (project, artist, note)" />
          <DbFilter value={seriesF} onChange={(e) => setSeriesF(e.target.value)} options={[['', 'All series'], ...allSeries.map((x) => [x, x])]} label="Series" />
          {editable && <DbAdd label="Add disk" onClick={() => setDraft(emptyDrive())} />}
          {!searching && (
            <span className="segmented small">
              <button className={view === 'shelf' ? 'on' : ''} onClick={() => pickView('shelf')}>Shelf</button>
              <button className={view === 'contents' ? 'on' : ''} onClick={() => pickView('contents')}>Contents</button>
            </span>
          )}
        </div>
      </DbBar>

      {!drives.length ? (
        <Empty title="No disks yet" action={editable && <Button variant="primary" onClick={() => setDraft(emptyDrive())}>Add the first disk</Button>}>
          Add every hard disk and SSD (LION 01, SIMBA 02, TML 05…) and list which projects live on each one. Then anyone can search "where is the Sabanis clip" and get the disk.
        </Empty>
      ) : searching ? (
        <>
          {diskHits.length > 0 && (
            <div className="drive-hits">
              <span className="muted small">Disks:</span>
              {diskHits.map((d) => <button key={d.id} className="chip" onClick={() => openDisk(d.id)}>{d.name}</button>)}
            </div>
          )}
          <p className="muted small drive-found">{results.length} result{results.length === 1 ? '' : 's'}</p>
          {!results.length ? (
            <Empty title="Not on any disk">Nothing matches "{q}". Check the spelling or the project name.</Empty>
          ) : (
            <ul className="plain drive-results">
              {results.map(({ d, it }) => (
                <li key={`${d.id}:${it.id}`} className="drive-result">
                  <div className="grow">
                    {it.projectId && projTitle(it.projectId)
                      ? <Link to={`/p/${it.projectId}`} className="drive-item-title">{it.title || projTitle(it.projectId)}</Link>
                      : <span className="drive-item-title">{it.title}</span>}
                    {(it.size || it.date || it.notes) && <div className="small muted">{[it.size, it.date, it.notes].filter(Boolean).join(' · ')}</div>}
                  </div>
                  <button className="drive-result-disk" onClick={() => openDisk(d.id)} title="Open this disk">{d.name}</button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        groups.map(([series, list]) => (
          <section key={series} className="drive-series">
            <h2 className="drive-series-title">
              {series} <span className="muted small">{list.length}</span>
              {editable && (
                <span className="drive-series-move">
                  <button className="link" onClick={() => moveSeries(series, -1)} disabled={allSeries.indexOf(series) === 0} title="Move up">▲</button>
                  <button className="link" onClick={() => moveSeries(series, 1)} disabled={allSeries.indexOf(series) === allSeries.length - 1} title="Move down">▼</button>
                </span>
              )}
            </h2>
            {shownView === 'contents' ? (
              <ul className="plain drive-contents">
                {list.map((d) => (
                  <li key={d.id} className={`drive-contents-disk st-${d.status || 'inuse'}`}>
                    <div className="drive-contents-head">
                      <div className="drive-icon" aria-hidden="true"><span /></div>
                      <strong>{d.name}</strong>
                      <span className={`drive-status ${d.status || 'inuse'}`}>{statusLabel(d.status)}</span>
                      <span className="muted small">{[d.capacity, d.free ? `${d.free} free` : '', d.where].filter(Boolean).join(' · ') || 'No details yet'}</span>
                      {editable && <button className="link small" onClick={() => setItem({ driveId: d.id, ...emptyItem() })}>Add project</button>}
                    </div>
                    {(d.items || []).length
                      ? <ul className="plain drive-rows">{d.items.map((it) => itemRow(d, it))}</ul>
                      : <p className="muted small drive-contents-empty">Nothing listed on this disk yet.</p>}
                  </li>
                ))}
              </ul>
            ) : (
            <div className="people-grid compact drive-shelf">
              {/* the open disk is itself a grid item spanning every column, so wherever it sits in
                  the list it still lands directly under its own row, not after the whole shelf */}
              {list.map((d) => (
                <Fragment key={d.id}>
                  {card(d)}
                  {openedDisk?.id === d.id && contents(openedDisk)}
                </Fragment>
              ))}
            </div>
            )}
          </section>
        ))
      )}

      <Modal open={!!draft} title={drives.some((d) => d.id === draft?.id) ? 'Edit disk' : 'Add disk'} onClose={() => setDraft(null)} footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveDrive}>Save</Button></>}>
        {draft && (
          <div className="stack">
            <div className="row-2">
              <Field label="Name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value.toUpperCase() })} placeholder="LION 13" autoFocus /></Field>
              <Field label="Series" hint="LION, SIMBA, TML… guessed from the name if empty."><Input value={draft.series} onChange={(e) => setDraft({ ...draft, series: e.target.value.toUpperCase() })} placeholder="LION" /></Field>
            </div>
            <div className="row-3">
              <Field label="Capacity"><Input value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} placeholder="4 TB" /></Field>
              <Field label="Free space"><Input value={draft.free} onChange={(e) => setDraft({ ...draft, free: e.target.value })} placeholder="904 GB" /></Field>
              <Field label="Status"><Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} options={STATUS} /></Field>
            </div>
            <Field label="Where is it"><Input value={draft.where} onChange={(e) => setDraft({ ...draft, where: e.target.value })} placeholder="Office shelf, with Giorgos, editing suite…" /></Field>
            <Field label="Notes"><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Model, serial number, formatting, backup of…" /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!item} title={item && drives.find((d) => d.id === item.driveId)?.items?.some((x) => x.id === item.id) ? 'Edit entry' : `Add to ${item ? drives.find((d) => d.id === item.driveId)?.name : ''}`} onClose={() => setItem(null)} footer={<><Button variant="ghost" onClick={() => setItem(null)}>Cancel</Button><Button variant="primary" onClick={saveItem}>Save</Button></>}>
        {item && (
          <div className="stack">
            <Field label="Project in the app (optional)"><Select value={item.projectId || ''} onChange={(e) => setItem({ ...item, projectId: e.target.value, title: item.title || projects.find((p) => p.id === e.target.value)?.title || '' })} options={[['', 'Not in the app / older project'], ...projects.map((p) => [p.id, p.title])]} /></Field>
            <Field label="Title" hint="How it is written on the disk, e.g. Ιουλία Καλλιμάνη - Κατράκειος."><Input value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} autoFocus /></Field>
            <div className="row-2">
              <Field label="Size"><Input value={item.size} onChange={(e) => setItem({ ...item, size: e.target.value })} placeholder="320 GB" /></Field>
              <Field label="Date"><Input type="date" value={item.date} onChange={(e) => setItem({ ...item, date: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Input value={item.notes} onChange={(e) => setItem({ ...item, notes: e.target.value })} placeholder="RAW + proxies, only masters, also on cloud…" /></Field>
          </div>
        )}
      </Modal>
    </section>
  )
}
