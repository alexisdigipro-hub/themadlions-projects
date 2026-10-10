import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, Select, TagsInput, useIsMobile, useToast } from '../components/ui.jsx'
import { can, canSeeContacts, departmentsOf, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { contactProjects, contactToLibrary, matchText } from '../lib/library.js'
import PhotoGrid from '../components/PhotoGrid.jsx'
import { DbAdd, DbFilter } from '../components/DbTools.jsx'

const initials = (n) => (n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const emptyPerson = (kind) => ({ id: uid(), kind, name: '', phone: '', email: '', dept: kind === 'cast' ? 'Cast' : 'Production', role: '', agent: '', agentPhone: '', notes: '', photos: [], tags: [], createdAt: new Date().toISOString() })

export default function PeopleAll({ kind }) {
  const { state, update } = useStore()
  const DEPTS = ['Cast', ...departmentsOf(state)]
  const user = useCurrentUser()
  const showContacts = canSeeContacts(state, user)
  const toast = useToast()
  const editable = can(user, 'contacts', 'edit')
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [draft, setDraft] = useState(null)
  const [detailFor, setDetailFor] = useState(null)
  const [view, setView] = useState(() => localStorage.getItem('tml_people_view') || 'cards')
  const pickView = (v) => { setView(v); localStorage.setItem('tml_people_view', v) }
  // a phone always shows the cards: its toolbar is one line, with no room for Cards / List (Alex, 10 Oct)
  const mobile = useIsMobile()
  const shownView = mobile ? 'cards' : view
  const people = state.library.contacts
  const projects = visibleProjects(state, user)

  const list = people
    .filter((p) => p.kind === kind)
    .filter((p) => (dept ? p.dept === dept : true))
    .filter((p) => matchText(q, p.name, p.role, p.phone, p.email, p.agent, p.notes, (p.tags || []).join(' ')))
    .sort((a, b) => a.name.localeCompare(b.name))
  const target = people.find((p) => p.id === detailFor)

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
    <section className="panel db-card">
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>{kind === 'cast' ? 'Cast' : 'Crew'}</strong> <span className="muted">{list.length}</span>
          {unlinked > 0 && editable && <> · <button className="link" onClick={collect}>collect {unlinked} from projects</button></>}
        </div>
        <div className="toolbar-actions">
          <div className="segmented small">
            <button className={view === 'cards' ? 'on' : ''} onClick={() => pickView('cards')}>Cards</button>
            <button className={view === 'table' ? 'on' : ''} onClick={() => pickView('table')}>List</button>
          </div>
          <Input className="input search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, role, phone, agent…" />
          <DbFilter value={dept} onChange={(e) => setDept(e.target.value)} options={[['', 'All departments'], ...DEPTS.map((d) => [d, d])]} label="Department" />
          {editable && <DbAdd label={`Add ${kind}`} onClick={() => setDraft(emptyPerson(kind))} />}
        </div>
      </div>

      {!list.length ? (
        <Empty title={people.length ? 'No matches' : 'The database is empty'}>
          {people.length ? 'Try another search.' : 'People you add inside a project land here automatically, so the next project can pick them from the list. You can also add them directly.'}
        </Empty>
      ) : shownView === 'table' ? (
        <div className="table-wrap">
        <table className="table people-table">
          {/* Alex: the list of projects someone worked on made every row a different height and
              threw the columns out. It is in the person's own card (tap the name) instead. */}
          <thead><tr><th /><th>Name</th><th>{kind === 'cast' ? 'Type' : 'Department · role'}</th><th>Phone</th><th>Email</th>{editable && <th />}</tr></thead>
          <tbody>
            {list.map((c) => (
                <tr key={c.id}>
                  <td><button className="avatar" onClick={() => setDetailFor(c.id)} aria-label="Details">{c.photos?.[0]?.thumb ? <img src={c.photos[0].thumb} alt="" /> : initials(c.name)}</button></td>
                  <td><button className="name-link" onClick={() => setDetailFor(c.id)}><strong>{c.name}</strong></button>{c.agent && <div className="muted small">Agent: {c.agent}</div>}</td>
                  <td className="small">{c.kind === 'cast' ? c.role : `${c.dept}${c.role ? ` · ${c.role}` : ''}`}</td>
                  <td className="small">{showContacts && c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}</td>
                  <td className="small">{showContacts && c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}</td>
                  {editable && <td className="row-actions"><button onClick={() => setDraft({ ...c })}>Edit</button><Confirm onConfirm={() => remove(c)} label="Delete">×</Confirm></td>}
                </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : (
        <div className="people-grid compact">
          {list.map((c) => (
              // the same short card as Locations, on a phone and then on a computer too: picture, name and
              // role; a tap opens the person's window, which has the phone, the email, Edit and Delete (Alex, 10 Oct)
              <article key={c.id} className="person loc-card" onClick={() => setDetailFor(c.id)} role="button" tabIndex={0}>
                <div className="person-photo" aria-hidden="true">
                  {c.photos?.[0]?.thumb ? <img src={c.photos[0].thumb} alt="" /> : <span className="person-initials">{initials(c.name)}</span>}
                </div>
                <div className="person-body">
                  <strong>{c.name}</strong>
                  <div className="small muted">{c.kind === 'cast' ? c.role || 'Actor' : c.role || c.dept}</div>
                </div>
              </article>
          ))}
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
            <Field label="Tags" hint="Comma separated, for searching: stunt, driver, speaks french"><TagsInput key={draft.id} value={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!target} wide title={target?.name || ''} onClose={() => setDetailFor(null)}>
        {target && (
          <div className="stack">
            <div className="row-actions">
              {editable && <Button size="sm" onClick={() => { const d = target; setDetailFor(null); setDraft({ ...d }) }}>Edit</Button>}
              {editable && <Confirm onConfirm={() => { remove(target); setDetailFor(null) }} />}
            </div>
            <dl className="details">
              <dt>{target.kind === 'cast' ? 'Type' : 'Department'}</dt><dd>{target.kind === 'cast' ? (target.role || '–') : target.dept}</dd>
              {target.kind !== 'cast' && target.role && (<><dt>Role</dt><dd>{target.role}</dd></>)}
              <dt>Phone</dt><dd>{showContacts && target.phone ? <a href={`tel:${target.phone}`}>{target.phone}</a> : '–'}</dd>
              <dt>Email</dt><dd>{showContacts && target.email ? <a href={`mailto:${target.email}`}>{target.email}</a> : '–'}</dd>
              {target.agent && (<><dt>Agent</dt><dd>{target.agent}{target.agentPhone ? ` · ${target.agentPhone}` : ''}</dd></>)}
              <dt>Used in</dt>
              <dd>
                {contactProjects(projects, target.id).length ? contactProjects(projects, target.id).map((p) => <Link key={p.id} className="proj-link" to={`/p/${p.id}/people`} style={{ '--pc': p.color }}>{p.title}</Link>) : <span className="muted">Not in a project yet</span>}
              </dd>
            </dl>
            {target.notes && <p className="notes-text">{target.notes}</p>}
            <PhotoGrid title={target.kind === 'cast' ? 'Headshots & looks' : 'Photos'} photos={target.photos || []} projectId="library" ownerId={target.id} editable={editable} onChange={(photos) => setPhotos(target.id, photos)} />
          </div>
        )}
      </Modal>
    </section>
  )
}
