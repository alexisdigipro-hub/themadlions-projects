import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Textarea, useToast } from '../components/ui.jsx'
import { DbAdd, DbBar } from '../components/DbTools.jsx'
import { uid, useStore } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'
import { emptyContact, loadContacts, parseContactsFile, removeContacts, sameKey, saveContacts } from '../lib/addressBook.js'

/* Database > Contacts (Alex, 27 Oct 2026): the administrator's own address book. Import a contacts file (.vcf from
   an iPhone or a Mac, .csv from Google or Outlook), search it, and move anyone with one button to Crew or Cast,
   where whoever has the Crew & cast permission sees them. Contacts itself only administrators see (Database.jsx
   shows the tab to them only, and the address_book table refuses everyone else). */

// the first letters of the name (a number or an emoji makes none: then a phone glyph)
const initials = (n) => (n || '').split(/\s+/).map((x) => (x.match(/\p{L}/u) || [])[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '☏'
const PAGE = 200
// the specialty, for the order and the groups: the same word in any case or accent is one group
const specialtyOf = (c) => (c.company || '').trim()
const groupKey = (c) => specialtyOf(c).toLocaleLowerCase('el').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function AddressBook({ slot }) {
  const { state, update } = useStore()
  const toast = useToast()
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  // the order (Alex, 27 Oct: "add sorting"): by name, newest first, or grouped by specialty; kept per device.
  // Specialty is the contact's company field (a vCard's ORG), where Alex writes what each person is: Gaffer, Artist…
  const [sort, setSort] = useState(() => { try { return localStorage.getItem('tml_ab_sort') || 'name' } catch { return 'name' } })
  const pickSort = (v) => { setSort(v); setShown(PAGE); try { localStorage.setItem('tml_ab_sort', v) } catch { /* private */ } }
  const [shown, setShown] = useState(PAGE)
  // Cards or List (Alex, 27 Oct: "keep the cards, add a list, the cards are hard to scan"); kept per device
  // the List is the main view (Alex, 27 Oct); a new key, so a device that had chosen Cards starts on List too
  const [view, setView] = useState(() => { try { return localStorage.getItem('tml_ab_view2') || 'list' } catch { return 'list' } })
  const pickView = (v) => { setView(v); try { localStorage.setItem('tml_ab_view2', v) } catch { /* private */ } }
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { loadContacts().then(setList).catch((e) => { setError(e.message); setList([]) }) }, [])

  const found = useMemo(() => (list || [])
    .filter((c) => matchText(q, c.name, c.phone, c.phone2, c.email, c.company, c.title, c.notes))
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name, 'el', { sensitivity: 'base' })
      if (sort === 'new') return (b.addedAt || '').localeCompare(a.addedAt || '') || byName
      if (sort === 'company') return (!a.company - !b.company) || specialtyOf(a).localeCompare(specialtyOf(b), 'el', { sensitivity: 'base' }) || byName
      return byName
    }), [list, q, sort])

  // ordered by specialty, the contacts come in groups with a heading each; by name or newest, one list
  const groups = useMemo(() => {
    const page = found.slice(0, shown)
    if (sort !== 'company') return [['all', '', page]]
    const m = new Map()
    for (const c of page) { const k = groupKey(c); if (!m.has(k)) m.set(k, [k, specialtyOf(c) || 'No specialty', []]); m.get(k)[2].push(c) }
    return [...m.values()]
  }, [found, shown, sort])

  const importFile = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const read = parseContactsFile(await file.text(), file.name)
      if (!read.length) throw new Error('No contacts found in this file. Use a .vcf (iPhone, Mac, Google) or a .csv with a Name column.')
      const have = new Set((list || []).map(sameKey))
      const fresh = []
      const at = new Date().toISOString()
      for (const c of read) { const k = sameKey(c); if (have.has(k)) continue; have.add(k); fresh.push({ ...emptyContact(), ...c, id: uid(), addedAt: at }) }
      await saveContacts(fresh)
      setList((l) => [...(l || []), ...fresh])
      const dup = read.length - fresh.length
      toast(`${fresh.length} contact${fresh.length === 1 ? '' : 's'} imported${dup ? `, ${dup} ${dup === 1 ? 'was' : 'were'} already here` : ''}`, 'ok')
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
          id: uid(), kind, name: c.name.trim(), phone: c.phone, email: c.email, dept: kind === 'cast' ? 'Cast' : 'Production', role: c.company || c.title || '',
          agent: '', agentPhone: '', notes: [c.company && c.title, c.phone2 && `Also ${c.phone2}`, c.notes].filter(Boolean).join('\n'), photos: [], tags: [], createdAt: new Date().toISOString(),
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
      <Confirm onConfirm={() => remove(c)} label="Delete" className="ab-del" title="Delete">×</Confirm>
    </span>
  )

  return (
    <section className="panel db-card">
      <DbBar slot={slot} className="ab-bar">
        <div className="toolbar-info">
          <strong>Contacts</strong> <span className="muted">{list ? list.length : ''}</span> <span className="muted small">· only administrators see them</span>
        </div>
        <div className="toolbar-actions">
          <span className="segmented small" role="tablist" aria-label="Sort">
            {[['name', 'Name'], ['new', 'Newest'], ['company', 'Specialty']].map(([v, l]) => <button key={v} type="button" className={sort === v ? 'on' : ''} onClick={() => pickSort(v)}>{l}</button>)}
          </span>
          <span className="segmented small" role="tablist" aria-label="Show as">
            {[['cards', 'Cards'], ['list', 'List']].map(([v, l]) => <button key={v} type="button" className={view === v ? 'on' : ''} onClick={() => pickView(v)}>{l}</button>)}
          </span>
          <Input className="input search" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE) }} placeholder="Search name, phone, email, specialty…" />
          {/* how many (Alex, 27 Oct: "with a search, show how many contacts it found") */}
          {list && <span className="ab-count">{q.trim() ? `${found.length} of ${list.length}` : `${list.length} contact${list.length === 1 ? '' : 's'}`}</span>}
          <input ref={fileRef} type="file" accept=".vcf,.vcard,.csv,text/vcard,text/csv" hidden onChange={(e) => importFile(e.target.files?.[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Importing…' : 'Import file'}</Button>
          <DbAdd label="Add contact" onClick={() => setDraft({ ...emptyContact(), addedAt: new Date().toISOString() })} />
        </div>
      </DbBar>

      {error ? <p className="small muted">{error}</p> : null}
      {!list ? <p className="muted small">Loading…</p> : !found.length ? (
        <Empty title={list.length ? 'No matches' : 'No contacts yet'}>
          {list.length ? 'Try another search.' : 'Import your contacts: a .vcf from an iPhone or a Mac (Contacts > select all > Export vCard), or a .csv from Google Contacts or Outlook. Then move whoever you work with to Crew or Cast.'}
          {!list.length && <div style={{ marginTop: 12 }}><Button variant="primary" onClick={() => fileRef.current?.click()}>Import file</Button></div>}
        </Empty>
      ) : (
        // grouped by specialty when that is the order, a heading over each group; otherwise one list
        groups.map(([key, label, items]) => (
          <div key={key} className="ab-group">
            {sort === 'company' && <div className="ab-group-head"><span className="ab-chip"><i />{label}</span><span className="muted small">{items.length}</span></div>}
            {view === 'list' ? (
              // the list: one slim soft row per person, the columns lined up (not a ruled table)
              <div className="ab-rows">
                {items.map((c) => (
                  <article key={c.id} className="ab-row" onClick={() => setDraft({ ...c })} role="button" tabIndex={0}>
                    <span className="ab-ava sm" aria-hidden="true">{initials(c.name)}</span>
                    <strong className="ab-name">{c.name}</strong>
                    <span className="ab-cell">{c.phone}{c.phone2 && <span className="muted"> · {c.phone2}</span>}</span>
                    <span className="ab-cell muted">{c.email}</span>
                    <span className="ab-cell">{sort !== 'company' && c.company && <span className="ab-chip"><i />{c.company}</span>}{c.title && <span className="muted small"> {c.title}</span>}</span>
                    {acts(c)}
                  </article>
                ))}
              </div>
            ) : (
              // the cards: soft tiles with gaps, as Crew and the Calendar; a tap edits, the buttons move
              <div className="ab-grid">
                {items.map((c) => (
                  <article key={c.id} className="ab-tile" onClick={() => setDraft({ ...c })} role="button" tabIndex={0}>
                    <span className="ab-ava" aria-hidden="true">{initials(c.name)}</span>
                    <div className="ab-body">
                      <strong>{c.name}</strong>
                      {(c.phone || c.email) && <div className="ab-line">{[c.phone, c.email].filter(Boolean).join(' · ')}</div>}
                      {(c.company || c.title) && <span className="ab-chip"><i />{[c.company, c.title].filter(Boolean).join(' · ')}</span>}
                    </div>
                    {acts(c)}
                  </article>
                ))}
              </div>
            )}
          </div>
        ))
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
              <Field label="Specialty"><Input placeholder="Gaffer, Artist, Choreographer…" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} /></Field>
              <Field label="Title"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </section>
  )
}
