import { useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'
import { useRef } from 'react'
import { deleteFile, fileIcon, fileUrl, fmtBytes, uploadFile } from '../../lib/files.js'
import { fmtDate } from '../../lib/dates.js'
import { remote } from '../../lib/supabase.js'

const KINDS = ['Google Drive', 'Google Doc', 'Google Sheet', 'Frame.io', 'Reference', 'Contract', 'Permit', 'Other']

export default function Notes() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [notes, setNotes] = useState(project.productionNotes || '')
  const editable = canEdit('files')
  const links = project.links || []
  const files = project.files || []
  const fileRef = useRef()
  const [busy, setBusy] = useState('')
  const [folder, setFolder] = useState(project.cloudFolder || '')
  const addFiles = async (list) => {
    const arr = Array.from(list || [])
    if (!arr.length) return
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i]
      setBusy(`${i + 1}/${arr.length} ${f.name}`)
      try {
        const id = uid()
        const { path } = await uploadFile({ projectId: project.id, id, file: f })
        edit((p) => { p.files = [...(p.files || []), { id, name: f.name, path, type: f.type, bytes: f.size, addedAt: new Date().toISOString(), note: '' }] })
      } catch (e) {
        toast(e.message, 'error')
      }
    }
    setBusy('')
    if (fileRef.current) fileRef.current.value = ''
  }
  const open = async (f, download = false) => {
    const u = await fileUrl(f, download)
    if (!u) return toast('Could not open the file.', 'error')
    window.open(u, '_blank')
  }
  const removeFile = async (f) => {
    await deleteFile(f.path).catch(() => {})
    edit((p) => (p.files = (p.files || []).filter((x) => x.id !== f.id)))
  }

  const save = () => {
    if (!draft.title.trim() || !draft.url.trim()) return toast('Title and link are both needed.', 'error')
    edit((p) => {
      p.links = p.links || []
      const i = p.links.findIndex((l) => l.id === draft.id)
      if (i >= 0) p.links[i] = draft
      else p.links.push(draft)
    })
    setDraft(null)
    toast('Link saved', 'ok')
  }

  return (
    <div className="cols">
      <section className="panel">
        <div className="panel-head">
          <h2>Files</h2>
          {editable && (
            <>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
              <Button size="sm" variant="primary" onClick={() => fileRef.current?.click()} disabled={!!busy}>{busy || 'Upload files'}</Button>
            </>
          )}
        </div>
        <p className="muted small">Documents, contracts, treatments, references, small videos. Up to 50 MB per file{remote ? '' : ' (local mode: this session only)'}. Footage and masters stay in the cloud folder below.</p>
        {!files.length ? (
          <Empty title="No files yet" />
        ) : (
          <ul className="file-list">
            {files.map((f) => (
              <li key={f.id}>
                <span className="file-ico">{fileIcon(f.name, f.type)}</span>
                <span className="grow">
                  <strong>{f.name}</strong>
                  <div className="muted small">{fmtBytes(f.bytes || 0)} · {fmtDate((f.addedAt || '').slice(0, 10))}{f.note ? ` · ${f.note}` : ''}</div>
                </span>
                <span className="row-actions">
                  <button onClick={() => open(f)}>Open</button>
                  <button onClick={() => open(f, true)}>Download</button>
                  {editable && <Confirm onConfirm={() => removeFile(f)} label="Delete">×</Confirm>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="cloud-folder">
          <Field label="Cloud folder" hint="pCloud, Google Drive or Dropbox folder with the footage and masters for this project.">
            <div className="row-actions">
              <Input value={folder} onChange={(e) => setFolder(e.target.value)} onBlur={() => edit((p) => (p.cloudFolder = folder.trim()))} placeholder="https://my.pcloud.com/…" disabled={!editable} />
              {project.cloudFolder && <a className="btn btn-ghost btn-sm" href={project.cloudFolder} target="_blank" rel="noreferrer">Open</a>}
            </div>
          </Field>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Links</h2>
          {editable && (
            <Button size="sm" variant="primary" onClick={() => setDraft({ id: uid(), title: '', url: '', kind: 'Google Drive', note: '' })}>
              Add link
            </Button>
          )}
        </div>
        {links.length === 0 ? (
          <Empty title="No files linked" />
        ) : (
          <ul className="link-list">
            {links.map((l) => (
              <li key={l.id}>
                <a href={l.url} target="_blank" rel="noreferrer">
                  <strong>{l.title}</strong>
                  <span className="muted small">{l.kind}{l.note ? ` · ${l.note}` : ''}</span>
                </a>
                {editable && (
                  <span className="row-actions">
                    <Button size="sm" variant="ghost" onClick={() => setDraft({ ...l })}>
                      Edit
                    </Button>
                    <Confirm onConfirm={() => edit((p) => (p.links = (p.links || []).filter((x) => x.id !== l.id)))} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Production notes</h2>
          {editable && notes !== (project.productionNotes || '') && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                edit((p) => (p.productionNotes = notes))
                toast('Notes saved', 'ok')
              }}
            >
              Save notes
            </Button>
          )}
        </div>
        <Textarea rows={16} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!editable} placeholder="Running notes for the whole team: decisions, open questions, vendor quotes, who is chasing what." />
      </section>

      <Modal
        open={!!draft}
        title={links.some((l) => l.id === draft?.id) ? 'Edit link' : 'Add link'}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Save link
            </Button>
          </>
        }
      >
        {draft && (
          <div className="stack">
            <Field label="Title">
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
            </Field>
            <Field label="Link">
              <Input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://drive.google.com/…" />
            </Field>
            <div className="row-2">
              <Field label="Type">
                <Select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} options={KINDS} />
              </Field>
              <Field label="Note">
                <Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
