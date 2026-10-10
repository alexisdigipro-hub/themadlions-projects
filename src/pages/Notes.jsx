import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile, useToast } from '../components/ui.jsx'
import { uid } from '../lib/store.jsx'
import { deleteNotes, loadNotes, noteText, saveNote } from '../lib/notes.js'

/*
  Notes, like Apple Notes (Alex, 8 Oct): each person's own, nobody else sees them. Folders on the
  left (All Notes, Notes, your folders, Recently Deleted), the notes of the folder in the middle
  grouped Pinned / Today / Yesterday / Previous 7 Days / Previous 30 Days / by month, the note on
  the right. The first line of a note is its title and the next one its preview. The editor is the
  Office document editor (lib/office/docView.js): headings, bold, lists, checklists, tables,
  pictures. Saved 0.8 s after the last change and when you leave the note; a note left empty is
  dropped. On a phone (Alex, 10 Oct: "Notes like Tasks") it opens straight on the notes, with Search and a
  Folders button on one line at the top and the folders folded away under that button; a note opens
  over the list and ‹ goes back to it.
*/

const ALL = 'all'
const NONE = 'notes' // notes in no folder
const TRASH = 'trash'
const DAY = 86400000
const SAVE_AFTER = 800
const now = () => new Date().toISOString()

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime() }
function bucket(iso) {
  const t = new Date(iso).getTime()
  const today = startOfDay()
  if (t >= today) return 'Today'
  if (t >= today - DAY) return 'Yesterday'
  if (t >= today - 7 * DAY) return 'Previous 7 Days'
  if (t >= today - 30 * DAY) return 'Previous 30 Days'
  const d = new Date(iso)
  return d.getFullYear() === new Date().getFullYear() ? d.toLocaleDateString('en-GB', { month: 'long' }) : String(d.getFullYear())
}
function when(iso) {
  const d = new Date(iso)
  if (d.getTime() >= startOfDay()) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (d.getTime() >= startOfDay() - 7 * DAY) return d.toLocaleDateString('en-GB', { weekday: 'long' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' })
}
const longDate = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(', ', ' at ')

/* The editor, mounted once per note: the note's html goes in, every change comes out. */
function Editor({ note, onChange }) {
  const host = useRef(null)
  const change = useRef(onChange)
  change.current = onChange
  useEffect(() => {
    let view = null
    let live = true
    let start = ''
    // every change carries the id of the note this editor was opened on, so a late one can never land in the next note
    const id = note.id
    import('../lib/office/docView.js').then(({ mountDoc }) => {
      if (!live || !host.current) return
      view = mountDoc(host.current, note.body || '<h1><br></h1>', { onChange: (html) => { start = html; change.current(id, html) } })
      start = view.getHtml()
      // a new note opens ready to type
      if (!noteText(note.body).length) setTimeout(() => { view?.focus?.() }, 30)
    })
    return () => {
      live = false
      // what was typed in the last moment, before the editor's own short wait was over
      if (view) { const html = view.getHtml(); if (html !== start) change.current(id, html) }
      view?.destroy?.()
    }
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={host} className="notes-doc" />
}

/* slot: on a computer the search goes up on the tabs' row of the Office page, as Office's does (Alex, 10 Oct) */
export default function Notes({ slot = null }) {
  const toast = useToast()
  const mobile = useIsMobile()
  const [items, setItems] = useState(null) // notes and folders, null while loading
  const [err, setErr] = useState('')
  const [folder, setFolder] = useState(() => { try { return localStorage.getItem('tml_notes_folder') || ALL } catch { return ALL } })
  const [openId, setOpenId] = useState('')
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false) // phone: the folders folded open over the notes
  const [quick, setQuick] = useState('')
  const [renaming, setRenaming] = useState(null) // { id, name }
  const pending = useRef(new Map()) // id -> timer, a save waiting
  const itemsRef = useRef(items)
  itemsRef.current = items

  const reload = useCallback(async () => {
    try {
      const rows = await loadNotes()
      // Recently Deleted keeps a note 30 days
      const old = rows.filter((n) => n.deletedAt && Date.now() - new Date(n.deletedAt).getTime() > 30 * DAY).map((n) => n.id)
      if (old.length) deleteNotes(old).catch(() => {})
      setItems((prev) => {
        const fresh = rows.filter((n) => !old.includes(n.id))
        // a note being typed in keeps what is on screen, not an older copy from the server
        if (!prev) return fresh
        const typing = new Set(pending.current.keys())
        return fresh.map((n) => (typing.has(n.id) ? prev.find((p) => p.id === n.id) || n : n)).concat(prev.filter((p) => typing.has(p.id) && !fresh.some((n) => n.id === p.id)))
      })
      setErr('')
    } catch (e) {
      setErr(e.message)
      setItems((p) => p || [])
    }
  }, [])
  useEffect(() => { reload() }, [reload])
  // another device may have written meanwhile
  useEffect(() => {
    const onFocus = () => { if (!pending.current.size) reload() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])
  useEffect(() => { try { localStorage.setItem('tml_notes_folder', folder) } catch {} }, [folder])

  const persist = useCallback((n) => saveNote(n).catch((e) => toast(e.message, 'error')), [toast])
  const flush = useCallback((id) => {
    const t = pending.current.get(id)
    if (!t) return
    clearTimeout(t)
    pending.current.delete(id)
    const n = itemsRef.current?.find((x) => x.id === id)
    if (n) persist(n)
  }, [persist])
  const flushAll = useCallback(() => { [...pending.current.keys()].forEach(flush) }, [flush])
  useEffect(() => {
    const out = () => flushAll()
    window.addEventListener('pagehide', out)
    return () => { window.removeEventListener('pagehide', out); flushAll() }
  }, [flushAll])

  const patch = (id, p, { soon = false } = {}) => {
    const cur = itemsRef.current?.find((n) => n.id === id)
    if (!cur) return
    const next = { ...cur, ...p, updatedAt: now() }
    itemsRef.current = itemsRef.current.map((n) => (n.id === id ? next : n))
    setItems((list) => list.map((n) => (n.id === id ? { ...n, ...p, updatedAt: next.updatedAt } : n)))
    clearTimeout(pending.current.get(id))
    if (soon) pending.current.set(id, setTimeout(() => flush(id), SAVE_AFTER))
    else { pending.current.delete(id); persist(next) }
  }

  const all = items || []
  const folders = all.filter((n) => n.kind === 'folder' && !n.deletedAt).sort((a, b) => a.title.localeCompare(b.title))
  const notes = all.filter((n) => n.kind === 'note')
  const live = notes.filter((n) => !n.deletedAt)
  const trash = notes.filter((n) => n.deletedAt)
  const inFolder = (f) => (f === ALL ? live : f === TRASH ? trash : f === NONE ? live.filter((n) => !n.folderId || !folders.some((x) => x.id === n.folderId)) : live.filter((n) => n.folderId === f))
  const folderName = folder === ALL ? 'All Notes' : folder === NONE ? 'Notes' : folder === TRASH ? 'Recently Deleted' : folders.find((f) => f.id === folder)?.title || 'Notes'
  useEffect(() => { if (items && ![ALL, NONE, TRASH].includes(folder) && !folders.some((f) => f.id === folder)) setFolder(ALL) }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return inFolder(folder)
      .map((n) => ({ ...n, lines: noteText(n.body) }))
      .filter((n) => !words.length || words.every((w) => n.lines.join(' ').toLowerCase().includes(w)))
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  }, [items, folder, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => {
    const out = []
    const add = (label, n) => { let g = out.find((x) => x.label === label); if (!g) out.push(g = { label, list: [] }); g.list.push(n) }
    shown.filter((n) => n.pinned && folder !== TRASH).forEach((n) => add('Pinned', n))
    shown.filter((n) => !n.pinned || folder === TRASH).forEach((n) => add(bucket(n.updatedAt), n))
    return out
  }, [shown, folder])

  const open = all.find((n) => n.id === openId && n.kind === 'note') || null
  // the note left behind: saved now, or dropped if nothing was written in it
  const leave = (id) => {
    if (!id) return
    const n = itemsRef.current?.find((x) => x.id === id)
    if (n && !n.deletedAt && !noteText(n.body).length) {
      clearTimeout(pending.current.get(id)); pending.current.delete(id)
      setItems((list) => list.filter((x) => x.id !== id))
      deleteNotes([id]).catch(() => {})
      return
    }
    flush(id)
  }
  const select = (id) => { if (id !== openId) leave(openId); setOpenId(id) }
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // a title typed in "+ New Note…" starts the note with it; ✎ starts an empty one
  const newNote = (title = '') => {
    if (folder === TRASH) setFolder(ALL)
    const t = now()
    const body = title ? `<h1>${esc(title)}</h1><p><br></p>` : '<h1><br></h1>'
    const n = { id: uid(), kind: 'note', folderId: [ALL, NONE, TRASH].includes(folder) ? '' : folder, title, body, pinned: false, createdAt: t, updatedAt: t, deletedAt: '' }
    leave(openId)
    setItems((list) => [n, ...list])
    setOpenId(n.id)
    setQ('')
    setQuick('')
    // written to the database once something is typed in it, or now when it already has a title
    if (title) persist(n)
  }
  const onBody = (id, html) => {
    const lines = noteText(html)
    patch(id, { body: html, title: lines[0] || '' }, { soon: true })
  }
  const remove = (n) => {
    if (n.deletedAt) {
      setItems((list) => list.filter((x) => x.id !== n.id))
      deleteNotes([n.id]).catch((e) => toast(e.message, 'error'))
    } else {
      clearTimeout(pending.current.get(n.id)); pending.current.delete(n.id)
      patch(n.id, { deletedAt: now(), pinned: false })
    }
    setOpenId('')
  }
  const restore = (n) => { patch(n.id, { deletedAt: '' }); toast('Note restored', 'ok') }
  const emptyTrash = () => {
    const ids = trash.map((n) => n.id)
    setItems((list) => list.filter((x) => !ids.includes(x.id)))
    deleteNotes(ids).catch((e) => toast(e.message, 'error'))
    setOpenId('')
  }
  const moveTo = (n, fid) => { patch(n.id, { folderId: fid === NONE ? '' : fid }); toast(`Moved to ${fid === NONE ? 'Notes' : folders.find((f) => f.id === fid)?.title || 'folder'}`, 'ok') }

  const newFolder = () => {
    const name = (prompt('Name of the new folder', 'New Folder') || '').trim()
    if (!name) return
    const t = now()
    const f = { id: uid(), kind: 'folder', folderId: '', title: name, body: '', pinned: false, createdAt: t, updatedAt: t, deletedAt: '' }
    setItems((list) => [...list, f])
    persist(f)
    setFolder(f.id)
  }
  const renameFolder = () => {
    const name = renaming?.name.trim()
    if (name) patch(renaming.id, { title: name })
    setRenaming(null)
  }
  const deleteFolder = (f) => {
    const inside = live.filter((n) => n.folderId === f.id)
    if (!confirm(inside.length ? `Delete "${f.title}"? Its ${inside.length} note${inside.length === 1 ? '' : 's'} go to Recently Deleted.` : `Delete "${f.title}"?`)) return
    const t = now()
    inside.forEach((n) => patch(n.id, { deletedAt: t, pinned: false }))
    setItems((list) => list.filter((x) => x.id !== f.id))
    deleteNotes([f.id]).catch((e) => toast(e.message, 'error'))
    if (folder === f.id) setFolder(ALL)
  }

  if (items === null) return <div className="notes-app notes-loading muted">Loading notes…</div>

  const NOTES_COLOR = '#b58a1c' // the backdrop behind the notes, Notes' own amber
  const pickFolder = (f) => { leave(openId); setOpenId(''); setFolder(f); setQ(''); setMenu(false) }
  const close = () => { leave(openId); setOpenId('') }
  const folderRow = ({ id, name, count, icon = '🗂', own }) => (
    <div key={id} className={`rem-row notes-frow ${folder === id && !open ? 'on' : folder === id ? 'here' : ''}`}>
      {renaming?.id === id ? (
        <input className="input notes-rename" autoFocus value={renaming.name} onChange={(e) => setRenaming({ id, name: e.target.value })} onBlur={renameFolder} onKeyDown={(e) => { if (e.key === 'Enter') renameFolder(); if (e.key === 'Escape') setRenaming(null) }} />
      ) : (
        <button type="button" className="rem-row-pick" onClick={() => pickFolder(id)} onDoubleClick={() => own && setRenaming({ id, name })}>
          <span className="rem-row-emoji" aria-hidden="true">{icon}</span>
          <span className="grow">{name}</span>
          <span className="rem-count">{count || ''}</span>
        </button>
      )}
      {own && renaming?.id !== id && (
        <span className="notes-folder-acts">
          <button type="button" title="Rename" onClick={() => setRenaming({ id, name })}>✎</button>
          <button type="button" title="Delete folder" onClick={() => deleteFolder(own)}>×</button>
        </span>
      )}
    </div>
  )

  const search = (
    <div className="rem-search-wrap">
      <span className="rem-search-ico" aria-hidden="true">⌕</span>
      <input className="rem-search" type="search" placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); if (open) close(); if (e.target.value) setMenu(false) }} />
    </div>
  )
  const folderMenu = (
    <>
      <nav className="rem-smart">
        {folderRow({ id: ALL, name: 'All Notes', count: live.length, icon: '📒' })}
        {folderRow({ id: NONE, name: 'Notes', count: inFolder(NONE).length, icon: '🗒' })}
        {trash.length > 0 && folderRow({ id: TRASH, name: 'Recently Deleted', count: trash.length, icon: '🗑' })}
      </nav>
      {folders.length > 0 && <hr className="rem-rule" />}
      {folders.length > 0 && <nav className="rem-lists">{folders.map((f) => folderRow({ id: f.id, name: f.title, count: inFolder(f.id).length, own: f }))}</nav>}
      <button type="button" className="rem-add-list" onClick={() => { setMenu(false); newFolder() }}><span>＋</span> New Folder</button>
    </>
  )
  const foldersPane = <aside className="rem-side">{!slot && search}{folderMenu}</aside>
  // on a phone, like Tasks: Search and the Folders button on one line, the folders folded under it
  const phoneTop = (
    <div className="rem-mtop">
      <div className="rem-mtop-bar">
        {search}
        <button type="button" className={`rem-menu-btn ${menu ? 'on' : ''}`} aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
          <span aria-hidden="true">🗂</span> Folders <span className="rem-menu-chev" aria-hidden="true">⌄</span>
        </button>
      </div>
      {menu && <div className="rem-side rem-mmenu">{folderMenu}</div>}
    </div>
  )

  const card = (n) => (
    <li key={n.id} className="notes-card" onClick={() => select(n.id)}>
      <div className="notes-card-main">
        <div className="notes-card-title">{n.pinned && folder !== TRASH && <span className="notes-card-pin">📌</span>}{n.lines[0] || 'New Note'}</div>
        <div className="notes-card-sub"><b>{when(n.updatedAt)}</b> {n.lines[1] || 'No additional text'}</div>
        {folder === ALL && n.folderId && <div className="notes-card-folder">🗂 {folders.find((f) => f.id === n.folderId)?.title || ''}</div>}
      </div>
      {folder !== TRASH && <button type="button" className={`notes-card-act ${n.pinned ? 'on' : ''}`} title={n.pinned ? 'Unpin' : 'Pin'} onClick={(e) => { e.stopPropagation(); patch(n.id, { pinned: !n.pinned }) }}>📌</button>}
      <button type="button" className="rem-del" title={n.deletedAt ? 'Delete now' : 'Delete'} onClick={(e) => { e.stopPropagation(); remove(n) }}>×</button>
    </li>
  )

  const listPane = (
    <section className="rem-main notes-main" style={{ '--lc': NOTES_COLOR }}>
      <div className="rem-head">
        <div className="grow">
          <h1>{q.trim() ? `Searching for "${q.trim()}"` : folderName}</h1>
          <div className="rem-head-date">{shown.length} note{shown.length === 1 ? '' : 's'}</div>
        </div>
        {folder === TRASH && trash.length > 0 && <button type="button" className="rem-head-btn" onClick={() => { if (confirm('Delete every note in Recently Deleted for good?')) emptyTrash() }}>Empty</button>}
      </div>
      <div className="rem-scroll">
        {!shown.length && <p className="rem-empty">{q ? 'No note matches.' : folder === TRASH ? 'Nothing deleted.' : 'No notes yet. Write one below.'}</p>}
        {groups.map((g) => (
          <div key={g.label} className="rem-section">
            <div className="notes-group-label">{g.label === 'Pinned' ? '📌 Pinned' : g.label}</div>
            <ul className="rem-tasks">{g.list.map(card)}</ul>
          </div>
        ))}
      </div>
      {folder !== TRASH && (
        <div className="rem-quick">
          <span className="rem-quick-plus" aria-hidden="true">＋</span>
          <input className="rem-quick-input" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') newNote(quick.trim()); if (e.key === 'Escape') setQuick('') }} placeholder="New Note…" />
          <button type="button" className="notes-quick-open" onClick={() => newNote(quick.trim())}>Open</button>
        </div>
      )}
    </section>
  )

  const notePane = open && (
    <section className="rem-main notes-main" style={{ '--lc': NOTES_COLOR }}>
      <div className="rem-head notes-note-head">
        <button type="button" className="rem-back" onClick={close}>‹ {folderName}</button>
        <span className="grow" />
        {open.deletedAt ? (
          <>
            <button type="button" className="rem-head-btn" onClick={() => restore(open)}>Restore</button>
            <button type="button" className="rem-head-btn" onClick={() => remove(open)}>Delete now</button>
          </>
        ) : (
          <>
            <select className="notes-move" value={open.folderId && folders.some((f) => f.id === open.folderId) ? open.folderId : NONE} onChange={(e) => moveTo(open, e.target.value)} title="Folder">
              <option value={NONE}>Notes</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
            <button type="button" className={`rem-head-btn ${open.pinned ? 'on' : ''}`} onClick={() => patch(open.id, { pinned: !open.pinned })} title={open.pinned ? 'Unpin' : 'Pin'}>📌</button>
            <button type="button" className="rem-head-btn" onClick={() => remove(open)} title="Delete">🗑</button>
          </>
        )}
      </div>
      <div className="notes-sheet">
        <div className="notes-date">{longDate(open.updatedAt)}</div>
        {open.deletedAt ? (
          <div className="notes-readonly" dangerouslySetInnerHTML={{ __html: open.body }} />
        ) : (
          <Editor key={open.id} note={open} onChange={onBody} />
        )}
      </div>
    </section>
  )

  return (
    <div className={`rem-app notes-app ${mobile ? (open ? 'm-note' : 'm-one') : ''}`}>
      {err && <p className="notes-err">{err}</p>}
      {slot && createPortal(<div className="toolbar db-bar notes-bar">{search}</div>, slot)}
      {mobile ? (open ? notePane : (<>{phoneTop}{listPane}</>)) : (<>{foldersPane}{open ? notePane : listPane}</>)}
    </div>
  )
}
