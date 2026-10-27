import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, Select, TagsInput, useToast } from '../components/ui.jsx'
import { can, canSeeContacts, departmentsOf, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { contactProjects, contactToLibrary, matchText } from '../lib/library.js'
import PhotoGrid from '../components/PhotoGrid.jsx'
import { InfoCard, QuickLinks } from '../components/InfoCard.jsx'
import { DbAdd, DbBar, DbFilter, ListRow, ListSearch, useFitScroll } from '../components/DbTools.jsx'

// a role's chip key: the same word in any case or accent is one chip
const roleKey = (r) => String(r || '').trim().toLocaleLowerCase('el').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
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
  const [role, setRole] = useState('') // a role chip, as Contacts' specialty chips (Alex, 27 Oct)
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
    .filter((p) => (role ? roleKey(p.role || p.dept) === role : true))
    .filter((p) => matchText(q, p.name, p.role, p.phone, p.email, p.agent, p.notes, (p.tags || []).join(' ')))
    .sort((a, b) => a.name.localeCompare(b.name))
  const all = people.filter((p) => p.kind === kind).length
  // the role chips of Crew, the most used first, each with how many; a person without a role counts under their department
  const chips = useMemo(() => {
    if (kind !== 'crew') return []
    const m = new Map()
    for (const p of people) {
      if (p.kind !== kind) continue
      const label = (p.role || p.dept || '').trim()
      const k = roleKey(label)
      if (!k) continue
      if (!m.has(k)) m.set(k, { k, n: 0, names: new Map() })
      const g = m.get(k); g.n++; g.names.set(label, (g.names.get(label) || 0) + 1)
    }
    return [...m.values()].map((g) => ({ k: g.k, n: g.n, label: [...g.names.entries()].sort((a, b) => b[1] - a[1])[0][0] })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'el'))
  }, [people, kind])
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
          <span className="ab-count">{q.trim() || dept || role ? `${list.length} of ${all}` : `${all} ${kind === 'cast' ? 'in cast' : 'in crew'}`}</span>
          <DbFilter value={dept} onChange={(e) => setDept(e.target.value)} options={[['', 'All departments'], ...DEPTS.map((d) => [d, d])]} label="Department" />
          {editable && <DbAdd label={`Add ${kind}`} onClick={() => setDraft(emptyPerson(kind))} />}
        </div>
      </DbBar>

      {chips.length > 1 && (
        <div className="ab-under">
          <nav className="chips ab-chips">
            <button type="button" className={`chip${!role ? ' on' : ''}`} onClick={() => setRole('')}>All</button>
            {chips.slice(0, 30).map((x) => <button key={x.k} type="button" className={`chip${role === x.k ? ' on' : ''}`} onClick={() => setRole(role === x.k ? '' : x.k)}>{x.label} <small>{x.n}</small></button>)}
          </nav>
        </div>
      )}
      <div className="ab-scroll" ref={scrollRef}>
      {!list.length ? (
        <Empty title={people.length ? 'No matches' : 'The database is empty'}>
          {people.length ? 'Try another search.' : 'People you add inside a project land here automatically, so the next project can pick them from the list. You can also add them directly.'}
        </Empty>
      ) : (
        // the rows of Contacts: picture, name (and agent), department and role as a chip, phone, email; a tap opens the
        // person's window (projects, notes, photos). The projects someone worked on stay in that window, so every
        // row is the same height (Alex, 10 Oct)
        <div className="lrow-list">
          {list.map((c) => (
            <ListRow key={c.id} onClick={() => setDetailFor(c.id)}
              thumb={c.photos?.[0]?.thumb ? <img src={c.photos[0].thumb} alt="" /> : initials(c.name)}
              title={c.name}
              sub={c.agent ? `Agent: ${c.agent}${c.agentPhone ? ` · ${c.agentPhone}` : ''}` : (c.notes || '').split('\n')[0]}
              chips={<>
                {(c.kind === 'cast' ? c.role : c.dept) && <span className="lchip acc"><i />{c.kind === 'cast' ? c.role : c.dept}</span>}
                {c.kind !== 'cast' && c.role && <span className="lchip">{c.role}</span>}
                {showContacts && c.phone && <a className="lchip" href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}>{c.phone}</a>}
                {showContacts && c.email && <a className="lchip" href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()}>{c.email}</a>}
                {(c.tags || []).slice(0, 3).map((t) => <span key={t} className="lchip">{t}</span>)}
              </>}
              aside={editable && <>
                <button type="button" className="btn btn-default btn-sm" onClick={() => setDraft({ ...c })}>Edit</button>
                <Confirm onConfirm={() => remove(c)} label="Delete" className="ab-del" title="Delete">×</Confirm>
              </>} />
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

      {/* the person's card, as Contacts' (Alex, 27 Oct) */}
      <InfoCard open={!!target} onClose={() => setDetailFor(null)} wide
        photo={target?.photos?.[0]?.thumb} name={target?.name}
        tags={target && <>
          {(target.kind === 'cast' ? target.role : target.dept) && <span className="ab-chip"><i />{target.kind === 'cast' ? target.role : target.dept}</span>}
          {target.kind !== 'cast' && target.role && <span className="muted">{target.role}</span>}
          {(target.tags || []).map((t) => <span key={t} className="ab-card-in">{t}</span>)}
        </>}
        quick={target && showContacts && <QuickLinks phone={target.phone} email={target.email} />}
        rows={target ? [
          ['Phone', showContacts && target.phone && <a href={`tel:${target.phone}`}>{target.phone}</a>],
          ['Email', showContacts && target.email && <a href={`mailto:${target.email}`}>{target.email}</a>],
          ['Agent', target.agent && `${target.agent}${target.agentPhone ? ` · ${target.agentPhone}` : ''}`],
          ['Used in', contactProjects(projects, target.id).length ? <span className="ab-card-links">{contactProjects(projects, target.id).map((p) => <Link key={p.id} className="proj-link" to={`/p/${p.id}`} style={{ '--pc': p.color }}>{p.title}</Link>)}</span> : <span className="muted">Not in a project yet</span>],
        ] : []}
        notes={target?.notes}
        footer={target && editable && <>
          <Confirm onConfirm={() => { remove(target); setDetailFor(null) }} label="Delete" className="ab-del">Delete</Confirm>
          <span className="grow" />
          <Button variant="primary" onClick={() => { const d = target; setDetailFor(null); setDraft({ ...d }) }}>Edit</Button>
        </>}>
        {target && <PhotoGrid title={target.kind === 'cast' ? 'Headshots & looks' : 'Photos'} photos={target.photos || []} projectId="library" ownerId={target.id} editable={editable} onChange={(photos) => setPhotos(target.id, photos)} />}
      </InfoCard>
    </section>
  )
}
