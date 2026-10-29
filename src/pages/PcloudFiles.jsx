import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Act, Button, Empty, Field, Input, Modal, useToast } from '../components/ui.jsx'
import { DbBar, DbSearch, useFitScroll } from '../components/DbTools.jsx'
import { can, useCurrentUser } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'
import { fmtDate } from '../lib/dates.js'
import { pcloudFiles } from '../lib/pcloud.js'

/* Database > pCloud (Alex, 29 Oct: "a section where we see and manage the pCloud's files, where we keep all the final
   videos"): the whole pCloud through the TML HUB Library app, laid out like Logos: one top row (search, Upload, New
   folder, Duplicates), the places as chips and the folder's path, soft rows (a folder, or a file with its picture), and
   a file opens big (a video plays, a photo shows, anything else downloads). Each row: Share link, Download, Rename,
   Move, Trash. Nothing is deleted for good: pCloud keeps its trash. The permission "pCloud" decides who sees it. */
const PLACES = [['/Projects - FinalCuts', 'Final cuts'], ['/Projects - RoughCuts', 'Rough cuts'], ['/TML HUB', 'TML HUB'], ['/', 'All']]
const START = '/Projects - FinalCuts'
const VIEWS = [['large', 'Large', 'M3 4h8v7H3zM13 4h8v7h-8zM3 13h8v7H3zM13 13h8v7h-8z'], ['tiles', 'Tiles', 'M3 4h5v5H3zM10 4h5v5h-5zM17 4h4v5h-4zM3 11h5v5H3zM10 11h5v5h-5zM17 11h4v5h-4zM3 18h5v2H3zM10 18h5v2h-5z'], ['small', 'Small', 'M3 4h3v3H3zM8 4h3v3H8zM13 4h3v3h-3zM18 4h3v3h-3zM3 10h3v3H3zM8 10h3v3H8zM13 10h3v3h-3zM18 10h3v3h-3zM3 16h3v3H3zM8 16h3v3H8zM13 16h3v3h-3zM18 16h3v3h-3z'], ['list', 'List', 'M3 5h3M9 5h12M3 12h3M9 12h12M3 19h3M9 19h12']]
const SORTS = [['new', 'Newest first'], ['old', 'Oldest first'], ['az', 'Name A to Z'], ['za', 'Name Z to A'], ['big', 'Biggest first'], ['small', 'Smallest first'], ['kind', 'By type']]
const KINDS = [['all', 'Everything'], ['video', 'Videos'], ['image', 'Photos'], ['audio', 'Sound'], ['file', 'Other files']]
const size = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1e3))} KB`)
const day = (d) => { const t = d ? new Date(d) : null; return t && !isNaN(t) ? fmtDate(t.toISOString().slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : '' }
const extOf = (n) => (String(n).match(/\.([a-z0-9]{1,6})$/i)?.[1] || '').toUpperCase()
const kindOf = (it) => (it.folder ? 'folder' : it.category === 2 || /^video\//.test(it.type) ? 'video' : it.category === 1 || /^image\//.test(it.type) ? 'image' : it.category === 3 || /^audio\//.test(it.type) ? 'audio' : 'file')
const up = (p) => (p === '/' ? '/' : p.replace(/\/[^/]+$/, '') || '/')
const FOLDER = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" /></svg>
const DOTS = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="18.5" cy="12" r="1.8" /></svg>
const MOVE = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" /><path d="M10 13.5h6M13.5 11l2.5 2.5-2.5 2.5" /></svg>

function ActDelete({ label, onConfirm }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t) }, [armed])
  return <Act icon="trash" label={armed ? `Sure? ${label}` : label} className={`act-del act-sm${armed ? ' armed' : ''}`} onClick={() => { if (armed) { setArmed(false); onConfirm() } else setArmed(true) }} />
}

export default function PcloudFiles({ slot }) {
  const user = useCurrentUser()
  const toast = useToast()
  const [path, setPathRaw] = useState(() => { try { return localStorage.getItem('tml_pcloud_path') || START } catch { return START } })
  const [data, setData] = useState(null) // { ready, items, edit, admin }
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const [open, setOpen] = useState(null) // { item, url }
  const [naming, setNaming] = useState(null) // { item?, name } (new folder when no item)
  const [moving, setMoving] = useState(null) // { item, at, folders }
  const [dupes, setDupes] = useState(null) // null | { loading } | result with keep/sel
  // Tiles (pictures big, for the final videos) or a list, remembered on this device
  // how the folder is shown, sorted and filtered (Alex, 29 Oct: "more view modes, and what I can change while I look"),
  // each remembered on this device
  const remembered = (k, ok, d) => { try { const v = localStorage.getItem(k); return ok.includes(v) ? v : d } catch { return d } }
  const [view, setView] = useState(() => remembered('tml_pcloud_view', VIEWS.map((v) => v[0]), 'tiles'))
  const [sort, setSort] = useState(() => remembered('tml_pcloud_sort', SORTS.map((v) => v[0]), 'new'))
  const [only, setOnly] = useState(() => remembered('tml_pcloud_only', KINDS.map((v) => v[0]), 'all'))
  const keep = (k, v) => { try { localStorage.setItem(k, v) } catch { /* private window */ } }
  const pickView = (v) => { setView(v); keep('tml_pcloud_view', v) }
  const pickSort = (v) => { setSort(v); keep('tml_pcloud_sort', v) }
  const pickOnly = (v) => { setOnly(v); keep('tml_pcloud_only', v) }
  const [menu, setMenu] = useState(0) // the folder whose ⋯ menu is open
  const [sure, setSure] = useState(null) // a folder about to go to the trash, asked first
  const [deep, setDeep] = useState(null) // the search under this folder: { q, path, items | null, folders, files, error }
  const pick = useRef(null)
  const scrollRef = useFitScroll(data === null)

  // the folder's number goes with its path when it was opened from the list, so it opens whatever its name holds
  const fid = useRef(0)
  const setPath = (p, folderid = 0) => { fid.current = folderid; setPathRaw(p); setQ(''); try { localStorage.setItem('tml_pcloud_path', p) } catch { /* private window */ } }
  const load = useCallback(async (p = path) => {
    pcloudFiles.forget()
    try { const r = await pcloudFiles.list(p, fid.current); setData(r); setError('') } catch (e) {
      // stays in this folder and says why (it used to jump back to Final cuts, Alex 29 Oct)
      setError(/does not exist|not found|2005/i.test(e.message) ? `pCloud cannot find ${p}: it may have been moved or renamed. Go up a folder.` : e.message)
      setData({ ready: true, items: [] })
    }
  }, [path]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setData(null); load(path) }, [path]) // eslint-disable-line react-hooks/exhaustive-deps

  // a search looks in every folder under this one (Alex, 29 Oct: "the search does not work" when it only looked here)
  useEffect(() => {
    const term = q.trim()
    if (!term) { setDeep(null); return }
    const stop = new AbortController()
    const t = setTimeout(async () => {
      setDeep((d) => ({ q: term, path, items: d?.path === path ? d.items : null, folders: 0, files: 0 }))
      try {
        const all = await pcloudFiles.index(path, (folders, files) => setDeep((d) => (d && d.path === path ? { ...d, folders, files } : d)), stop.signal)
        if (!stop.signal.aborted) setDeep({ q: term, path, items: all })
      } catch (e) { if (!stop.signal.aborted) setDeep({ q: term, path, items: [], error: e.message }) }
    }, 450)
    return () => { clearTimeout(t); stop.abort() }
  }, [q, path])
  useEffect(() => { if (!menu) return; const off = () => setMenu(0); window.addEventListener('click', off); return () => window.removeEventListener('click', off) }, [menu])
  const items = data?.items || []
  const searching = !!q.trim()
  const source = searching && deep?.path === path && deep.items ? deep.items : items
  const shown = useMemo(() => {
    const t = (i) => Date.parse(i.modified) || 0
    const by = {
      new: (a, b) => t(b) - t(a), old: (a, b) => t(a) - t(b),
      az: (a, b) => a.name.localeCompare(b.name, 'el', { numeric: true }), za: (a, b) => b.name.localeCompare(a.name, 'el', { numeric: true }),
      big: (a, b) => (b.size || 0) - (a.size || 0), small: (a, b) => (a.size || 0) - (b.size || 0),
      kind: (a, b) => extOf(a.name).localeCompare(extOf(b.name)) || a.name.localeCompare(b.name, 'el', { numeric: true }),
    }[sort] || (() => 0)
    return source
      .filter((i) => (!searching || matchText(q, i.name)) && (only === 'all' || (i.folder ? !searching : kindOf(i) === only)))
      // folders first, by name unless a name order is chosen; then the files in the chosen order
      .sort((a, b) => (a.folder !== b.folder ? (a.folder ? -1 : 1) : a.folder && !['az', 'za'].includes(sort) ? a.name.localeCompare(b.name, 'el', { numeric: true }) : by(a, b) || a.name.localeCompare(b.name)))
      .slice(0, 600)
  }, [source, q, sort, only]) // eslint-disable-line react-hooks/exhaustive-deps
  const edit = !!data?.edit
  const admin = !!data?.admin

  if (!can(user, 'pcloud')) return <Navigate to="/" replace />

  const openItem = async (it) => {
    if (it.folder) return setPath(it.path, it.folderid)
    const kind = kindOf(it)
    if (kind === 'file') return setOpen({ item: it, url: 'none', none: true })
    setOpen({ item: it, url: '' })
    try {
      const r = kind === 'video' ? await pcloudFiles.watch(it.fileid) : { url: await pcloudFiles.link(it.fileid) }
      // a video tries what a browser plays best first: an mp4 / m4v / webm as it is, anything else (a mov master) the
      // 720p web copy; when that does not play, the other one
      const tries = kind === 'video' ? (/\.(mp4|m4v|webm)$/i.test(it.name) ? [r.url, r.web] : [r.web, r.url]).filter(Boolean) : [r.url]
      setOpen((o) => (o?.item === it ? { ...o, url: tries[0] || 'none', tries, webUrl: r.web, failed: !tries[0] } : o))
    } catch (e) { toast(e.message, 'error'); setOpen(null) }
  }
  const download = async (it) => {
    // a window opened now, while the click still counts, so Safari lets it through; the address follows
    const big = it.size > 400e6
    const w = big ? window.open('', '_blank') : null
    try {
      const r = await pcloudFiles.download(it)
      if (r.page || big) {
        if (w) w.location.href = r.url; else window.open(r.url, '_blank')
        toast('pCloud\'s download page opened in a new tab', 'ok')
        return
      }
      const a = document.createElement('a')
      a.href = r.url; a.download = it.name; a.rel = 'noopener'
      document.body.append(a); a.click(); a.remove()
    } catch (e) { w?.close(); toast(e.message, 'error') }
  }
  const share = async (it) => {
    try {
      const url = await pcloudFiles.share(it)
      try { await navigator.clipboard.writeText(url); toast('Link copied', 'ok') } catch { window.prompt('The link', url) }
    } catch (e) { toast(e.message, 'error') }
  }
  const upload = async (files) => {
    const all = [...files]
    if (!all.length) return
    let done = 0
    for (const f of all) {
      try {
        await pcloudFiles.upload(path, f, (p) => setBusy(`Uploading ${done + 1} of ${all.length}: ${f.name} · ${Math.round(p * 100)}%`))
        done++
      } catch (e) { toast(`${f.name}: ${e.message}`, 'error') }
    }
    setBusy('')
    if (done) toast(done === 1 ? 'Uploaded to pCloud' : `${done} uploaded to pCloud`, 'ok')
    load()
  }
  const saveName = async () => {
    const name = String(naming?.name || '').trim()
    if (!name) return toast('Write a name.', 'error')
    try {
      if (naming.item) await pcloudFiles.rename(naming.item, name)
      else await pcloudFiles.mkdir(path, name)
      setNaming(null); load()
    } catch (e) { toast(e.message, 'error') }
  }
  const trash = async (it) => {
    try { await pcloudFiles.trash(it); toast('In pCloud\'s trash: it can be put back from there', 'ok'); load() } catch (e) { toast(e.message, 'error') }
  }
  // Move: a small folder picker that starts where the item is
  const moveTo = async (it, at) => {
    setMoving({ item: it, at, folders: null })
    try { const r = await pcloudFiles.list(at); setMoving((m) => (m?.item === it ? { ...m, at, folders: (r.items || []).filter((x) => x.folder && x.path !== it.path) } : m)) } catch (e) { toast(e.message, 'error') }
  }
  const moveHere = async () => {
    try { await pcloudFiles.move(moving.item, moving.at); toast(`Moved to ${moving.at}`, 'ok'); setMoving(null); load() } catch (e) { toast(e.message, 'error') }
  }
  // Duplicates: the same content twice or more, kept is the oldest unless chosen otherwise; the rest chosen for the trash
  const scan = async () => {
    setDupes({ loading: true })
    try {
      const r = await pcloudFiles.dupes(path, (folders, files) => setDupes((d) => (d?.loading ? { loading: true, folders, files } : d)))
      setDupes({ ...r, keep: Object.fromEntries(r.groups.map((g, i) => [i, g.files[0].fileid])), sel: {} })
    } catch (e) { toast(e.message, 'error'); setDupes(null) }
  }
  const chosen = dupes?.groups ? dupes.groups.flatMap((g, i) => g.files.filter((f) => f.fileid !== dupes.keep[i] && dupes.sel[f.fileid] !== false)) : []
  const freeing = chosen.reduce((n, f) => n + f.size, 0)
  const trashDupes = async () => {
    let done = 0
    for (const f of chosen) {
      setBusy(`To the trash ${done + 1} of ${chosen.length}`)
      try { await pcloudFiles.trash(f); done++ } catch (e) { toast(`${f.name}: ${e.message}`, 'error') }
    }
    setBusy('')
    toast(`${done} moved to pCloud's trash · ${size(freeing)} freed`, 'ok')
    setDupes(null); load()
  }

  const crumbs = path === '/' ? [] : path.slice(1).split('/')
  const thumbOf = (it) => {
    const k = kindOf(it)
    if (it.thumbUrl) return <span className={`pcf-thumb ${k}`}><img src={it.thumbUrl} alt="" loading="lazy" />{k === 'video' && <i className="pcf-play" />}</span>
    return <span className={`pcf-thumb ${k}`}>{it.folder ? FOLDER : <b>{extOf(it.name) || '?'}</b>}</span>
  }

  const acts = (it) => (
    <span className="pcf-acts" onClick={(e) => e.stopPropagation()}>
      {edit && <Act icon="link" label="Copy link" className="act-sm" onClick={() => share(it)} />}
      {!it.folder && <Act icon="download" label="Download" className="act-sm" onClick={() => download(it)} />}
      {edit && <Act icon="edit" label="Rename" className="act-sm" onClick={() => setNaming({ item: it, name: it.name })} />}
      {edit && <button type="button" className="act act-sm" aria-label="Move" title="Move" onClick={() => moveTo(it, up(it.path))}>{MOVE}<span className="act-t">Move</span></button>}
      {edit && (!it.folder || admin) && <ActDelete label="Trash" onConfirm={() => trash(it)} />}
    </span>
  )
  const tile = (it) => (
    <article key={it.folder ? `d${it.folderid}` : `f${it.fileid}`} className={`pcf-tile ${kindOf(it)}`} role="button" tabIndex={0}
      onClick={() => openItem(it)} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openItem(it) }}>
      <span className="pcf-tile-pic">{thumbOf(it)}</span>
      <span className="pcf-tile-txt">
        <strong title={it.name}>{it.name}</strong>
        <small>{[it.folder ? 'Folder' : [extOf(it.name), size(it.size)].filter(Boolean).join(' · '), searching && up(it.path) !== path ? up(it.path).split('/').pop() : day(it.modified)].filter(Boolean).join(' · ')}</small>
      </span>
      {acts(it)}
    </article>
  )
  const folderTile = (it) => (
    <article key={`d${it.folderid}`} className="pcf-ftile" role="button" tabIndex={0}
      onClick={() => openItem(it)} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openItem(it) }}>
      <span className="pcf-ftile-ico">{FOLDER}</span>
      <span className="pcf-tile-txt"><strong title={it.name}>{it.name}</strong>{searching && up(it.path) !== path && <small>{up(it.path).split('/').pop() || 'pCloud'}</small>}</span>
      {edit && (
        <span className="pcf-more" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="pcf-more-btn" aria-label={`More for ${it.name}`} title="More" aria-expanded={menu === it.folderid} onClick={() => setMenu(menu === it.folderid ? 0 : it.folderid)}>{DOTS}</button>
          {menu === it.folderid && (
            <span className="pcf-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setMenu(0); share(it) }}>Copy link</button>
              <button type="button" role="menuitem" onClick={() => { setMenu(0); setNaming({ item: it, name: it.name }) }}>Rename</button>
              <button type="button" role="menuitem" onClick={() => { setMenu(0); moveTo(it, up(it.path)) }}>Move</button>
              {admin && <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(0); setSure(it) }}>Move to trash</button>}
            </span>
          )}
        </span>
      )}
    </article>
  )
  const line = (it) => (
    <div key={it.folder ? `d${it.folderid}` : `f${it.fileid}`} className="pcf-tr" role="row" tabIndex={0}
      onClick={() => openItem(it)} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openItem(it) }}>
      <span className="pcf-col name">
        <span className="pcf-mini">{thumbOf(it)}</span>
        <span className="pcf-nm"><b title={it.name}>{it.name}</b>{searching && up(it.path) !== path && <small>{up(it.path)}</small>}</span>
      </span>
      <span className="pcf-col kind">{it.folder ? 'Folder' : extOf(it.name) || '—'}</span>
      <span className="pcf-col size">{it.folder ? '' : size(it.size)}</span>
      <span className="pcf-col date">{day(it.modified)}</span>
      <span className="pcf-col acts">{it.folder ? (edit && <Act icon="edit" label="Rename" className="act-sm" onClick={(e) => { e.stopPropagation(); setNaming({ item: it, name: it.name }) }} />) : acts(it)}</span>
    </div>
  )
  const nFolders = shown.filter((i) => i.folder).length
  const nFiles = shown.length - nFolders
  const bytes = shown.reduce((n, i) => n + (i.size || 0), 0)

  return (
    <section className="panel db-card drives drv ids pcf">
      <DbBar slot={slot}>
        <div className="toolbar-info"><strong>pCloud</strong> <span className="muted">{data?.ready ? shown.length : ''}</span></div>
        <div className="toolbar-actions">
          <DbSearch value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" />
          <span className="segmented small ids-view pcf-view" role="group" aria-label="View">
            {VIEWS.map(([v, l, d]) => (
              <button key={v} className={view === v ? 'on' : ''} onClick={() => pickView(v)} title={l} aria-label={l} aria-pressed={view === v}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill={v === 'list' ? 'none' : 'currentColor'} stroke={v === 'list' ? 'currentColor' : 'none'} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d={d} /></svg>
              </button>
            ))}
          </span>
          {edit && <Act icon="plus" label="New folder" className="act-sm" onClick={() => setNaming({ name: '' })} />}
          {admin && <Act icon="copy" label="Duplicates" className="act-sm" onClick={scan} />}
          {edit && <Act icon="expense" label="Upload" main onClick={() => pick.current?.click()} />}
        </div>
      </DbBar>
      <input ref={pick} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = '' }} />

      {data?.demo && <p className="ids-note">Trying it out: a made-up pCloud, nothing here is real. On hub.themadlions.com this is the company pCloud.</p>}
      {data && data.ready === false ? (
        <Empty title="pCloud is not linked yet">The function needs the token of the TML HUB Library app (PCLOUD_FULL_TOKEN in Supabase, Edge Functions, Secrets). Then this shows the whole pCloud.</Empty>
      ) : (
        <>
          <div className="pcf-places">
            {PLACES.map(([p, l]) => <button key={p} type="button" className={`lchip${path === p || (p !== '/' && path.startsWith(p + '/')) ? ' acc on' : ''}`} onClick={() => setPath(p)}><i />{l}</button>)}
            {data?.ready && <span className="pcf-tools">
              <label className="pcf-pick-sel" title="Show"><select value={only} onChange={(e) => pickOnly(e.target.value)} aria-label="Show">{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label className="pcf-pick-sel" title="Order"><select value={sort} onChange={(e) => pickSort(e.target.value)} aria-label="Order">{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            </span>}
            {data?.ready && <span className="pcf-count">{[nFolders && (nFolders === 1 ? '1 folder' : `${nFolders} folders`), nFiles && (nFiles === 1 ? '1 file' : `${nFiles} files`), bytes && size(bytes)].filter(Boolean).join(' · ')}</span>}
          </div>
          <nav className="pcf-crumbs" aria-label="Folder">
            {path !== '/' && <button type="button" className="pcf-upbtn" onClick={() => setPath(up(path))} aria-label="Up one folder" title="Up one folder">‹</button>}
            <button type="button" onClick={() => setPath('/')}>pCloud</button>
            {crumbs.map((c, i) => <span key={i}><i>/</i><button type="button" onClick={() => setPath('/' + crumbs.slice(0, i + 1).join('/'))}>{c}</button></span>)}
          </nav>
          {error && <p className="ids-note err">{error}</p>}
          {busy && <p className="ids-note busy"><span className="ids-spin" />{busy}</p>}
          {searching && deep && !deep.items && <p className="ids-note busy"><span className="ids-spin" />{`Searching every folder in ${path === '/' ? 'pCloud' : path}`}{deep.folders ? ` · ${deep.folders} folders, ${deep.files} files` : '…'}</p>}
          {searching && deep?.error && <p className="ids-note err">{deep.error}</p>}
          <div className="ab-scroll" ref={scrollRef}
            onDragOver={(e) => edit && e.preventDefault()} onDrop={(e) => { if (!edit) return; e.preventDefault(); upload(e.dataTransfer.files) }}>
            {data === null ? <p className="muted ids-wait">Loading…</p> : shown.length ? (
              view !== 'list' ? <>
                {/* folders small, above; the files with their pictures, large, as tiles or small */}
                {shown.some((i) => i.folder) && <div className="pcf-folders">{shown.filter((i) => i.folder).map(folderTile)}</div>}
                {shown.some((i) => !i.folder) && <div className={`pcf-grid ${view}`}>{shown.filter((i) => !i.folder).map(tile)}</div>}
              </> : (
                <div className="pcf-table" role="table">
                  {/* the list as a file manager's: the column titles sort it, again turns the order round */}
                  <div className="pcf-th" role="row">
                    {[['name', 'Name', 'az', 'za'], ['kind', 'Type', 'kind', 'kind'], ['size', 'Size', 'big', 'small'], ['date', 'Modified', 'new', 'old']].map(([k, l, a1, a2]) => (
                      <button key={k} type="button" className={`pcf-col ${k}${sort === a1 || sort === a2 ? ' on' : ''}`} onClick={() => pickSort(sort === a1 ? a2 : a1)}>
                        {l}{(sort === a1 || sort === a2) && k !== 'kind' && <i aria-hidden="true">{['az', 'small', 'old'].includes(sort) ? '↑' : '↓'}</i>}
                      </button>
                    ))}
                    <span className="pcf-col acts" />
                  </div>
                  {shown.map(line)}
                </div>
              )
            ) : <Empty title={q ? 'Nothing found' : 'An empty folder'}>{q ? `Nothing here matches "${q}".` : edit ? 'Upload files into it, or drop them here.' : 'Nothing in this folder yet.'}</Empty>}
          </div>
        </>
      )}

      {/* a file big: a video plays, a photo shows, a song plays */}
      <Modal open={!!open} wide title={open?.item.name || ''} className="pcf-big" onClose={() => setOpen(null)}
        footer={open ? <><span className="muted pcf-big-meta">{[extOf(open.item.name), size(open.item.size), day(open.item.modified)].filter(Boolean).join(' · ')}</span><span className="grow" />
          {edit && <span className="pcf-acts">
            <Act icon="link" label="Copy link" className="act-sm" onClick={() => share(open.item)} />
            <Act icon="edit" label="Rename" className="act-sm" onClick={() => { const it = open.item; setOpen(null); setNaming({ item: it, name: it.name }) }} />
            <button type="button" className="act act-sm" aria-label="Move" title="Move" onClick={() => { const it = open.item; setOpen(null); moveTo(it, up(it.path)) }}>{MOVE}<span className="act-t">Move</span></button>
            <ActDelete label="Trash" onConfirm={() => { const it = open.item; setOpen(null); trash(it) }} />
          </span>}
          <Button variant="primary" onClick={() => download(open.item)}>Download</Button></> : null}>
        {open && (open.none ? <Empty title="No preview for this kind of file">Download it to open it on this computer.</Empty>
          : !open.url ? <p className="muted">Loading…</p>
          : kindOf(open.item) === 'video' ? (open.failed
            ? <Empty title="It does not play in the browser">Neither the original nor pCloud's lighter web copy plays here (pCloud makes the copy for most videos; a very big master can take a while). Download it to watch it on this computer.</Empty>
            : <><video className="pcf-media" src={open.url} controls autoPlay playsInline key={open.url} onError={() => setOpen((o) => {
                if (!o) return o
                const next = (o.tries || [])[(o.tries || []).indexOf(o.url) + 1]
                return next ? { ...o, url: next } : { ...o, failed: true }
              })} />
              {open.url === open.webUrl && <p className="muted small">A lighter copy to watch here (720p). Download gives the original.</p>}</>)
          : kindOf(open.item) === 'audio' ? <audio className="pcf-audio" src={open.url} controls autoPlay />
          : <img className="pcf-media" src={open.url} alt={open.item.name} />)}
      </Modal>

      <Modal open={!!naming} title={naming?.item ? 'Rename' : 'New folder'} onClose={() => setNaming(null)}
        footer={<><Button variant="ghost" onClick={() => setNaming(null)}>Cancel</Button><Button variant="primary" onClick={saveName}>{naming?.item ? 'Save' : 'Make the folder'}</Button></>}>
        {naming && (
          <Field label="Name" hint={naming.item ? '' : `In ${path === '/' ? 'pCloud' : path}`}>
            <Input autoFocus value={naming.name} onChange={(e) => setNaming({ ...naming, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') saveName() }} />
          </Field>
        )}
      </Modal>

      <Modal open={!!moving} title={moving ? `Move ${moving.item.name}` : ''} onClose={() => setMoving(null)}
        footer={moving ? <><Button variant="ghost" onClick={() => setMoving(null)}>Cancel</Button><Button variant="primary" onClick={moveHere} disabled={moving.at === up(moving.item.path)}>Move here</Button></> : null}>
        {moving && (
          <div className="stack">
            <nav className="pcf-crumbs small">
              {moving.at !== '/' && <button type="button" className="pcf-upbtn" onClick={() => moveTo(moving.item, up(moving.at))} aria-label="Up one folder">‹</button>}
              <b>{moving.at === '/' ? 'pCloud' : moving.at}</b>
            </nav>
            {moving.folders === null ? <p className="muted">Loading…</p> : moving.folders.length ? (
              <div className="pcf-pick">{moving.folders.map((f) => <button key={f.folderid} type="button" onClick={() => moveTo(moving.item, f.path)}>{FOLDER}<span>{f.name}</span></button>)}</div>
            ) : <p className="muted small">No folders in here.</p>}
          </div>
        )}
      </Modal>

      <Modal open={!!sure} title={sure ? `Move ${sure.name} to the trash?` : ''} onClose={() => setSure(null)}
        footer={<><Button variant="ghost" onClick={() => setSure(null)}>Cancel</Button><Button variant="danger" onClick={() => { const it = sure; setSure(null); trash(it) }}>Move to trash</Button></>}>
        <p className="small muted">The folder and everything in it go to pCloud's trash, where they can be put back.</p>
      </Modal>

      <Modal open={!!dupes} wide title="Duplicates" onClose={() => !busy && setDupes(null)}
        footer={dupes?.groups ? <><span className="muted">{chosen.length ? `${chosen.length} chosen · ${size(freeing)}` : 'Nothing chosen'}</span><span className="grow" />
          <Button variant="ghost" onClick={() => setDupes(null)} disabled={!!busy}>Close</Button>
          <Button variant="primary" onClick={trashDupes} disabled={!chosen.length || !!busy}>{busy || `Move ${chosen.length} to pCloud's trash`}</Button></> : null}>
        {dupes?.loading ? <p className="muted">{`Reading ${path === '/' ? 'the whole pCloud' : path}, folder by folder`}{dupes.folders ? ` · ${dupes.folders} folders, ${dupes.files} files so far` : '…'}</p> : dupes?.groups && (
          <div className="stack">
            <p className="small muted">{`${dupes.scanned} files in ${dupes.folders} folders read in ${dupes.path === '/' ? 'the whole pCloud' : dupes.path}. `}{dupes.count ? `${dupes.count} files are in more than one place, the same content byte for byte whatever the name, ${size(dupes.waste)} twice. One of each stays (the oldest, or the one you pick); the others go to pCloud's trash, where they can be put back.` : 'Nothing is there twice, from 1 MB up.'}</p>
            {dupes.groups.map((g, i) => (
              <div key={i} className="pcf-dupe">
                <div className="pcf-dupe-h"><b>{g.files[0].name}</b><span className="muted small">{size(g.size)} · {g.files.length} copies</span></div>
                {g.files.map((f) => {
                  const keep = dupes.keep[i] === f.fileid
                  return (
                    <label key={f.fileid} className={`pcf-dupe-f${keep ? ' keep' : ''}`}>
                      <input type="radio" name={`keep${i}`} checked={keep} onChange={() => setDupes({ ...dupes, keep: { ...dupes.keep, [i]: f.fileid } })} />
                      <span className="pcf-dupe-p">{up(f.path)}/<b>{f.name}</b></span>
                      <span className="muted small">{day(f.created || f.modified)}</span>
                      {keep ? <span className="lchip acc"><i />Stays</span> : (
                        <button type="button" className={`lchip${dupes.sel[f.fileid] === false ? '' : ' warn'}`} onClick={(e) => { e.preventDefault(); setDupes({ ...dupes, sel: { ...dupes.sel, [f.fileid]: dupes.sel[f.fileid] === false } }) }}>
                          <i />{dupes.sel[f.fileid] === false ? 'Leave it' : 'To the trash'}
                        </button>
                      )}
                    </label>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </section>
  )
}
