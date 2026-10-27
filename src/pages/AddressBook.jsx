import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Textarea, useIsMobile, useToast } from '../components/ui.jsx'
import { DbAdd, DbBar } from '../components/DbTools.jsx'
import { uid, useStore } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'
import { emptyContact, loadContacts, parseContactsFile, removeContacts, sameKey, saveContacts } from '../lib/addressBook.js'

/* Database > Contacts (Alex, 27 Oct 2026): the administrator's own address book. Import a contacts file (.vcf from
   an iPhone or a Mac, .csv from Google or Outlook), search it, and move anyone with one button to Crew or Cast,
   where whoever has the Crew & cast permission sees them. Contacts itself only administrators see (Database.jsx
   shows the tab to them only, and the address_book table refuses everyone else). */

const initials = (n) => (n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const PAGE = 200

export default function AddressBook({ slot }) {
  const { state, update } = useStore()
  const toast = useToast()
  const mobile = useIsMobile()
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { loadContacts().then(setList).catch((e) => { setError(e.message); setList([]) }) }, [])

  const found = useMemo(() => (list || [])
    .filter((c) => matchText(q, c.name, c.phone, c.phone2, c.email, c.company, c.title, c.notes))
    .sort((a, b) => a.name.localeCompare(b.name, 'el')), [list, q])

  const importFile = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const read = parseContactsFile(await file.text(), file.name)
      if (!read.length) throw new Error('No contacts found in this file. Use a .vcf (iPhone, Mac, Google) or a .csv with a Name column.')
      const have = new Set((list || []).map(sameKey))
      const fresh = []
      for (const c of read) { const k = sameKey(c); if (have.has(k)) continue; have.add(k); fresh.push({ ...emptyContact(), ...c, id: uid() }) }
      await saveContacts(fresh)
      setList((l) => [...(l || []), ...fresh])
      toast(`${fresh.length} contacts imported${read.length > fresh.length ? `, ${read.length - fresh.length} were already here` : ''}`, 'ok')
    } catch (e) { toast(e.message, 'error') } finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const save = async () => {
    if (!draft.name.trim()) return toast('Add a name.', 'error')
    try {
      await saveContacts([draft])
      setList((l) => [...(l || []).filter((c) => c.id !== draft.id), draft])
      setDraft(null)
    } catch (e) { toast(e.message, 'error') }
  }
  const remove = async (c) => {
    try { await removeContacts([c.id]); setList((l) => l.filter((x) => x.id !== c.id)) } catch (e) { toast(e.message, 'error') }
  }

  // to Crew or Cast: a library entry the Crew & cast permission shows; someone already there by the same name gets
  // the phone or email they were missing, and nobody is entered twice. The contact leaves Contacts.
  const moveTo = async (c, kind) => {
    const key = c.name.trim().toLowerCase()
    const existing = state.library.contacts.find((x) => x.kind === kind && (x.name || '').trim().toLowerCase() === key)
    update((s) => {
      const hit = s.library.contacts.find((x) => x.kind === kind && (x.name || '').trim().toLowerCase() === key)
      if (hit) {
        if (!hit.phone && c.phone) hit.phone = c.phone
        if (!hit.email && c.email) hit.email = c.email
      } else {
        s.library.contacts.push({
          id: uid(), kind, name: c.name.trim(), phone: c.phone, email: c.email, dept: kind === 'cast' ? 'Cast' : 'Production', role: c.title || '',
          agent: '', agentPhone: '', notes: [c.company, c.phone2 && `Also ${c.phone2}`, c.notes].filter(Boolean).join('\n'), photos: [], tags: [], createdAt: new Date().toISOString(),
        })
      }
      return s
    })
    await remove(c)
    toast(existing ? `${c.name} was already in ${kind === 'cast' ? 'Cast' : 'Crew'}: phone and email filled in` : `${c.name} moved to ${kind === 'cast' ? 'Cast' : 'Crew'}`, 'ok')
  }

  const acts = (c) => (
    <span className="ab-acts" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="btn btn-default btn-sm" onClick={() => moveTo(c, 'crew')} title="Move to Crew">→ Crew</button>
      <button type="button" className="btn btn-default btn-sm" onClick={() => moveTo(c, 'cast')} title="Move to Cast">→ Cast</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft({ ...c })}>Edit</button>
      <Confirm onConfirm={() => remove(c)} label="Delete">×</Confirm>
    </span>
  )

  return (
    <section className="panel db-card">
      <DbBar slot={slot}>
        <div className="toolbar-info">
          <strong>Contacts</strong> <span className="muted">{list ? list.length : ''}</span> <span className="muted small">· only administrators see them</span>
        </div>
        <div className="toolbar-actions">
          <Input className="input search" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE) }} placeholder="Search name, phone, email, company…" />
          <input ref={fileRef} type="file" accept=".vcf,.vcard,.csv,text/vcard,text/csv" hidden onChange={(e) => importFile(e.target.files?.[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Importing…' : 'Import file'}</Button>
          <DbAdd label="Add contact" onClick={() => setDraft(emptyContact())} />
        </div>
      </DbBar>

      {error ? <p className="small muted">{error}</p> : null}
      {!list ? <p className="muted small">Loading…</p> : !found.length ? (
        <Empty title={list.length ? 'No matches' : 'No contacts yet'}>
          {list.length ? 'Try another search.' : 'Import your contacts: a .vcf from an iPhone or a Mac (Contacts > select all > Export vCard), or a .csv from Google Contacts or Outlook. Then move whoever you work with to Crew or Cast.'}
          {!list.length && <div style={{ marginTop: 12 }}><Button variant="primary" onClick={() => fileRef.current?.click()}>Import file</Button></div>}
        </Empty>
      ) : mobile ? (
        <div className="people-grid compact ab-cards">
          {found.slice(0, shown).map((c) => (
            <article key={c.id} className="person loc-card ab-card">
              <div className="person-photo" aria-hidden="true"><span className="person-initials">{initials(c.name)}</span></div>
              <div className="person-body">
                <strong>{c.name}</strong>
                <div className="small muted">{[c.phone, c.email].filter(Boolean).join(' · ') || c.company}</div>
                {acts(c)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table people-table ab-table">
            <thead><tr><th /><th>Name</th><th>Phone</th><th>Email</th><th>Company · title</th><th /></tr></thead>
            <tbody>
              {found.slice(0, shown).map((c) => (
                <tr key={c.id}>
                  <td><span className="avatar">{initials(c.name)}</span></td>
                  <td><strong>{c.name}</strong></td>
                  <td className="small">{c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}{c.phone2 && <div className="muted">{c.phone2}</div>}</td>
                  <td className="small">{c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}</td>
                  <td className="small muted">{[c.company, c.title].filter(Boolean).join(' · ')}</td>
                  <td className="row-actions">{acts(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {found.length > shown && <div style={{ textAlign: 'center', marginTop: 12 }}><Button onClick={() => setShown((n) => n + PAGE)}>Show more ({found.length - shown})</Button></div>}

      <Modal open={!!draft} title={draft && (list || []).some((c) => c.id === draft.id) ? 'Edit contact' : 'Add contact'} onClose={() => setDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {draft && (
          <div className="stack">
            <Field label="Name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus /></Field>
            <div className="row-2">
              <Field label="Phone"><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
              <Field label="Other phone"><Input value={draft.phone2} onChange={(e) => setDraft({ ...draft, phone2: e.target.value })} /></Field>
            </div>
            <Field label="Email"><Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
            <div className="row-2">
              <Field label="Company"><Input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} /></Field>
              <Field label="Title"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </section>
  )
}
