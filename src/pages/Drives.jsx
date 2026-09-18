import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { can, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'

const STATUS = [['empty', 'Empty'], ['inuse', 'In use'], ['full', 'Full'], ['offline', 'Not around']]
const statusLabel = (k) => STATUS.find((s) => s[0] === k)?.[1] || 'In use'
const emptyDrive = () => ({ id: uid(), name: '', series: '', capacity: '', free: '', status: 'empty', where: '', notes: '', items: [], createdAt: new Date().toISOString() })
const emptyItem = () => ({ id: uid(), title: '', projectId: '', size: '', date: '', notes: '' })
const seriesOf = (d) => d.series || d.name.replace(/[\s\d(].*$/, '').toUpperCase() || 'Other'

export default function Drives() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  if (!can(user, 'drives')) return <Navigate to="/home" replace />
  const editable = can(user, 'drives', 'edit')
  const drives = state.library.drives || []
  const projects = visibleProjects(state, user)
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState(null)
  const [item, setItem] = useState(null) // { driveId, ...item }

  const filtered = useMemo(() => {
    if (!q.trim()) return drives
    return drives.filter((d) => matchText(q, d.name, d.where, d.notes) || (d.items || []).some((it) => matchText(q, it.title, it.notes, projects.find((p) => p.id === it.projectId)?.title)))
  }, [drives, q, projects])
  const order = state.settings?.driveSeriesOrder || []
  const groups = useMemo(() => {
    const m = {}
    for (const d of filtered) (m[seriesOf(d)] = m[seriesOf(d)] || []).push(d)
    const rank = (k) => { const i = order.indexOf(k); return i === -1 ? 1000 : i }
    return Object.entries(m).map(([k, v]) => [k, v.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
  }, [filtered, order])
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
  const hit = (it) => q.trim() && matchText(q, it.title, it.notes, projects.find((p) => p.id === it.projectId)?.title)
  const totalItems = drives.reduce((a, d) => a + (d.items || []).length, 0)

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

  return (
    <div className="drives wide-page">
      <PageHead title="Drives archive" sub={`${drives.length} disk${drives.length === 1 ? '' : 's'} · ${totalItems} project${totalItems === 1 ? '' : 's'} archived · ${drives.filter((d) => d.status === 'empty').length} empty`}>
        {editable && <Button variant="primary" onClick={() => setDraft(emptyDrive())}>Add disk</Button>}
      </PageHead>
      <div className="toolbar">
        <Input className="input search drives-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Which disk has… (project, artist, note)" />
        {q && <span className="muted small">{filtered.length} disk{filtered.length === 1 ? '' : 's'} match</span>}
      </div>

      {!drives.length ? (
        <Empty title="No disks yet" action={editable && <Button variant="primary" onClick={() => setDraft(emptyDrive())}>Add the first disk</Button>}>
          Add every hard disk and SSD (LION 01, SIMBA 02, TML 05…) and list which projects live on each one. Then anyone can search "where is the Sabanis clip" and get the disk.
        </Empty>
      ) : !filtered.length ? (
        <Empty title="Not on any disk">Nothing matches "{q}". Check the spelling or the project name.</Empty>
      ) : (
        groups.map(([series, list]) => (
          <section key={series} className="drive-series">
            <h2 className="drive-series-title">
              {series} <span className="muted small">{list.length}</span>
              {editable && !q && (
                <span className="drive-series-move">
                  <button className="link" onClick={() => moveSeries(series, -1)} disabled={allSeries.indexOf(series) === 0} title="Move up">▲</button>
                  <button className="link" onClick={() => moveSeries(series, 1)} disabled={allSeries.indexOf(series) === allSeries.length - 1} title="Move down">▼</button>
                </span>
              )}
            </h2>
            <div className="drive-grid">
              {list.map((d) => (
                <article key={d.id} className={`drive st-${d.status || 'inuse'}`}>
                  <header className="drive-head">
                    <div className="drive-icon" aria-hidden="true"><span /></div>
                    <div className="grow">
                      <strong>{d.name}</strong>
                      <div className="small muted">{[d.capacity, d.free ? `${d.free} free` : '', d.where].filter(Boolean).join(' · ')}</div>
                    </div>
                    <span className={`drive-status ${d.status || 'inuse'}`}>{statusLabel(d.status)}</span>
                  </header>
                  {(d.items || []).length ? (
                    <ul className="plain drive-items">
                      {d.items.map((it) => (
                        <li key={it.id} className={hit(it) ? 'hit' : ''}>
                          <div className="grow">
                            {it.projectId && projTitle(it.projectId) ? <Link to={`/p/${it.projectId}`} className="drive-item-title">{it.title || projTitle(it.projectId)}</Link> : <span className="drive-item-title">{it.title}</span>}
                            {(it.size || it.date || it.notes) && <div className="small muted">{[it.size, it.date, it.notes].filter(Boolean).join(' · ')}</div>}
                          </div>
                          {editable && <span className="drive-item-tools"><button className="link small" onClick={() => setItem({ driveId: d.id, ...it })}>Edit</button><Confirm onConfirm={() => removeItem(d.id, it.id)} label="Remove">×</Confirm></span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="drive-empty muted">EMPTY</p>
                  )}
                  {d.notes && <p className="small muted drive-notes">{d.notes}</p>}
                  {editable && (
                    <footer className="drive-foot">
                      <button className="link small" onClick={() => setItem({ driveId: d.id, ...emptyItem() })}>+ Add</button>
                      <span className="grow" />
                      <button className="link small" onClick={() => setDraft({ ...d })}>Edit</button>
                      <Confirm onConfirm={() => removeDrive(d.id)} label="Delete disk">×</Confirm>
                    </footer>
                  )}
                </article>
              ))}
            </div>
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
    </div>
  )
}
