import { useEffect, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'

const KINDS = ['Google Drive', 'Google Doc', 'Google Sheet', 'Frame.io', 'Reference', 'Contract', 'Permit', 'Other']

/* Same bargain as Tasks: on the project Overview a panel with nothing in it is noise, so with
   `hideEmpty` each half draws only once it has something. `startLink` and `startNotes` are
   counters the Overview bumps from its own buttons. Nothing else passes them. */
export default function Notes({ hideEmpty = false, startLink = 0, startNotes = 0 }) {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [notes, setNotes] = useState(project.productionNotes || '')
  const [writing, setWriting] = useState(false)
  const editable = canEdit('files')
  const links = project.links || []

  useEffect(() => { if (startLink) setDraft({ id: uid(), title: '', url: '', kind: 'Google Drive', note: '' }) }, [startLink])
  useEffect(() => { if (startNotes) setWriting(true) }, [startNotes])

  const showLinks = !hideEmpty || links.length > 0
  const showNotes = !hideEmpty || writing || (project.productionNotes || '').trim() !== ''

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

  const modal = (
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
  )

  // Both halves empty and asked to keep quiet: only the form stays, so the Overview's buttons
  // have something to open.
  if (!showLinks && !showNotes) return modal

  return (
    <div className={`cols notes-cols${showLinks && showNotes ? '' : ' one'}`}>
      {showLinks && (
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
      )}

      {showNotes && (
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
        <Textarea rows={16} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!editable} autoFocus={writing} placeholder="Running notes for the whole team: decisions, open questions, vendor quotes, who is chasing what." />
      </section>
      )}

      {modal}
    </div>
  )
}
