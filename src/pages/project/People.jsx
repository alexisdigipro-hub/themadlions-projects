import { useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'
import { download } from '../../lib/dates.js'
import PhotoGrid from '../../components/PhotoGrid.jsx'
import { contactToLibrary, matchText, sharedContact } from '../../lib/library.js'
import { waLink } from '../../lib/share.js'

const DEPTS = ['Production', 'Direction', 'Camera', 'Lighting', 'Grip', 'Sound', 'Art', 'Costume', 'Makeup & hair', 'Locations', 'Post', 'Transport', 'Catering', 'Other']

const initials = (n) => (n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

export default function People() {
  const { project, edit, canEdit, library, editLibrary } = useProject()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [pick, setPick] = useState(null) // { q, sel, character }
  const [tab, setTab] = useState('cast')
  const [view, setView] = useState(() => localStorage.getItem('tml_people_view') || 'cards')
  const [photosFor, setPhotosFor] = useState(null) // contact id
  const editable = canEdit('contacts')
  const photoTarget = project.contacts.find((c) => c.id === photosFor)
  const setPhotos = (id, photos) => {
    const c = project.contacts.find((x) => x.id === id)
    if (c?.libraryId) editLibrary((lib) => { const l = lib.contacts.find((x) => x.id === c.libraryId); if (l) l.photos = photos })
    else edit((p) => { const x = p.contacts.find((y) => y.id === id); if (x) x.photos = photos })
  }
  const inLibrary = new Set(project.contacts.map((c) => c.libraryId).filter(Boolean))
  const libChoices = (library?.contacts || []).filter((c) => c.kind === tab && !inLibrary.has(c.id)).filter((c) => matchText(pick?.q, c.name, c.role, c.dept, c.phone, c.email, (c.tags || []).join(' ')))
  const addFromLibrary = () => {
    const chosen = libChoices.filter((c) => pick.sel.includes(c.id))
    if (!chosen.length) return
    edit((p) => {
      chosen.forEach((c) => p.contacts.push({ id: uid(), kind: tab, libraryId: c.id, ...sharedContact(c), character: chosen.length === 1 && tab === 'cast' ? (pick.character || '').toUpperCase() : '', dept: tab === 'cast' ? 'Cast' : c.dept, role: c.role || '', callOffset: 0 }))
    })
    setPick(null)
    toast(`${chosen.length} added from the library`, 'ok')
  }

  const list = project.contacts.filter((c) => c.kind === tab)
  const characters = [...new Set(project.scenes.flatMap((s) => s.characters))]
  const uncast = characters.filter((c) => !project.contacts.some((x) => x.kind === 'cast' && x.character?.toUpperCase() === c.toUpperCase()))

  const save = () => {
    if (!draft.name.trim()) return toast('Add a name.', 'error')
    const { saveToLibrary, ...c } = draft
    let libraryId = c.libraryId
    if (libraryId) {
      // shared fields live in the library
      editLibrary((lib) => { const l = lib.contacts.find((x) => x.id === libraryId); if (l) Object.assign(l, sharedContact(c)) })
    } else if (saveToLibrary) {
      const entry = contactToLibrary(c)
      libraryId = entry.id
      editLibrary((lib) => lib.contacts.push(entry))
    }
    edit((p) => {
      const item = { ...c, libraryId }
      const i = p.contacts.findIndex((x) => x.id === c.id)
      if (i >= 0) p.contacts[i] = item
      else p.contacts.push(item)
    })
    setDraft(null)
    toast(libraryId ? 'Saved (shared in the company library)' : 'Saved', 'ok')
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
            {project.category === 'Events' ? 'Talent' : 'Cast'} <small>{project.contacts.filter((c) => c.kind === 'cast').length}</small>
          </button>
          <button className={tab === 'crew' ? 'on' : ''} onClick={() => setTab('crew')}>
            Crew <small>{project.contacts.filter((c) => c.kind === 'crew').length}</small>
          </button>
        </div>
        <div className="toolbar-actions">
          <div className="segmented small">
            <button className={view === 'cards' ? 'on' : ''} onClick={() => { setView('cards'); localStorage.setItem('tml_people_view', 'cards') }}>Cards</button>
            <button className={view === 'table' ? 'on' : ''} onClick={() => { setView('table'); localStorage.setItem('tml_people_view', 'table') }}>List</button>
          </div>
          {project.contacts.length > 0 && (
            <Button variant="ghost" onClick={exportCSV}>
              Export CSV
            </Button>
          )}
          {editable && (library?.contacts || []).some((c) => c.kind === tab) && (
            <Button onClick={() => setPick({ q: '', sel: [], character: uncast[0] || '' })}>From library</Button>
          )}
          {editable && (
            <Button variant="primary" onClick={() => setDraft({ id: uid(), kind: tab, name: '', character: '', dept: tab === 'cast' ? 'Cast' : 'Production', role: '', phone: '', email: '', callOffset: 0, saveToLibrary: true })}>
              Add {tab === 'cast' && project.category === 'Events' ? 'talent' : tab}
            </Button>
          )}
        </div>
      </div>

      {tab === 'cast' && uncast.length > 0 && (
        <p className="notice">
          Not cast yet: {uncast.join(', ')}.{' '}
          {editable && (
            <button className="link" onClick={() => setDraft({ id: uid(), kind: 'cast', name: '', character: uncast[0], dept: 'Cast', role: '', phone: '', email: '', callOffset: 0, saveToLibrary: true })}>
              Cast {uncast[0]}
            </button>
          )}
        </p>
      )}

      {list.length === 0 ? (
        <Empty title={tab === 'cast' ? 'No cast yet' : 'No crew yet'}>
          {tab === 'cast' ? 'Link actors to the characters from the breakdown so call sheets fill themselves.' : 'Add heads of department first. They appear on every call sheet.'}
        </Empty>
      ) : view === 'cards' ? (
        <div className="people-grid compact">
          {list.map((c) => (
            <article key={c.id} className="person">
              <button className="person-photo" onClick={() => setPhotosFor(c.id)} aria-label="Photos">
                {c.photos?.[0]?.thumb ? <img src={c.photos[0].thumb} alt="" /> : <span className="person-initials">{initials(c.name)}</span>}
                {c.photos?.length > 1 && <span className="person-count">{c.photos.length}</span>}
              </button>
              <div className="person-body">
                <strong>{c.name}{c.libraryId && <span className="lib-badge" title="Shared in the company library">library</span>}</strong>
                <div className="small">{tab === 'cast' ? (c.character ? <span className="person-char">{c.character}</span> : <span className="muted">No character</span>) : c.dept}{c.role ? ` · ${c.role}` : ''}</div>
                <div className="small muted person-contact">
                  {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
                  {c.phone && <a href={waLink(c.phone, `Hi ${c.name.split(' ')[0]}, `)} target="_blank" rel="noreferrer">WhatsApp</a>}
                  {c.email && <a href={`mailto:${c.email}`} title={c.email}>Mail</a>}
                </div>
                {c.agent && <div className="small muted">Agent: {c.agent}{c.agentPhone ? ` · ${c.agentPhone}` : ''}</div>}
                {c.notes && <div className="small muted person-notes">{c.notes}</div>}
              </div>
              {editable && (
                <div className="row-actions person-actions">
                  <button onClick={() => setPhotosFor(c.id)}>Photos</button>
                  <button onClick={() => setDraft({ ...c })}>Edit</button>
                  <Confirm onConfirm={() => edit((p) => (p.contacts = p.contacts.filter((x) => x.id !== c.id)))} label="Delete">×</Confirm>
                </div>
              )}
            </article>
          ))}
        </div>
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
                <td className="person-cell">
                  <button className="avatar" onClick={() => setPhotosFor(c.id)} aria-label="Photos">
                    {c.photos?.[0]?.thumb ? <img src={c.photos[0].thumb} alt="" /> : initials(c.name)}
                  </button>
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
            {draft.kind === 'cast' && (
              <div className="row-2">
                <Field label="Agent / agency">
                  <Input value={draft.agent || ''} onChange={(e) => setDraft({ ...draft, agent: e.target.value })} />
                </Field>
                <Field label="Agent phone">
                  <Input value={draft.agentPhone || ''} onChange={(e) => setDraft({ ...draft, agentPhone: e.target.value })} />
                </Field>
              </div>
            )}
            <Field label="Notes" hint={draft.kind === 'cast' ? 'Sizes, allergies, availability, dietary needs.' : 'Availability, own gear, dietary needs.'}>
              <Input value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
            {draft.libraryId ? (
              <p className="fineprint">Name, phone, email, agent, photos and notes are shared from the company library. Changing them here updates every project. Character, role and call offset belong to this project only.</p>
            ) : (
              <label className="check">
                <input type="checkbox" checked={draft.saveToLibrary !== false} onChange={(e) => setDraft({ ...draft, saveToLibrary: e.target.checked })} />
                Also keep in the company library for future projects
              </label>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!pick} title={`Add ${tab} from the library`} onClose={() => setPick(null)}
        footer={<><Button variant="ghost" onClick={() => setPick(null)}>Cancel</Button><Button variant="primary" disabled={!pick?.sel.length} onClick={addFromLibrary}>Add {pick?.sel.length || ''}</Button></>}>
        {pick && (
          <div className="stack">
            <Input autoFocus value={pick.q} onChange={(e) => setPick({ ...pick, q: e.target.value })} placeholder="Search…" />
            {tab === 'cast' && pick.sel.length === 1 && (
              <Field label="Character" hint="For the selected actor.">
                <Input list="chars" value={pick.character} onChange={(e) => setPick({ ...pick, character: e.target.value.toUpperCase() })} />
              </Field>
            )}
            <ul className="lib-pick">
              {libChoices.map((c) => {
                const on = pick.sel.includes(c.id)
                return (
                  <li key={c.id} className={on ? 'on' : ''} onClick={() => setPick({ ...pick, sel: on ? pick.sel.filter((x) => x !== c.id) : [...pick.sel, c.id] })}>
                    <span className="avatar">{c.photos?.[0]?.thumb ? <img src={c.photos[0].thumb} alt="" /> : initials(c.name)}</span>
                    <span className="grow">
                      <strong>{c.name}</strong>
                      <div className="muted small">{[c.kind === 'cast' ? c.role : `${c.dept}${c.role ? ` · ${c.role}` : ''}`, c.phone].filter(Boolean).join(' · ')}</div>
                    </span>
                    <input type="checkbox" checked={on} readOnly />
                  </li>
                )
              })}
              {!libChoices.length && <li className="muted">Everyone matching is already in this project.</li>}
            </ul>
          </div>
        )}
      </Modal>

      <Modal open={!!photoTarget} wide title={photoTarget ? `Photos · ${photoTarget.name}` : ''} onClose={() => setPhotosFor(null)}>
        {photoTarget && (
          <PhotoGrid
            title={photoTarget.kind === 'cast' ? 'Headshots & looks' : 'Photos'}
            photos={photoTarget.photos || []}
            projectId={photoTarget.libraryId ? 'library' : project.id}
            ownerId={photoTarget.libraryId || photoTarget.id}
            editable={editable}
            onChange={(photos) => setPhotos(photoTarget.id, photos)}
          />
        )}
      </Modal>
    </div>
  )
}
