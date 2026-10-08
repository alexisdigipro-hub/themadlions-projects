import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, useIsMobile, useToast } from '../components/ui.jsx'
import { can, canAccessProject, uid, useCurrentUser, useStore, visibleProjects, whenMs } from '../lib/store.jsx'
import { remote } from '../lib/supabase.js'
import { pcloudDelete, pcloudOn } from '../lib/pcloud.js'
import { DOC_TYPES, docTypeOf, loadDocsApi, officeCreate, officeOpen, officePing } from '../lib/office.js'
import { fmtDate } from '../lib/dates.js'

/* Office (Alex, 8 Oct): Word, Excel and PowerPoint inside the app, with ONLYOFFICE on Alex's own
   server. Every document belongs to a project: it is kept in that project's pCloud folder
   ("<project>/Office"), recorded in project.docs, and seen or changed by whoever may see or
   change the project's files. /office lists them all, /office/:pid/:fileid opens one. */
export default function Office() {
  const { pid, fileid } = useParams()
  return pid && fileid ? <Editor pid={pid} fileid={Number(fileid)} /> : <Library />
}

function DocIcon({ type, size = 40 }) {
  const t = DOC_TYPES.find((d) => d.type === type) || docTypeOf(`.${type}`) || DOC_TYPES[0]
  return <span className="office-ico" style={{ '--doc': t.color, width: size, height: size, fontSize: size * 0.45 }}>{t.letter}</span>
}

