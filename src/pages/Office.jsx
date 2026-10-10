import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, useIsMobile, useToast } from '../components/ui.jsx'
import { DbFilter, DbSearch } from '../components/DbTools.jsx'
import { can, canAccessProject, uid, useCurrentUser, useStore, visibleProjects, whenMs } from '../lib/store.jsx'
import { remote } from '../lib/supabase.js'
import { pcloudBlob, pcloudTarget } from '../lib/pcloud.js'
import { deleteFile, fileUrl, fmtBytes, uploadFile } from '../lib/files.js'
import { download, fmtDate } from '../lib/dates.js'

/* Office (Alex, 8 Oct): Word documents and Excel sheets inside the app, no server and no outside
   service. Each one belongs to a project, lives as a real .docx / .xlsx in that project's storage
   (pCloud "<project>/Office" when pCloud is on), is listed in project.docs, and is seen by whoever
   can see the project (changed by whoever has Files = edit). The editors and the file formats are
   in lib/office/, loaded only when this page opens. */

const TYPES = [
  { type: 'docx', label: 'Document', app: 'Word', letter: 'W', color: '#2b6bd6', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { type: 'xlsx', label: 'Spreadsheet', app: 'Excel', letter: 'X', color: '#1f8f4e', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
]
const typeOf = (t) => TYPES.find((x) => x.type === t) || TYPES[0]
const extType = (name) => (/\.xlsx$/i.test(name) ? 'xlsx' : /\.docx$/i.test(name) ? 'docx' : '')
const baseName = (name) => String(name || '').replace(/\.(docx|xlsx)$/i, '')

function DocIcon({ type, size = 40 }) {
  const t = typeOf(type)
  return <span className="office-ico" style={{ '--doc': t.color, width: size, height: size, fontSize: size * 0.45 }}>{t.letter}</span>
}

/* The file's bytes, wherever it is kept. */
async function readBytes(rec) {
  if (rec.fileid) return new Uint8Array(await (await pcloudBlob(rec.fileid, rec.scope)).arrayBuffer())
  const url = await fileUrl(rec)
  if (!url) throw new Error('Could not reach the file.')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`The file could not be read (${res.status}).`)
  return new Uint8Array(await res.arrayBuffer())
}
/* A new version up: what the record must now point at. Uploaded under the document's own id, so
   in the app's own storage it simply replaces the last version (same path); in pCloud it is a new
   file and the caller takes the previous one away. */
async function storeBytes(state, projectId, docId, name, type, bytes) {
  const file = new File([bytes], `${name}.${type}`, { type: typeOf(type).mime })
  const r = await uploadFile({ projectId, id: docId, file, pcloud: pcloudTarget(state, projectId, 'Office') })
  return { fileid: r.fileid || undefined, scope: r.scope || undefined, path: r.path || '', size: bytes.length }
}

/* embedded: the Office tab of the Office page (pages/OfficeHub.jsx, Alex 10 Oct: Office and Notes on one
   page with tabs, like the Database), so without its own page head; on a computer its filter line is
   drawn into the slot on the tabs' row */
export default function Office({ embedded = false, slot = null }) {
  const { pid, docId } = useParams()
  return pid && docId ? <Editor key={`${pid}/${docId}`} pid={pid} docId={docId} /> : <Library embedded={embedded} slot={slot} />
}

function Library({ embedded, slot }) {
  const { state, updateProject } = useStore()
  const user = useCurrentUser()
  const nav = useNavigate()
  const toast = useToast()
  const mobile = useIsMobile()
  const [params, setParams] = useSearchParams()
  const projectFilter = params.get('p') || 'all'
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState(null) // { type, projectId, name, file? }
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const projects = visibleProjects(state, user)
  const mayEdit = can(user, 'files', 'edit')
  const editable = projects.filter((p) => canAccessProject(user, p.id) && (!p.frozen || user?.role === 'admin'))
  const firstProject = projectFilter !== 'all' && editable.some((p) => p.id === projectFilter) ? projectFilter : editable[0]?.id || ''

  const needle = q.trim().toLowerCase()
  const docs = projects
    .filter((p) => projectFilter === 'all' || p.id === projectFilter)
    .flatMap((p) => (p.docs || []).map((d) => ({ ...d, project: p })))
    .filter((d) => kind === 'all' || d.type === kind)
    .filter((d) => !needle || (d.name || '').toLowerCase().includes(needle) || (d.project.title || '').toLowerCase().includes(needle))
    .sort((a, b) => whenMs(b.updatedAt || b.createdAt) - whenMs(a.updatedAt || a.createdAt))

  const create = async () => {
    if (!draft.projectId) return toast('Pick the project it belongs to.', 'error')
    const name = baseName(draft.name).trim().replace(/[\\/:*?"<>|]+/g, ' ')
    if (!name) return toast('Give it a name.', 'error')
    setBusy(true)
    try {
      let bytes
      if (draft.file) bytes = new Uint8Array(await draft.file.arrayBuffer())
      else if (draft.type === 'xlsx') { const { toXlsx, emptyBook } = await import('../lib/office/xlsx.js'); bytes = await toXlsx(emptyBook()) }
      else { const { htmlToDocx } = await import('../lib/office/docx.js'); bytes = await htmlToDocx(`<h1>${name.replace(/</g, '&lt;')}</h1><p><br></p>`) }
      const id = uid()
      const where = await storeBytes(state, draft.projectId, id, name, draft.type, bytes)
      const now = new Date().toISOString()
      updateProject(draft.projectId, (p) => {
        p.docs = [...(p.docs || []), { id, name, type: draft.type, ...where, createdAt: now, createdBy: user?.id || '', createdByName: user?.name || '', updatedAt: now, updatedByName: user?.name || '' }]
      })
      setDraft(null)
      nav(`/office/${draft.projectId}/${id}`)
    } catch (e) {
      toast(e.message || 'Could not make it.', 'error')
    } finally {
      setBusy(false)
    }
  }
  const pickFile = (f) => {
    if (!f) return
    const type = extType(f.name)
    if (!type) return toast('Office opens .docx (Word) and .xlsx (Excel) files.', 'error')
    if (f.size > 40 * 1024 * 1024) return toast('That file is over 40 MB.', 'error')
    setDraft({ type, projectId: firstProject, name: baseName(f.name), file: f })
  }
  const remove = async (d) => {
    // the file first: pCloud only lets a file go while the project still records it
    await deleteFile(d).catch(() => {})
    updateProject(d.project.id, (p) => { p.docs = (p.docs || []).filter((x) => x.id !== d.id) })
    toast('Deleted', 'ok')
  }

  /* On a phone (Alex, 10 Oct): no line under the title, the four starters on one line as icons with a
     short name under each, and the filters on the next line: a glass capsule All / Docs / Sheets, a
     round project filter and a round search */
  return (
    <div className="office">
      {!embedded && <PageHead title="Office" sub={mobile ? undefined : 'Documents and spreadsheets for each project, opened and saved right here as Word and Excel files.'} />}
      {mayEdit && editable.length > 0 && (
        <div className="office-new">
          {TYPES.map((t) => (
            <button key={t.type} type="button" className="office-new-card" onClick={() => setDraft({ type: t.type, projectId: firstProject, name: `Untitled ${t.label.toLowerCase()}` })}>
              <DocIcon type={t.type} size={46} />
              <span><strong>{mobile ? t.label : `New ${t.label.toLowerCase()}`}</strong><small>{t.app}</small></span>
            </button>
          ))}
          <button type="button" className="office-new-card" onClick={() => fileRef.current?.click()}>
            <span className="office-ico office-ico-up" style={{ width: 46, height: 46 }}>↑</span>
            <span><strong>{mobile ? 'Open file' : 'Open a file'}</strong><small>.docx or .xlsx from your computer</small></span>
          </button>
          <input ref={fileRef} type="file" hidden accept=".docx,.xlsx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
          <Link to="/" className="office-new-card office-new-deck">
            <span className="office-ico" style={{ '--doc': '#d0542c', width: 46, height: 46, fontSize: 20 }}>P</span>
            <span><strong>{mobile ? 'Decks' : 'Presentations'}</strong><small>In each project, under Presentation</small></span>
          </Link>
        </div>
      )}
      {(() => {
        const tools = (
          <>
          <span className="segmented small">
            {[['all', 'All'], ['docx', mobile ? 'Docs' : 'Documents'], ['xlsx', mobile ? 'Sheets' : 'Spreadsheets']].map(([v, l]) => (
              <button key={v} className={kind === v ? 'on' : ''} onClick={() => setKind(v)}>{l}</button>
            ))}
          </span>
          {mobile ? (
            <DbFilter value={projectFilter === 'all' ? '' : projectFilter} onChange={(e) => setParams(!e.target.value || e.target.value === 'all' ? {} : { p: e.target.value })} options={[['', 'All projects'], ...projects.map((p) => [p.id, p.title || 'Untitled'])]} label="Project" />
          ) : (
            <Select value={projectFilter} onChange={(e) => setParams(e.target.value === 'all' ? {} : { p: e.target.value })} options={[['all', 'All projects'], ...projects.map((p) => [p.id, p.title || 'Untitled'])]} />
          )}
          <DbSearch value={q} onChange={(e) => setQ(e.target.value)} />
          </>
        )
        return slot ? createPortal(<div className="toolbar office-tools db-bar">{tools}</div>, slot) : <div className="toolbar office-tools">{tools}</div>
      })()}
      {!docs.length ? (
        <Empty title={needle || kind !== 'all' || projectFilter !== 'all' ? 'Nothing matches' : 'No documents yet'}>
          {mayEdit ? 'Start one above, or open a Word or Excel file you already have. It goes into the project you pick.' : 'Documents made in your projects show here.'}
        </Empty>
      ) : (
        <div className="panel office-list">
          {docs.map((d) => (
            <div key={d.id} className="office-row">
              <button type="button" className="office-open" onClick={() => nav(`/office/${d.project.id}/${d.id}`)}>
                <DocIcon type={d.type} />
                <span className="office-row-main">
                  <strong>{d.name}</strong>
                  <small>{d.project.title || 'Untitled'} · {fmtDate((d.updatedAt || d.createdAt || '').slice(0, 10))}{d.updatedByName ? ` · ${d.updatedByName}` : ''}{d.size ? ` · ${fmtBytes(d.size)}` : ''}</small>
                </span>
              </button>
              <Link className="btn btn-ghost btn-sm office-proj" to={`/p/${d.project.id}`}>Project</Link>
              {mayEdit && <Confirm onConfirm={() => remove(d)} label="Delete" title="Deletes it from the project and its storage" />}
            </div>
          ))}
        </div>
      )}
      <Modal
        open={!!draft}
        title={draft ? (draft.file ? `Open ${draft.file.name}` : `New ${typeOf(draft.type).label.toLowerCase()}`) : ''}
        onClose={() => !busy && setDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>Cancel</Button><Button variant="primary" onClick={create} disabled={busy}>{busy ? 'Saving…' : draft?.file ? 'Add and open' : 'Create and open'}</Button></>}
      >
        {draft && (
          <div className="stack">
            <Field label="Project"><Select value={draft.projectId} onChange={(e) => setDraft({ ...draft, projectId: e.target.value })} options={editable.map((p) => [p.id, p.title || 'Untitled'])} /></Field>
            <Field label="Name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') create() }} /></Field>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* One document or sheet open. It saves by itself a few seconds after you stop, and with Save or
   Ctrl/Cmd+S; each save puts a new file up and takes the previous one away, so the project only
   ever holds the latest. If someone else saved in the meantime, it asks before replacing theirs. */
function Editor({ pid, docId }) {
  const { state, updateProject } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const project = state.projects.find((p) => p.id === pid)
  const rec = (project?.docs || []).find((d) => d.id === docId)
  const mayEdit = !!project && can(user, 'files', 'edit') && canAccessProject(user, pid) && (!project.frozen || user?.role === 'admin')
  const host = useRef(null)
  const view = useRef(null)
  const base = useRef(null) // the version this editor opened or last saved: { fileid, path, updatedAt }
  const recRef = useRef(rec)
  recRef.current = rec
  const [status, setStatus] = useState('Opening…')
  const [err, setErr] = useState('')
  const [dirty, setDirty] = useState(false)
  const dirtyRef = useRef(false)
  const saving = useRef(false)
  const timer = useRef(null)

  const serialize = async () => {
    if (rec.type === 'xlsx') { const { toXlsx } = await import('../lib/office/xlsx.js'); return toXlsx(view.current.getBook()) }
    const { htmlToDocx } = await import('../lib/office/docx.js')
    return htmlToDocx(view.current.getHtml())
  }
  const save = async ({ quiet = false } = {}) => {
    const cur = recRef.current
    if (!view.current || !cur || !mayEdit || saving.current) return
    if (base.current && (cur.updatedAt || '') !== (base.current.updatedAt || '')) {
      if (!window.confirm(`${cur.updatedByName || 'Someone'} saved a newer version of "${cur.name}" while you had it open. Replace it with yours?`)) return
    }
    saving.current = true
    setStatus('Saving…')
    try {
      const bytes = await serialize()
      const where = await storeBytes(state, pid, docId, cur.name, cur.type, bytes)
      const old = { fileid: cur.fileid, scope: cur.scope, path: cur.path }
      // the previous version goes before the record moves on: pCloud only deletes a file the
      // project still records (in the app's own storage the new one simply replaced it)
      if ((old.fileid && old.fileid !== where.fileid) || (old.path && old.path !== where.path)) await deleteFile(old).catch(() => {})
      const now = new Date().toISOString()
      updateProject(pid, (p) => {
        const d = (p.docs || []).find((x) => x.id === docId)
        if (d) Object.assign(d, where, { updatedAt: now, updatedByName: user?.name || '' })
      })
      base.current = { ...where, updatedAt: now }
      dirtyRef.current = false
      setDirty(false)
      setStatus(`Saved ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`)
    } catch (e) {
      setStatus('Not saved')
      if (!quiet) toast(e.message || 'Could not save.', 'error')
    } finally {
      saving.current = false
    }
  }
  const saveRef = useRef(save)
  saveRef.current = save

  useEffect(() => {
    if (!rec) return undefined
    let dead = false
    ;(async () => {
      try {
        const bytes = await readBytes(rec)
        if (dead) return
        base.current = { fileid: rec.fileid, path: rec.path, updatedAt: rec.updatedAt }
        const onChange = () => {
          dirtyRef.current = true
          setDirty(true)
          setStatus('Edited')
          clearTimeout(timer.current)
          timer.current = setTimeout(() => saveRef.current({ quiet: true }), 4000)
        }
        if (rec.type === 'xlsx') {
          const [{ fromXlsx }, { mountSheet }] = await Promise.all([import('../lib/office/xlsx.js'), import('../lib/office/sheetView.js')])
          const book = await fromXlsx(bytes)
          if (dead) return
          view.current = mountSheet(host.current, book, { onChange, readOnly: !mayEdit })
        } else {
          const [{ docxToHtml }, { mountDoc }] = await Promise.all([import('../lib/office/docx.js'), import('../lib/office/docView.js')])
          const html = await docxToHtml(bytes)
          if (dead) return
          view.current = mountDoc(host.current, html, { onChange, readOnly: !mayEdit })
        }
        setStatus(mayEdit ? 'Saves by itself as you go' : 'Read only')
      } catch (e) {
        if (!dead) setErr(e.message || 'Could not open it.')
      }
    })()
    const key = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current() } }
    const leave = (e) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('keydown', key)
    window.addEventListener('beforeunload', leave)
    return () => {
      dead = true
      clearTimeout(timer.current)
      window.removeEventListener('keydown', key)
      window.removeEventListener('beforeunload', leave)
      // leaving the page inside the app: what is not saved yet is saved on the way out
      if (dirtyRef.current) saveRef.current({ quiet: true }).finally(() => view.current?.destroy())
      else view.current?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec?.id])

  const downloadIt = async () => {
    try { download(`${rec.name}.${rec.type}`, await serialize(), typeOf(rec.type).mime) } catch (e) { toast(e.message, 'error') }
  }

  if (!project || !rec) {
    return <div className="office"><Empty title="This document is not here">It may have been deleted, or it belongs to a project you cannot see. <Link to="/office">Back to Office</Link></Empty></div>
  }
  return (
    <div className="office-editor">
      <div className="office-editor-head">
        <Link className="btn btn-ghost btn-sm" to={`/office?p=${encodeURIComponent(pid)}`}>← Office</Link>
        <DocIcon type={rec.type} size={32} />
        <span className="office-editor-title"><strong>{rec.name}</strong><small>{project.title || ''} · {status}</small></span>
        <Button size="sm" variant="ghost" onClick={downloadIt}>Download</Button>
        {mayEdit && <Button size="sm" variant={dirty ? 'primary' : 'ghost'} onClick={() => save()}>Save</Button>}
      </div>
      {err && <div className="panel office-error"><strong>Could not open it.</strong><p>{err}</p></div>}
      <div className="office-frame" ref={host} hidden={!!err} />
      {!remote && <p className="muted small">Local mode: files live in this browser only until the page is closed.</p>}
    </div>
  )
}
