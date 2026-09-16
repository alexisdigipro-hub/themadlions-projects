import { useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'
import { download } from '../../lib/dates.js'

const DEPTS = ['Production', 'Direction', 'Camera', 'Lighting', 'Grip', 'Sound', 'Art', 'Costume', 'Makeup & hair', 'Locations', 'Post', 'Transport', 'Catering', 'Other']

export default function People() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [tab, setTab] = useState('cast')
  const editable = canEdit('contacts')

  const list = project.contacts.filter((c) => c.kind === tab)
  const characters = [...new Set(project.scenes.flatMap((s) => s.characters))]
  const uncast = characters.filter((c) => !project.contacts.some((x) => x.kind === 'cast' && x.character?.toUpperCase() === c.toUpperCase()))

  const save = () => {
    if (!draft.name.trim()) return toast('Add a name.', 'error')
    edit((p) => {
      const i = p.contacts.findIndex((c) => c.id === draft.id)
      if (i >= 0) p.contacts[i] = draft
      else p.contacts.push(draft)
    })
    setDraft(null)
    toast('Saved', 'ok')
  }

  const exportCSV = () => {
    const rows = [['Kind', 'Name', 'Character', 'Department', 'Role', 'Phone', 'Email', 'Call offset (min)'], ...project.contacts.map((c) => [c.kind, c.name, c.character, c.dept, c.role, c.phone, c.email, c.callOffset ?? 0])]
    download(`${project.title} - contacts.csv`, '\uFEFF' + rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv')
  }

  return (
    <div>
      <div className="toolbar">
        <div className="segmented">
          <button className={tab === 'cast' ? 'on' : ''} onClick={() => setTab('cast')}>
            Cast <small>{project.contacts.filter((c) => c.kind === 'cast').length}</small>
          </button>
          <button className={tab === 'crew' ? 'on' : ''} onClick={() => setTab('crew')}>
            Crew <small>{project.contacts.filter((c) => c.kind === 'crew').length}</small>
          </button>
        </div>
        <div className="toolbar-actions">
          {project.contacts.length > 0 && (
            <Button variant="ghost" onClick={exportCSV}>
              Export CSV
            </Button>
          )}
          {editable && (
            <Button variant="primary" onClick={() => setDraft({ id: uid(), kind: tab, name: '', character: '', dept: tab === 'cast' ? 'Cast' : 'Production', role: '', phone: '', email: '', callOffset: 0 })}>
              Add {tab}
            </Button>
          )}
        </div>
      </div>

      {tab === 'cast' && uncast.length > 0 && (
        <p className="notice">
          Not cast yet: {uncast.join(', ')}.{' '}
          {editable && (
            <button className="link" onClick={() => setDraft({ id: uid(), kind: 'cast', name: '', character: uncast[0], dept: 'Cast', role: '', phone: '', email: '', callOffset: 0 })}>
              Cast {uncast[0]}
            </button>
          )}
        </p>
      )}

      {list.length === 0 ? (
        <Empty title={tab === 'cast' ? 'No cast yet' : 'No crew yet'}>
          {tab === 'cast' ? 'Link actors to the characters from the breakdown so call sheets fill themselves.' : 'Add heads of department first. They appear on every call sheet.'}
        </Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              {tab === 'cast' ? <th>Character</th> : <th>Department</th>}
              <th>Role</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Call</th>
              {editable && <th />}
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                </td>
                <td>{tab === 'cast' ? c.character : c.dept}</td>
                <td>{c.role}</td>
                <td>{c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}</td>
                <td>{c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}</td>
                <td className="muted">{c.callOffset ? `${c.callOffset > 0 ? '+' : ''}${c.callOffset} min` : 'General'}</td>
                {editable && (
                  <td className="row-actions">
                    <Button size="sm" variant="ghost" onClick={() => setDraft({ ...c })}>
                      Edit
                    </Button>
                    <Confirm onConfirm={() => edit((p) => (p.contacts = p.contacts.filter((x) => x.id !== c.id)))} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        open={!!draft}
        title={project.contacts.some((c) => c.id === draft?.id) ? `Edit ${draft?.kind}` : `Add ${draft?.kind}`}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Save
            </Button>
          </>
        }
      >
        {draft && (
          <div className="stack">
            <Field label="Name">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
            </Field>
            {draft.kind === 'cast' ? (
              <Field label="Character" hint="Type or pick a character from the breakdown.">
                <Input list="chars" value={draft.character} onChange={(e) => setDraft({ ...draft, character: e.target.value.toUpperCase() })} />
                <datalist id="chars">
                  {characters.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
            ) : (
              <Field label="Department">
                <Select value={draft.dept} onChange={(e) => setDraft({ ...draft, dept: e.target.value })} options={DEPTS} />
              </Field>
            )}
            <Field label="Role">
              <Input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder={draft.kind === 'cast' ? 'Lead, Supporting, Day player' : 'Director of Photography, 1st AD, Gaffer'} />
            </Field>
            <div className="row-2">
              <Field label="Phone">
                <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </Field>
            </div>
            <Field label="Call time offset (minutes from general call)" hint="Negative for earlier, e.g. -60 for makeup.">
              <Input type="number" value={draft.callOffset ?? 0} onChange={(e) => setDraft({ ...draft, callOffset: Number(e.target.value) || 0 })} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
