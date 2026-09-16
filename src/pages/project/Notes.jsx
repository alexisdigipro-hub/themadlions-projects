import { useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'

const KINDS = ['Google Drive', 'Google Doc', 'Google Sheet', 'Frame.io', 'Reference', 'Contract', 'Permit', 'Other']

export default function Notes() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [notes, setNotes] = useState(project.productionNotes || '')
  const editable = canEdit('files')
  const links = project.links || []

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
          <h2>Files & links</h2>
          {editable && (
            <Button size="sm" variant="primary" onClick={() => setDraft({ id: uid(), title: '', url: '', kind: 'Google Drive', note: '' })}>
              Add link
            </Button>
          )}
        </div>
        <p className="muted small">Phase 1 keeps files where they already live (Drive, Frame.io, Dropbox) and links to them. Uploads arrive with the Supabase backend.</p>
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
