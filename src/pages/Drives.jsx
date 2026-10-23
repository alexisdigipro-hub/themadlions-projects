import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Act, Button, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../components/ui.jsx'
import { DbAdd, DbBar, DbFilter } from '../components/DbTools.jsx'
import { can, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'
import { Grip, moveItem, useDragSort } from '../components/DragSort.jsx'

const STATUS = [['empty', 'Empty'], ['inuse', 'In use'], ['full', 'Full'], ['offline', 'Not around']]
const statusLabel = (k) => STATUS.find((s) => s[0] === k)?.[1] || 'In use'
const emptyDrive = () => ({ id: uid(), name: '', series: '', capacity: '', free: '', status: 'empty', where: '', notes: '', items: [], createdAt: new Date().toISOString() })
/* Delete as a round red glass button that asks once more (Alex, 23 Oct: the underlined words did not look like buttons) */
function ActDelete({ label, onConfirm, small = false }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t) }, [armed])
  return <Act icon="trash" label={armed ? `Sure? ${label}` : label} className={`act-del${small ? ' act-sm' : ''}${armed ? ' armed' : ''}`} onClick={() => { if (armed) { setArmed(false); onConfirm() } else setArmed(true) }} />
}
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

/* Each series has its own colour on the shelf, like the coloured labels on real disks (Alex, 23 Oct) */
const HUES = ['#ff8a3d', '#4f9dff', '#b07cff', '#35c98b', '#ff5d8f', '#f2c94c', '#4fd1e6', '#ff6b5b']
const filmKey = (it) => (it.projectId ? `p:${it.projectId}` : `t:${String(it.title || '').toLowerCase().replace(/[\s\-–—_.,:]+/g, '')}`)
const fmtGB = (gb) => (gb >= 1024 ? `${(gb / 1024).toFixed(gb >= 10240 ? 0 : 1).replace('.0', '')} TB` : `${Math.round(gb)} GB`)
const initials = (t) => String(t || '?').split(/[\s\-–—]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
// how full a disk is: from its free space when typed in, else from the sizes of what is on it
const diskUse = (d) => {
  const cap = parseSize(d.capacity)
  const typed = fullness(d.capacity, d.free)
  const used = (d.items || []).reduce((a, it) => a + parseSize(it.size), 0)
  if (typed !== null) return { cap, used: cap * typed / 100, pct: typed }
  return { cap, used, pct: cap && used ? Math.min(100, Math.round((used / cap) * 100)) : null }
}

/* Database > Drives, the archive (Alex, 23 Oct: "think of another way to see the archiving of the drives, more
   understandable and more 2026"). Most of the time the question is "where is that film?", so the main view is the
   films, each with its poster, its size and the disks it is on, and a warning when it is on one disk only. The
   shelf is still there: each series in its own colour, each disk with how full it is and the posters of what is on
   it, the empty disks folded into one line. A disk opens in a window. A line of numbers on top says how the
   archive stands: disks, space, films, and how many films a single broken disk would lose. */
export default function Drives({ slot }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  if (!can(user, 'drives')) return <Navigate to="/" replace />
  const editable = can(user, 'drives', 'edit')
  const drives = state.library.drives || []
  const projects = visibleProjects(state, user)
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState(null)
  const [item, setItem] = useState(null) // { driveId, ...item }
  const [openId, setOpenId] = useState('') // the disk open in its window
  const [seriesF, setSeriesF] = useState('') // one series only (LION, SIMBA…), or all
  const [oneOnly, setOneOnly] = useState(false) // only the films on a single disk
  const [view, setView] = useState(() => { try { const v = localStorage.getItem('tml_drives_view'); return v === 'shelf' ? 'shelf' : 'films' } catch { return 'films' } })
  const pickView = (v) => { setView(v); try { localStorage.setItem('tml_drives_view', v) } catch { /* private window */ } }

  const order = state.settings?.driveSeriesOrder || []
  const allSeries = useMemo(() => {
    const set = [...new Set(drives.map(seriesOf))]
    const rank = (k) => { const i = order.indexOf(k); return i === -1 ? 1000 : i }
    return set.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  }, [drives, order])
  const hue = (series) => HUES[Math.max(0, allSeries.indexOf(series)) % HUES.length]
  // drag a series (LION, SIMBA…) by its ⋮⋮ to change the order of the shelf (Alex, 10 Oct: no more arrows)
  const sort = useDragSort((from, to) => update((s) => {
    s.settings = { ...s.settings, driveSeriesOrder: moveItem(allSeries, from, to) }
    return s
  }))
  const projOf = (id) => projects.find((p) => p.id === id)
  const projTitle = (id) => projOf(id)?.title

  // every film in the archive once, with each disk it is on
  const films = useMemo(() => {
    const m = new Map()
    for (const d of drives) for (const it of d.items || []) {
      const k = filmKey(it)
      const p = it.projectId ? projects.find((x) => x.id === it.projectId) : null
      const f = m.get(k) || { key: k, title: it.title || p?.title || 'Untitled', projectId: it.projectId || '', cover: p?.coverThumb || '', color: p?.color || '', copies: [], size: 0, date: '' }
      f.copies.push({ d, it })
      f.size = Math.max(f.size, parseSize(it.size))
      if (it.date && it.date > f.date) f.date = it.date
      m.set(k, f)
    }
    return [...m.values()].sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title))
  }, [drives, projects])
  const filmOf = (it) => films.find((f) => f.key === filmKey(it))

  const searching = !!q.trim()
  const shownFilms = useMemo(() => films.filter((f) =>
    (!oneOnly || f.copies.length === 1)
    && (!seriesF || f.copies.some((c) => seriesOf(c.d) === seriesF))
    && (!searching || matchText(q, f.title, projTitle(f.projectId), ...f.copies.map((c) => c.it.notes), ...f.copies.map((c) => c.d.name)))), [films, oneOnly, seriesF, q, searching]) // eslint-disable-line react-hooks/exhaustive-deps
  const diskHits = useMemo(() => (searching ? drives.filter((d) => matchText(q, d.name, d.where, d.notes)) : []), [drives, q, searching])
  const groups = useMemo(() => {
    const m = {}
    for (const d of drives) if (!seriesF || seriesOf(d) === seriesF) (m[seriesOf(d)] = m[seriesOf(d)] || []).push(d)
    return allSeries.filter((k) => m[k]).map((k) => [k, m[k].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))])
  }, [drives, seriesF, allSeries])

  // the line of numbers on top
  const stats = useMemo(() => {
    let cap = 0, used = 0
    for (const d of drives) { const u = diskUse(d); cap += u.cap; used += u.used }
    return { disks: drives.length, away: drives.filter((d) => d.status === 'offline').length, cap, used, films: films.length, one: films.filter((f) => f.copies.length === 1).length }
  }, [drives, films])

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
  const openedDisk = drives.find((d) => d.id === openId)

  // a poster: the project's cover, else its initials on the project's (or the series') colour
  const poster = (f, size = '') => (
    <span className={`drv-poster ${size}`} style={{ '--c': f.color || hue(seriesOf(f.copies[0].d)) }} aria-hidden="true">
      {f.cover ? <img src={f.cover} alt="" loading="lazy" /> : <b>{initials(f.title)}</b>}
    </span>
  )
  const diskChip = (d, extra = '') => (
    <button key={d.id} type="button" className={`drv-chip ${extra}`} style={{ '--c': hue(seriesOf(d)) }} onClick={(e) => { e.stopPropagation(); setOpenId(d.id) }} title={`Open ${d.name}`}>
      <i />{d.name}
    </button>
  )
  const copiesBadge = (n) => (n > 1
    ? <span className="drv-badge ok" title="On more than one disk">{n} copies</span>
    : <span className="drv-badge warn" title="Only on one disk: if it breaks, this is gone">1 copy</span>)
  const titleOf = (f) => (f.projectId && projTitle(f.projectId) ? <Link to={`/p/${f.projectId}`} onClick={(e) => e.stopPropagation()}>{f.title}</Link> : f.title)

  const filmTile = (f) => (
    <article key={f.key} className={`drv-film${f.copies.length === 1 ? ' one' : ''}`}>
      {poster(f)}
      <div className="drv-film-body">
        <strong>{titleOf(f)}</strong>
        <span className="drv-meta">{[f.size ? fmtGB(f.size) : '', f.date ? new Date(f.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '', f.copies[0].it.notes].filter(Boolean).join(' · ')}</span>
        <span className="drv-chips">{f.copies.map((c) => diskChip(c.d))}{copiesBadge(f.copies.length)}</span>
      </div>
    </article>
  )

  // a disk on the shelf: its series colour, its name and size, how full, the posters of what is on it
  const diskCard = (d) => {
    const u = diskUse(d)
    const list = (d.items || []).map((it) => filmOf(it)).filter(Boolean)
    const tone = u.pct === null ? '' : u.pct >= 90 ? 'hi' : u.pct >= 70 ? 'mid' : 'lo'
    return (
      <article key={d.id} className={`drv-disk st-${d.status || 'inuse'}`} style={{ '--c': hue(seriesOf(d)) }} onClick={() => setOpenId(d.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(d.id) }}>
        <div className="drv-disk-top">
          <strong>{d.name}</strong>
          {d.status === 'offline' ? <span className="drv-badge away">Not around</span> : d.status === 'full' ? <span className="drv-badge warn">Full</span> : null}
        </div>
        <div className={`drv-fill ${tone}`}><span style={{ width: `${u.pct ?? 0}%` }} /></div>
        <span className="drv-meta">{u.cap ? (u.used ? `${fmtGB(u.used)} of ${fmtGB(u.cap)}` : fmtGB(u.cap)) : d.capacity || 'Size not set'}{u.pct !== null ? ` · ${u.pct}%` : ''}</span>
        <div className="drv-stack">
          {list.slice(0, 5).map((f, i) => <span key={f.key + i} className="drv-stack-i">{poster(f, 'xs')}</span>)}
          {list.length > 5 && <span className="drv-more">+{list.length - 5}</span>}
          <span className="drv-count">{list.length} {list.length === 1 ? 'film' : 'films'}</span>
        </div>
      </article>
    )
  }

  return (
    <section className="panel db-card drives drv">
      <DbBar slot={slot}>
        <div className="toolbar-info"><strong>Drives</strong> <span className="muted">{drives.length}</span></div>
        <div className="toolbar-actions">
          {/* no words inside, an × at the right that empties it (Alex, 20 Oct) */}
          <span className="search-clear-wrap">
            <Input className="input search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the archive" />
            {q && <button type="button" className="search-clear" aria-label="Clear the search" title="Clear" onClick={() => setQ('')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" /></svg></button>}
          </span>
          <DbFilter value={seriesF} onChange={(e) => setSeriesF(e.target.value)} options={[['', 'All series'], ...allSeries.map((x) => [x, x])]} label="Series" />
          {editable && <DbAdd label="Add disk" onClick={() => setDraft(emptyDrive())} />}
          <span className="segmented small">
            <button className={view === 'films' ? 'on' : ''} onClick={() => pickView('films')}>Films</button>
            <button className={view === 'shelf' ? 'on' : ''} onClick={() => pickView('shelf')}>Shelf</button>
          </span>
        </div>
      </DbBar>

      {!drives.length ? (
        <Empty title="No disks yet" action={editable && <Button variant="primary" onClick={() => setDraft(emptyDrive())}>Add the first disk</Button>}>
          Add every hard disk and SSD (LION 01, SIMBA 02, TML 05…) and list which projects live on each one. Then anyone can search "where is the Sabanis clip" and get the disk.
        </Empty>
      ) : (
        <>
          <div className="drv-stats">
            <span><b>{stats.disks}</b><small>disks{stats.away ? ` · ${stats.away} not around` : ''}</small></span>
            <span><b>{stats.cap ? fmtGB(stats.cap) : '–'}</b><small>{stats.used ? `${fmtGB(stats.used)} used` : 'space'}</small></span>
            <span><b>{stats.films}</b><small>films archived</small></span>
            <button type="button" className={`drv-risk${oneOnly ? ' on' : ''}${stats.one ? '' : ' none'}`} onClick={() => { setOneOnly(!oneOnly); pickView('films') }} title="Films on one disk only">
              <b>{stats.one}</b><small>{stats.one ? (oneOnly ? 'on one disk only · show all' : 'on one disk only') : 'every film has a copy'}</small>
            </button>
          </div>

          {searching && diskHits.length > 0 && <div className="drv-chips drv-hits">{diskHits.map((d) => diskChip(d))}</div>}

          {searching || view === 'films' ? (
            shownFilms.length
              ? <div className="drv-films">{shownFilms.map(filmTile)}</div>
              : <Empty title={searching ? 'Not on any disk' : 'Nothing here'}>{searching ? `Nothing matches "${q}". Check the spelling or the project name.` : 'No film matches this filter.'}</Empty>
          ) : (
            groups.map(([series, list]) => {
              const full = list.filter((d) => (d.items || []).length)
              const empty = list.filter((d) => !(d.items || []).length)
              return (
                <section key={series} {...sort.row('series', allSeries.indexOf(series))} className={`drv-series ${sort.cls('series', allSeries.indexOf(series))}`} style={{ '--c': hue(series) }}>
                  <h2 className="drv-series-title">
                    {editable && !seriesF && <Grip {...sort.grip('series', allSeries.indexOf(series))} />}
                    <i />{series} <span className="muted small">{list.length} {list.length === 1 ? 'disk' : 'disks'}</span>
                  </h2>
                  <div className="drv-shelf">{full.map(diskCard)}</div>
                  {empty.length > 0 && <div className="drv-chips drv-empty"><span className="muted small">{empty.length} empty</span>{empty.map((d) => diskChip(d, 'ghost'))}</div>}
                </section>
              )
            })
          )}
        </>
      )}

      {/* a disk in its own window: what is on it, each with whether it is anywhere else */}
      <Modal open={!!openedDisk} title={openedDisk?.name || ''} wide onClose={() => setOpenId('')} footer={<Button variant="ghost" onClick={() => setOpenId('')}>Close</Button>}>
        {openedDisk && (() => {
          const d = openedDisk
          const u = diskUse(d)
          return (
            <div className="drv-open" style={{ '--c': hue(seriesOf(d)) }}>
              <div className="drv-open-head">
                <span className="drv-chips">
                  <span className="drv-chip static"><i />{seriesOf(d)}</span>
                  {u.cap > 0 && <span className="drv-chip static">{u.used ? `${fmtGB(u.used)} of ${fmtGB(u.cap)}` : fmtGB(u.cap)}</span>}
                  {d.where && <span className="drv-chip static">{d.where}</span>}
                  <span className="drv-chip static">{statusLabel(d.status)}</span>
                </span>
                {editable && (
                  <span className="drive-open-acts">
                    <Act icon="plus" label="Add project" main onClick={() => setItem({ driveId: d.id, ...emptyItem() })} />
                    <Act icon="edit" label="Edit disk" onClick={() => setDraft({ ...d })} />
                    <ActDelete label="Delete disk" onConfirm={() => { removeDrive(d.id); setOpenId('') }} />
                  </span>
                )}
              </div>
              {u.pct !== null && <div className={`drv-fill big ${u.pct >= 90 ? 'hi' : u.pct >= 70 ? 'mid' : 'lo'}`}><span style={{ width: `${u.pct}%` }} /></div>}
              {d.notes && <p className="small muted">{d.notes}</p>}
              {(d.items || []).length ? (
                <div className="drv-open-list">
                  {d.items.map((it) => {
                    const f = filmOf(it) || { key: it.id, title: it.title, copies: [{ d, it }], cover: '', color: '' }
                    const others = f.copies.filter((c) => c.d.id !== d.id)
                    return (
                      <div key={it.id} className="drv-row">
                        {poster(f, 'sm')}
                        <div className="drv-film-body">
                          <strong>{it.projectId && projTitle(it.projectId) ? <Link to={`/p/${it.projectId}`}>{it.title || projTitle(it.projectId)}</Link> : it.title}</strong>
                          <span className="drv-meta">{[it.size ? (parseSize(it.size) ? fmtGB(parseSize(it.size)) : it.size) : '', it.date, it.notes].filter(Boolean).join(' · ')}</span>
                          <span className="drv-chips">{others.length ? <><span className="muted small">Also on</span>{others.map((c) => diskChip(c.d))}</> : <span className="drv-badge warn">Only on this disk</span>}</span>
                        </div>
                        {editable && (
                          <span className="drive-item-tools">
                            <Act icon="edit" label="Edit" className="act-sm" onClick={() => setItem({ driveId: d.id, ...it })} />
                            <ActDelete small label="Remove" onConfirm={() => removeItem(d.id, it.id)} />
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : <p className="muted">Nothing on this disk yet.{editable ? ' Add the first project.' : ''}</p>}
            </div>
          )
        })()}
      </Modal>

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