function Library() {
  const { state, updateProject } = useStore()
  const user = useCurrentUser()
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const projectFilter = params.get('p') || 'all'
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState(null) // { type, projectId, name }
  const [busy, setBusy] = useState(false)
  const [check, setCheck] = useState('')
  const projects = visibleProjects(state, user)
  const mayEdit = can(user, 'files', 'edit')
  const editable = projects.filter((p) => canAccessProject(user, p.id) && (!p.frozen || user?.role === 'admin'))
  const ready = remote && pcloudOn(state.settings)

  const needle = q.trim().toLowerCase()
  const docs = projects
    .filter((p) => projectFilter === 'all' || p.id === projectFilter)
    .flatMap((p) => (p.docs || []).map((d) => ({ ...d, project: p })))
    .filter((d) => kind === 'all' || d.type === kind)
    .filter((d) => !needle || (d.name || '').toLowerCase().includes(needle) || (d.project.title || '').toLowerCase().includes(needle))
    .sort((a, b) => whenMs(b.createdAt) - whenMs(a.createdAt))

  const startNew = (type) => {
    const t = DOC_TYPES.find((d) => d.type === type)
    const first = projectFilter !== 'all' && editable.some((p) => p.id === projectFilter) ? projectFilter : editable[0]?.id || ''
    setDraft({ type, projectId: first, name: `Untitled ${t.label.toLowerCase()}` })
  }
  const create = async () => {
    if (!draft.projectId) return toast('Pick the project it belongs to.', 'error')
    if (!draft.name.trim()) return toast('Give it a name.', 'error')
    setBusy(true)
    try {
      const r = await officeCreate(draft.projectId, draft.type, draft.name.trim())
      updateProject(draft.projectId, (p) => {
        p.docs = [...(p.docs || []), { id: uid(), fileid: r.fileid, scope: { kind: 'project', id: draft.projectId }, name: r.name, type: draft.type, createdAt: new Date().toISOString(), createdBy: user?.id || '', createdByName: user?.name || '' }]
      })
      setDraft(null)
      nav(`/office/${draft.projectId}/${r.fileid}`)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }
  const remove = async (d) => {
    try { await pcloudDelete(d.fileid, d.scope || { kind: 'project', id: d.project.id }) } catch (e) { toast(`pCloud kept the file: ${e.message}`, 'error') }
    updateProject(d.project.id, (p) => { p.docs = (p.docs || []).filter((x) => x.id !== d.id) })
    toast('Document deleted', 'ok')
  }
  const ping = async () => {
    setCheck('Checking…')
    try { const r = await officePing(); setCheck(r.ok ? `Connected to ${r.docs}` : r.error) } catch (e) { setCheck(e.message) }
  }

  return (
    <div className="office">
      <PageHead title="Office" sub="Documents, spreadsheets and presentations, kept in each project's pCloud folder.">
        {user?.role === 'admin' && <Button variant="ghost" onClick={ping}>Check the server</Button>}
      </PageHead>
      {check && <p className="muted small office-check">{check}</p>}
      {!ready ? (
        <Empty title="Office keeps its files in pCloud">
          Switch File storage to pCloud in Settings &gt; Integrations, and the Office server has to be set up once.
        </Empty>
      ) : (
        <>
          {mayEdit && editable.length > 0 && (
            <div className="office-new">
              {DOC_TYPES.map((t) => (
                <button key={t.type} type="button" className="office-new-card" onClick={() => startNew(t.type)}>
                  <DocIcon type={t.type} size={46} />
                  <span><strong>New {t.label.toLowerCase()}</strong><small>{t.app}</small></span>
                </button>
              ))}
            </div>
          )}
          <div className="toolbar office-tools">
            <span className="segmented small">
              {[['all', 'All'], ...DOC_TYPES.map((t) => [t.type, `${t.label}s`])].map(([v, l]) => (
                <button key={v} className={kind === v ? 'on' : ''} onClick={() => setKind(v)}>{l}</button>
              ))}
            </span>
            <Select value={projectFilter} onChange={(e) => setParams(e.target.value === 'all' ? {} : { p: e.target.value })} options={[['all', 'All projects'], ...projects.map((p) => [p.id, p.title || 'Untitled'])]} />
            <Input className="input search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {!docs.length ? (
            <Empty title={needle || kind !== 'all' || projectFilter !== 'all' ? 'Nothing matches' : 'No documents yet'}>
              {mayEdit ? 'Start one above: it goes into the project you pick, in its pCloud folder.' : 'Documents made in your projects show here.'}
            </Empty>
          ) : (
            <div className="panel office-list">
              {docs.map((d) => (
                <div key={d.id} className="office-row">
                  <button type="button" className="office-open" onClick={() => nav(`/office/${d.project.id}/${d.fileid}`)}>
                    <DocIcon type={d.type} />
                    <span className="office-row-main">
                      <strong>{d.name}</strong>
                      <small>{d.project.title || 'Untitled'} · {fmtDate(d.createdAt?.slice(0, 10))}{d.createdByName ? ` · ${d.createdByName}` : ''}</small>
                    </span>
                  </button>
                  <Link className="btn btn-ghost btn-sm office-proj" to={`/p/${d.project.id}`}>Project</Link>
                  {mayEdit && <Confirm onConfirm={() => remove(d)} label="Delete" title="Deletes it from the project and from pCloud" />}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <Modal
        open={!!draft}
        title={draft ? `New ${DOC_TYPES.find((t) => t.type === draft.type).label.toLowerCase()}` : ''}
        onClose={() => !busy && setDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>Cancel</Button><Button variant="primary" onClick={create} disabled={busy}>{busy ? 'Making it…' : 'Create and open'}</Button></>}
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* One document in ONLYOFFICE's editor. It saves by itself as you type; closing it is enough. */
function Editor({ pid, fileid }) {
  const { state } = useStore()
  const mobile = useIsMobile()
  const box = useRef(null)
  const [err, setErr] = useState('')
  const [title, setTitle] = useState('')
  const [readOnly, setReadOnly] = useState(false)
  const [started, setStarted] = useState(false)
  const project = state.projects.find((p) => p.id === pid)
  const doc = (project?.docs || []).find((d) => d.fileid === fileid)
  useEffect(() => {
    let editor = null
    let dead = false
    ;(async () => {
      try {
        let r
        // a document just made is recorded in the project a moment before the database has it
        for (let tries = 0; ; tries++) {
          try { r = await officeOpen(pid, fileid); break } catch (e) {
            if (/not one of the project/.test(e.message) && tries < 6) { await sleep(1500); continue }
            throw e
          }
        }
        if (dead) return
        setTitle(r.config.document.title)
        setReadOnly(!r.edit)
        const DocsAPI = await loadDocsApi(r.docs)
        if (dead || !box.current) return
        const holder = document.createElement('div')
        holder.id = `office-editor-${fileid}`
        box.current.replaceChildren(holder) // the editor's own frame: React keeps nothing in this box
        setStarted(true)
        editor = new DocsAPI.DocEditor(holder.id, {
          ...r.config,
          width: '100%',
          height: '100%',
          type: mobile ? 'mobile' : 'desktop',
          events: { onError: (e) => setErr(e?.data?.errorDescription || 'The editor reported an error.') },
        })
      } catch (e) {
        if (!dead) setErr(e.message)
      }
    })()
    return () => {
      dead = true
      try { editor?.destroyEditor() } catch {}
      box.current?.replaceChildren()
    }
  }, [pid, fileid, mobile])
  return (
    <div className="office-editor">
      <div className="office-editor-head">
        <Link className="btn btn-ghost btn-sm" to={`/office?p=${encodeURIComponent(pid)}`}>← Office</Link>
        <DocIcon type={doc?.type || docTypeOf(title)?.type || 'docx'} size={30} />
        <span className="office-editor-title"><strong>{title || doc?.name || 'Opening…'}</strong><small>{project?.title || ''}{readOnly ? ' · read only' : ' · saves as you type'}</small></span>
        {project && <Link className="btn btn-ghost btn-sm" to={`/p/${pid}`}>Open project</Link>}
      </div>
      {err && <div className="panel office-error"><strong>Could not open the document.</strong><p>{err}</p></div>}
      {!err && !started && <p className="muted office-loading">Opening the editor…</p>}
      <div className="office-frame" ref={box} hidden={!!err} />
    </div>
  )
}
