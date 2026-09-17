import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, useToast } from '../components/ui.jsx'
import { can, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { contactProjects, contactToLibrary, matchText } from '../lib/library.js'
import PhotoGrid from '../components/PhotoGrid.jsx'

const DEPTS = ['Cast', 'Production', 'Direction', 'Camera', 'Lighting', 'Grip', 'Sound', 'Art', 'Costume', 'Makeup & hair', 'Locations', 'Post', 'Transport', 'Catering', 'Other']
const initials = (n) => (n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const emptyPerson = (kind) => ({ id: uid(), kind, name: '', phone: '', email: '', dept: kind === 'cast' ? 'Cast' : 'Production', role: '', agent: '', agentPhone: '', notes: '', photos: [], tags: [], createdAt: new Date().toISOString() })

export default function PeopleAll() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const editable = can(user, 'contacts', 'edit')
  const [kind, setKind] = useState('cast')
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [draft, setDraft] = useState(null)
  const [photosFor, setPhotosFor] = useState(null)
  const people = state.library.contacts
  const projects = visibleProjects(state, user)

  const list = people
    .filter((p) => p.kind === kind)
    .filter((p) => (dept ? p.dept === dept : true))
    .filter((p) => matchText(q, p.name, p.role, p.phone, p.email, p.agent, p.notes, (p.tags || []).join(' ')))
    .sort((a, b) => a.name.localeCompare(b.name))
  const target = people.find((p) => p.id === photosFor)

  const save = () => {
    if (!draft.name.trim()) return toast('Add a name.', 'error')
    update((s) => {
      const i = s.library.contacts.findIndex((p) => p.id === draft.id)
      if (i >= 0) s.library.contacts[i] = draft
      else s.library.contacts.push(draft)
      return s
    })
    setDraft(null)
    toast('Saved to the library', 'ok')
  }
  const remove = (p) => update((s) => {
    // project entries keep a snapshot of the shared fields, so nothing disappears from call sheets
    s.projects.forEach((pr) => pr.contacts.forEach((c) => c.libraryId === p.id && delete c.libraryId))
    s.library.contacts = s.library.contacts.filter((x) => x.id !== p.id)
    return s
  })
  const setPhotos = (id, photos) => update((s) => {
    const p = s.library.contacts.find((x) => x.id === id)
    if (p) p.photos = photos
    return s
  })
  const unlinked = projects.flatMap((p) => p.contacts.filter((c) => !c.libraryId)).length
  const collect = () => {
    let added = 0, linked = 0
    update((s) => {
      s.projects.forEach((pr) => pr.contacts.forEach((c) => {
        if (c.libraryId) return
        const key = (c.name || '').trim().toLowerCase()
        if (!key) return
        let entry = s.library.contacts.find((x) => x.kind === c.kind && x.name.trim().toLowerCase() === key)
        if (!entry) { entry = contactToLibrary(c); s.library.contacts.push(entry); added += 1 }
        else if (!entry.photos?.length && c.photos?.length) entry.photos = c.photos
        c.libraryId = entry.id
        linked += 1
      }))
      return s
    })
    toast(`${added} added to the library, ${linked} project entries linked`, 'ok')
  }

  return (
    <div>
      <PageHead title="People" sub={`${people.filter((p) => p.kind === 'cast').length} cast · ${people.filter((p) => p.kind === 'crew').length} crew in the company library`}>
        {editable && unlinked > 0 && <Button variant="ghost" onClick={collect}>Collect {unlinked} from projects</Button>}
        {editable && <Button variant="primary" onClick={() => setDraft(emptyPerson(kind))}>Add {kind}</Button>}
      </PageHead>
      <div className="toolbar">
        <div className="segmented">
          <button className={kind === 'cast' ? 'on' : ''} onClick={() => setKind('cast')}>Cast</button>
          <button className={kind === 'crew' ? 'on' : ''} onClick={() => setKind('crew')}>Crew</button>
        </div>
        <div className="toolbar-actions">
          <Input className="input search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, role, phone, agent…" />
          <Select value={dept} onChange={(e) => setDept(e.target.value)} options={[['', 'All departments'], ...DEPTS.map((d) => [d, d])]} />
        </div>
      </div>

      {!list.length ? (
        <Empty title={people.length ? 'No matches' : 'The library is empty'}>
          {people.length ? 'Try another search.' : 'People you add inside a project land here automatically, so the next project can pick them from the list. You can also add them directly.'}
        </Empty>
      ) : (
        <div className="people-grid">
          {list.map((c) => {
            const used = contactProjects(projects, c.id)
            return (
              <article key={c.id} className="person">
                <button className="person-photo" onClick={() => setPhotosFor(c.id)} aria-label="Photos">
                  {c.photos?.[0]?.thumb ? <img src={c.photos[0].thumb} alt="" /> : <span className="person-initials">{initials(c.name)}</span>}
                  {c.photos?.length > 1 && <span className="person-count">{c.photos.length}</span>}
                </button>
                <div className="person-body">
                  <strong>{c.name}</strong>
                  <div className="small">{c.kind === 'cast' ? c.role || <span className="muted">Actor</span> : `${c.dept}${c.role ? ` · ${c.role}` : ''}`}</div>
                  <div className="small muted person-contact">
                    {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
                    {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                  </div>
                  {c.agent && <div className="small muted">Agent: {c.agent}{c.agentPhone ? ` · ${c.agentPhone}` : ''}</div>}
                  {c.notes && <div className="small muted person-notes">{c.notes}</div>}
                  <div className="small person-projects">
                    {used.length ? used.map((p) => <Link key={p.id} to={`/p/${p.id}/people`} style={{ '--pc': p.color }}>{p.title}</Link>) : <span className="muted">Not in a project yet</span>}
                  </div>
                </div>
                {editable && (
                  <div className="row-actions person-actions">
                    <button onClick={() => setPhotosFor(c.id)}>Photos</button>
                    <button onClick={() => setDraft({ ...c })}>Edit</button>
                    <Confirm onConfirm={() => remove(c)} label="Delete">×</Confirm>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <Modal open={!!draft} title={draft && people.some((p) => p.id === draft.id) ? `Edit ${draft.kind}` : `Add ${draft?.kind}`} onClose={() => setDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {draft && (
          <div className="stack">
            <Field label="Name"><Input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <div className="row-2">
              <Field label="Department"><Select value={draft.dept} onChange={(e) => setDraft({ ...draft, dept: e.target.value })} options={DEPTS} /></Field>
              <Field label={draft.kind === 'cast' ? 'Type' : 'Usual role'}><Input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder={draft.kind === 'cast' ? 'Lead, character actor, stunt double' : 'Gaffer, 1st AC'} /></Field>
            </div>
            <div className="row-2">
              <Field label="Phone"><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
            </div>
            {draft.kind === 'cast' && (
              <div className="row-2">
                <Field label="Agent / agency"><Input value={draft.agent || ''} onChange={(e) => setDraft({ ...draft, agent: e.target.value })} /></Field>
                <Field label="Agent phone"><Input value={draft.agentPhone || ''} onChange={(e) => setDraft({ ...draft, agentPhone: e.target.value })} /></Field>
              </div>
            )}
            <Field label="Notes"><Input value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Sizes, languages, own gear, rates" /></Field>
            <Field label="Tags" hint="Comma separated, for searching: stunt, driver, speaks french"><Input value={(draft.tags || []).join(', ')} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!target} wide title={target ? `Photos · ${target.name}` : ''} onClose={() => setPhotosFor(null)}>
        {target && <PhotoGrid title={target.kind === 'cast' ? 'Headshots & looks' : 'Photos'} photos={target.photos || []} projectId="library" ownerId={target.id} editable={editable} onChange={(photos) => setPhotos(target.id, photos)} />}
      </Modal>
    </div>
  )
}
