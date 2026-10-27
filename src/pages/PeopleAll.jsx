import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, Select, TagsInput, useToast } from '../components/ui.jsx'
import { can, canSeeContacts, departmentsOf, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { contactProjects, contactToLibrary, matchText } from '../lib/library.js'
import PhotoGrid from '../components/PhotoGrid.jsx'
import { DbAdd, DbBar, DbFilter, ListSearch, useFitScroll } from '../components/DbTools.jsx'

const initials = (n) => (n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const emptyPerson = (kind) => ({ id: uid(), kind, name: '', phone: '', email: '', dept: kind === 'cast' ? 'Cast' : 'Production', role: '', agent: '', agentPhone: '', notes: '', photos: [], tags: [], createdAt: new Date().toISOString() })

export default function PeopleAll({ kind, slot }) {
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
  // one list, as Contacts (Alex, 27 Oct: "Crew, Cast and Equipment like Contacts, List only"); it scrolls in its own
  // box so the top row stays put
  const scrollRef = useFitScroll()
  const people = state.library.contacts
  const projects = visibleProjects(state, user)

  const list = people
    .filter((p) => p.kind === kind)
    .filter((p) => (dept ? p.dept === dept : true))
    .filter((p) => matchText(q, p.name, p.role, p.phone, p.email, p.agent, p.notes, (p.tags || []).join(' ')))
    .sort((a, b) => a.name.localeCompare(b.name))
  const all = people.filter((p) => p.kind === kind).length
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
      <DbBar slot={slot}>
        <div className="toolbar-info">
          <strong>{kind === 'cast' ? 'Cast' : 'Crew'}</strong>
          {unlinked > 0 && editable && <> · <button className="link" onClick={collect}>collect {unlinked} from projects</button></>}
        </div>
        <div className="toolbar-actions">
          <ListSearch value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, role, phone, agent…" />
          <span className="ab-count">{q.trim() || dept ? `${list.length} of ${all}` : `${all} ${kind === 'cast' ? 'in cast' : 'in crew'}`}</span>
          <DbFilter value={dept} onChange={(e) => setDept(e.target.value)} options={[['', 'All departments'], ...DEPTS.map((d) => [d, d])]} label="Department" />
          {editable && <DbAdd label={`Add ${kind}`} onClick={() => setDraft(emptyPerson(kind))} />}
        </div>
      </DbBar>

      <div className="ab-scroll" ref={scrollRef}>
      {!list.length ? (
        <Empty title={people.length ? 'No matches' : 'The database is empty'}>
          {people.length ? 'Try another search.' : 'People you add inside a project land here automatically, so the next project can pick them from the list. You can also add them directly.'}
        </Empty>
      ) : (
        // the rows of Contacts: picture, name (and agent), department and role as a chip, phone, email; a tap opens the
        // person's window (projects, notes, photos). The projects someone worked on stay in that window, so every
        // row is the same height (Alex, 10 Oct)
        <div className="ab-rows">
          {list.map((c) => (
            <article key={c.id} className="ab-row lib-row" onClick={() => setDetailFor(c.id)} role="button" tabIndex={0}>
              <span className="ab-ava sm" aria-hidden="true">{c.photos?.[0]?.thumb ? <img src={c.photos[0].thumb} alt="" /> : initials(c.name)}</span>
              <strong className="ab-name">{c.name}{c.agent && <span className="muted small"> · Agent: {c.agent}</span>}</strong>
              <span className="ab-cell">{(c.kind === 'cast' ? c.role : [c.dept, c.role].filter(Boolean).join(' · ')) && <span className="ab-chip"><i />{c.kind === 'cast' ? c.role : [c.dept, c.role].filter(Boolean).join(' · ')}</span>}</span>
              <span className="ab-cell" onClick={(e) => e.stopPropagation()}>{showContacts && c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}</span>
              <span className="ab-cell muted" onClick={(e) => e.stopPropagation()}>{showContacts && c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}</span>
              {editable ? (
                <span className="ab-acts" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="btn btn-default btn-sm" onClick={() => setDraft({ ...c })}>Edit</button>
                  <Confirm onConfirm={() => remove(c)} label="Delete" className="ab-del" title="Delete">×</Confirm>
                </span>
              ) : <span />}
            </article>
          ))}
        </div>
      )}
      </div>

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
