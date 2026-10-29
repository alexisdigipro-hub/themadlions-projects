import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Act, Button, Empty, Field, Input, Modal, useToast } from '../components/ui.jsx'
import { DbBar, DbSearch, ListRow, useFitScroll } from '../components/DbTools.jsx'
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
const size = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1e3))} KB`)
const day = (d) => { const t = d ? new Date(d) : null; return t && !isNaN(t) ? fmtDate(t.toISOString().slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : '' }
const extOf = (n) => (String(n).match(/\.([a-z0-9]{1,6})$/i)?.[1] || '').toUpperCase()
const kindOf = (it) => (it.folder ? 'folder' : it.category === 2 || /^video\//.test(it.type) ? 'video' : it.category === 1 || /^image\//.test(it.type) ? 'image' : it.category === 3 || /^audio\//.test(it.type) ? 'audio' : 'file')
const up = (p) => (p === '/' ? '/' : p.replace(/\/[^/]+$/, '') || '/')
const FOLDER = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" /></svg>
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
  const items = data?.items || []
  const searching = !!q.trim()
  const source = searching && deep?.path === path && deep.items ? deep.items : items
  const shown = useMemo(() => source.filter((i) => !searching || matchText(q, i.name)).slice(0, 400)
    .sort((a, b) => (a.folder !== b.folder ? (a.folder ? -1 : 1) : a.folder ? a.name.localeCompare(b.name) : ((Date.parse(b.modified) || 0) - (Date.parse(a.modified) || 0)) || a.name.localeCompare(b.name))), [source, q])
  const edit = !!data?.edit
  const admin = !!data?.admin

  if (!can(user, 'pcloud')) return <Navigate to="/" replace />

  const openItem = async (it) => {
    if (it.folder) return setPath(it.path, it.folderid)
    const kind = kindOf(it)
    if (kind === 'file') return download(it)
    setOpen({ item: it, url: '' })
    try {
      const r = kind === 'video' ? await pcloudFiles.watch(it.fileid) : { url: await pcloudFiles.link(it.fileid) }
      setOpen((o) => (o?.item === it ? { ...o, url: r.url || 'none', web: !!r.web, failed: !r.url } : o))
    } catch (e) { toast(e.message, 'error'); setOpen(null) }
  }
  const download = async (it) => {
    try {
      const url = await pcloudFiles.link(it.fileid, true)
      const a = document.createElement('a')
      a.href = url; a.download = it.name; a.rel = 'noopener'
      document.body.append(a); a.click(); a.remove()
    } catch (e) { toast(e.message, 'error') }
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
  const row = (it) => (
    <ListRow key={it.folder ? `d${it.folderid}` : `f${it.fileid}`} className="pcf-row" onClick={() => openItem(it)}
      thumb={thumbOf(it)}
      title={it.name}
      sub={[it.folder ? 'Folder' : [extOf(it.name), size(it.size), day(it.modified)].filter(Boolean).join(' · '), searching && up(it.path) !== path ? `in ${up(it.path)}` : ''].filter(Boolean).join(' · ')}
      aside={<span className="pcf-acts">
        {edit && <Act icon="link" label="Copy link" className="act-sm" onClick={() => share(it)} />}
        {!it.folder && <Act icon="download" label="Download" className="act-sm" onClick={() => download(it)} />}
        {edit && <Act icon="edit" label="Rename" className="act-sm" onClick={() => setNaming({ item: it, name: it.name })} />}
        {edit && <button type="button" className="act act-sm" aria-label="Move" title="Move" onClick={() => moveTo(it, up(it.path))}>{MOVE}<span className="act-t">Move</span></button>}
        {edit && (!it.folder || admin) && <ActDelete label="Trash" onConfirm={() => trash(it)} />}
      </span>} />
  )

  return (
    <section className="panel db-card drives drv ids pcf">
      <DbBar slot={slot}>
        <div className="toolbar-info"><strong>pCloud</strong> <span className="muted">{data?.ready ? shown.length : ''}</span></div>
        <div className="toolbar-actions">
          <DbSearch value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" />
          {edit && <Act icon="plus" label="New folder" onClick={() => setNaming({ name: '' })} />}
          {admin && <Act icon="copy" label="Duplicates" onClick={scan} />}
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
              <div className="lrow-list">{shown.map(row)}</div>
            ) : <Empty title={q ? 'Nothing found' : 'An empty folder'}>{q ? `Nothing here matches "${q}".` : edit ? 'Upload files into it, or drop them here.' : 'Nothing in this folder yet.'}</Empty>}
          </div>
        </>
      )}

      {/* a file big: a video plays, a photo shows, a song plays */}
      <Modal open={!!open} wide title={open?.item.name || ''} className="pcf-big" onClose={() => setOpen(null)}
        footer={open ? <><span className="muted">{[extOf(open.item.name), size(open.item.size), day(open.item.modified)].filter(Boolean).join(' · ')}</span><span className="grow" />
          {edit && <Button onClick={() => share(open.item)}>Copy link</Button>}
          <Button variant="primary" onClick={() => download(open.item)}>Download</Button></> : null}>
        {open && (!open.url ? <p className="muted">Loading…</p>
          : kindOf(open.item) === 'video' ? (open.failed
            ? <Empty title="It does not play in the browser">pCloud has no web copy of this video yet (it makes one for most videos; a very big master can take a while). Download it to watch the original.</Empty>
            : <><video className="pcf-media" src={open.url} controls autoPlay playsInline onError={() => setOpen((o) => (o ? { ...o, failed: true } : o))} />
              {open.web && <p className="muted small">A lighter copy to watch here (720p). Download gives the original.</p>}</>)
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
