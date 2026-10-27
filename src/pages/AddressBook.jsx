import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Textarea, useToast } from '../components/ui.jsx'
import { DbAdd, DbBar, useFitScroll } from '../components/DbTools.jsx'
import { uid, useStore } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'
import { emptyContact, loadContacts, parseContactsFile, removeContacts, sameKey, saveContacts, toBook, toCsv, toVcf } from '../lib/addressBook.js'
import { download } from '../lib/dates.js'

/* Database > Contacts (Alex, 27 Oct 2026): the administrator's own address book. Import a contacts file (.vcf from
   an iPhone or a Mac, .csv from Google or Outlook), search it, and move anyone with one button to Crew or Cast,
   where whoever has the Crew & cast permission sees them. Contacts itself only administrators see (Database.jsx
   shows the tab to them only, and the address_book table refuses everyone else). */

// the first letters of the name (a number or an emoji makes none: then a phone glyph)
const initials = (n) => (n || '').split(/\s+/).map((x) => (x.match(/\p{L}/u) || [])[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '☏'
const PAGE = 200
const foldName = (n) => String(n || '').trim().toLocaleLowerCase('el').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
const digits9 = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 9 ? d.slice(-9) : '' }
// the specialty, for the order and the groups: the same word in any case or accent is one group
const specialtyOf = (c) => (c.company || '').trim()
const groupKey = (c) => specialtyOf(c).toLocaleLowerCase('el').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// one tap to call or write (Alex, 27 Oct): a Greek number without its country gets +30
const intl = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.length === 10 && /^[26]/.test(d)) d = '30' + d; return d }
const QUICK = {
  call: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>,
  wa: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9a5 5 0 0 1-2.3-2.3l.9-1-1-2z" /></svg>,
  viber: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c5 0 8 2.2 8 7.5S17 18 12 18l-3 3v-3.3C5.6 16.8 4 14.3 4 10.5 4 5.2 7 3 12 3z" /><path d="M13 7.5a3 3 0 0 1 3 3M13 5.5a5 5 0 0 1 5 5" /></svg>,
  mail: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>,
}
// the contact's fields that count when two of them are joined
const FILL = ['phone', 'phone2', 'email', 'company', 'title']
const filled = (c) => FILL.filter((k) => c[k]).length + (c.notes ? 1 : 0)
/* Duplicates: the same mobile (last 9 digits), the same email or the same name (case and accents aside) puts two
   contacts in one group; a group is everyone linked that way */
function findDuplicates(list) {
  const parent = new Map(list.map((c) => [c.id, c.id]))
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x) } return x }
  const join = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb) }
  const seen = new Map()
  const link = (key, id) => { if (!key) return; if (seen.has(key)) join(seen.get(key), id); else seen.set(key, id) }
  for (const c of list) {
    link(digits9(c.phone) && 't' + digits9(c.phone), c.id)
    link(digits9(c.phone2) && 't' + digits9(c.phone2), c.id)
    link(c.email && 'e' + c.email.trim().toLowerCase(), c.id)
    const n = foldName(c.name)
    if (n && !/^[\d\s+]+$/.test(n)) link('n' + n, c.id)
  }
  const groups = new Map()
  for (const c of list) { const r = find(c.id); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c) }
  return [...groups.values()].filter((g) => g.length > 1).map((g) => g.sort((a, b) => filled(b) - filled(a)))
}
// several contacts made one: the main one keeps its fields and takes the others' where it has none; a second
// number goes to Other phone, anything more into the notes, so nothing is lost
function mergeInto(main, others) {
  const m = { ...main }
  const nums = new Set([digits9(m.phone), digits9(m.phone2)].filter(Boolean))
  const extra = []
  for (const o of others) {
    for (const k of ['email', 'company', 'title']) { if (!m[k] && o[k]) m[k] = o[k]; else if (k === 'email' && o.email && o.email.toLowerCase() !== (m.email || '').toLowerCase()) extra.push(o.email) }
    for (const ph of [o.phone, o.phone2]) {
      const d = digits9(ph)
      if (!d || nums.has(d)) continue
      nums.add(d)
      if (!m.phone) m.phone = ph; else if (!m.phone2) m.phone2 = ph; else extra.push(ph)
    }
    if (o.notes && !(m.notes || '').includes(o.notes)) m.notes = [m.notes, o.notes].filter(Boolean).join('\n')
    if (o.fav) m.fav = true
    if (o.addedAt && (!m.addedAt || o.addedAt < m.addedAt)) m.addedAt = o.addedAt
  }
  if (extra.length) m.notes = [m.notes, `Also ${extra.join(', ')}`].filter(Boolean).join('\n')
  return m
}

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
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [picked, setPicked] = useState(() => new Set()) // the contacts ticked for something done to all of them
  const [spec, setSpec] = useState('') // a specialty chip ('' all, '*' favourites)
  const [dups, setDups] = useState(null) // the Duplicates window: its groups, and the main one chosen in each
  const [specs, setSpecs] = useState(null) // the Specialties window: each specialty and its new name
  // Export (Alex, 27 Oct): what is found (a search narrows it), as vCard, CSV or Excel
  const exportAs = async (kind) => {
    setExportOpen(false)
    const rows = picked.size ? found.filter((c) => picked.has(c.id)) : found
    if (!rows.length) return toast('Nothing to export.', 'error')
    const day = new Date().toISOString().slice(0, 10)
    const name = `Contacts ${day}${q.trim() ? ` - ${q.trim().replace(/[\\/:*?"<>|]/g, ' ').slice(0, 30)}` : ''}`
    try {
      if (kind === 'vcf') download(`${name}.vcf`, toVcf(rows), 'text/vcard;charset=utf-8')
      else if (kind === 'csv') download(`${name}.csv`, toCsv(rows), 'text/csv;charset=utf-8')
      else { const { toXlsx } = await import('../lib/office/xlsx.js'); download(`${name}.xlsx`, await toXlsx(toBook(rows)), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') }
      toast(`${rows.length} contact${rows.length === 1 ? '' : 's'} exported`, 'ok')
    } catch (e) { toast(e.message, 'error') }
  }

  useEffect(() => { loadContacts().then(setList).catch((e) => { setError(e.message); setList([]) }) }, [])

  // on a computer the list scrolls in its own box, so the top row stays as it was and never moves (Alex, 27 Oct)
  const scrollRef = useFitScroll(list === null)

  const found = useMemo(() => (list || [])
    .filter((c) => matchText(q, c.name, c.phone, c.phone2, c.email, c.company, c.title, c.notes))
    .filter((c) => (!spec ? true : spec === '*' ? c.fav : groupKey(c) === spec))
    .sort((a, b) => {
      // the favourites first, in every order (Alex, 27 Oct)
      if (!!a.fav !== !!b.fav) return a.fav ? -1 : 1
      const byName = a.name.localeCompare(b.name, 'el', { sensitivity: 'base' })
      if (sort === 'new') return (b.addedAt || '').localeCompare(a.addedAt || '') || byName
      if (sort === 'company') return (!a.company - !b.company) || specialtyOf(a).localeCompare(specialtyOf(b), 'el', { sensitivity: 'base' }) || byName
      return byName
    }), [list, q, sort, spec])

  // the specialty chips: the most used first, each with how many (Alex, 27 Oct)
  const chips = useMemo(() => {
    const m = new Map()
    for (const c of list || []) {
      const k = groupKey(c)
      if (!k) continue
      if (!m.has(k)) m.set(k, { k, n: 0, names: new Map() })
      const g = m.get(k); g.n++; g.names.set(specialtyOf(c), (g.names.get(specialtyOf(c)) || 0) + 1)
    }
    return [...m.values()].map((g) => ({ k: g.k, n: g.n, label: [...g.names.entries()].sort((a, b) => b[1] - a[1])[0][0] })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'el'))
  }, [list])
  const favCount = useMemo(() => (list || []).filter((c) => c.fav).length, [list])

  // who is already in Crew or Cast, by name (case and accents aside) or by mobile (the last 9 digits): they get a
  // faint accent tint (Alex, 27 Oct)
  const inLibrary = useMemo(() => {
    const names = new Map(), phones = new Map()
    for (const x of state.library.contacts) {
      const where = x.kind === 'cast' ? 'Cast' : 'Crew'
      if (x.name) names.set(foldName(x.name), where)
      for (const ph of [x.phone, x.agentPhone]) { const d = digits9(ph); if (d) phones.set(d, where) }
    }
    return (c) => names.get(foldName(c.name)) || phones.get(digits9(c.phone)) || phones.get(digits9(c.phone2)) || ''
  }, [state.library.contacts])

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
    try { await removeContacts([c.id]); setList((l) => l.filter((x) => x.id !== c.id)); setPicked((p) => { const n = new Set(p); n.delete(c.id); return n }) } catch (e) { toast(e.message, 'error') }
  }
  const saveMany = async (changed) => {
    await saveContacts(changed)
    const byId = new Map(changed.map((c) => [c.id, c]))
    setList((l) => l.map((c) => byId.get(c.id) || c))
  }
  const toggleFav = async (c) => { try { await saveMany([{ ...c, fav: !c.fav }]) } catch (e) { toast(e.message, 'error') } }
  const pick = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const pickedList = () => (list || []).filter((c) => picked.has(c.id))
  const removePicked = async () => {
    const ids = [...picked]
    try { await removeContacts(ids); setList((l) => l.filter((c) => !picked.has(c.id))); setPicked(new Set()); toast(`${ids.length} deleted`, 'ok') } catch (e) { toast(e.message, 'error') }
  }
  const favPicked = async () => {
    const cs = pickedList(); const on = cs.some((c) => !c.fav)
    try { await saveMany(cs.map((c) => ({ ...c, fav: on }))); toast(on ? `${cs.length} added to favourites` : `${cs.length} out of favourites`, 'ok') } catch (e) { toast(e.message, 'error') }
  }

  /* Duplicates: groups of the same person; in each the fullest is the main one, the rest join it */
  const openDups = () => { const g = findDuplicates(list || []); if (!g.length) return toast('No duplicates found.', 'ok'); setDups({ groups: g, main: Object.fromEntries(g.map((x) => [x[0].id, x[0].id])) }) }
  const mergeGroups = async (groups) => {
    const keep = [], drop = []
    for (const g of groups) {
      const mainId = dups.main[g[0].id] || g[0].id
      const main = g.find((c) => c.id === mainId)
      keep.push(mergeInto(main, g.filter((c) => c.id !== mainId)))
      drop.push(...g.filter((c) => c.id !== mainId).map((c) => c.id))
    }
    try {
      await saveContacts(keep); await removeContacts(drop)
      const byId = new Map(keep.map((c) => [c.id, c])), gone = new Set(drop)
      setList((l) => l.filter((c) => !gone.has(c.id)).map((c) => byId.get(c.id) || c))
      const left = dups.groups.filter((g) => !groups.includes(g))
      setDups(left.length ? { ...dups, groups: left } : null)
      toast(`${drop.length} duplicate${drop.length === 1 ? '' : 's'} joined into ${keep.length}`, 'ok')
    } catch (e) { toast(e.message, 'error') }
  }

  /* Specialties: every specialty with its count; a new name changes it on all its contacts, and two given the same
     name become one */
  const openSpecs = () => setSpecs(chips.map((c) => ({ ...c, to: c.label })))
  const saveSpecs = async () => {
    const to = new Map(specs.filter((x) => x.to.trim() !== x.label).map((x) => [x.k, x.to.trim()]))
    const changed = (list || []).filter((c) => to.has(groupKey(c))).map((c) => ({ ...c, company: to.get(groupKey(c)) }))
    if (!changed.length) return setSpecs(null)
    try { await saveMany(changed); setSpecs(null); setSpec(''); toast(`${changed.length} contacts updated`, 'ok') } catch (e) { toast(e.message, 'error') }
  }

  // to Crew or Cast: a library entry the Crew & cast permission shows; someone already there by the same name gets
  // the phone or email they were missing, and nobody is entered twice. The contact leaves Contacts.
  const moveMany = async (cs, kind) => {
    const where = kind === 'cast' ? 'Cast' : 'Crew'
    let filledIn = 0
    update((s) => {
      for (const c of cs) {
        const key = c.name.trim().toLowerCase()
        const hit = s.library.contacts.find((x) => x.kind === kind && (x.name || '').trim().toLowerCase() === key)
        if (hit) {
          filledIn++
          if (!hit.phone && c.phone) hit.phone = c.phone
          if (!hit.email && c.email) hit.email = c.email
        } else {
          s.library.contacts.push({
            id: uid(), kind, name: c.name.trim(), phone: c.phone, email: c.email, dept: kind === 'cast' ? 'Cast' : 'Production', role: c.company || c.title || '',
            agent: '', agentPhone: '', notes: [c.company && c.title, c.phone2 && `Also ${c.phone2}`, c.notes].filter(Boolean).join('\n'), photos: [], tags: [], createdAt: new Date().toISOString(),
          })
        }
      }
      return s
    })
    const ids = cs.map((c) => c.id)
    try { await removeContacts(ids) } catch (e) { return toast(e.message, 'error') }
    const gone = new Set(ids)
    setList((l) => l.filter((c) => !gone.has(c.id)))
    setPicked((p) => { const n = new Set(p); ids.forEach((id) => n.delete(id)); return n })
    toast(cs.length === 1 ? (filledIn ? `${cs[0].name} was already in ${where}: phone and email filled in` : `${cs[0].name} moved to ${where}`) : `${cs.length} moved to ${where}${filledIn ? ` (${filledIn} were there already)` : ''}`, 'ok')
  }
  const moveTo = (c, kind) => moveMany([c], kind)

  // call, WhatsApp, Viber, email: round icons, only for what the contact has (Alex, 27 Oct)
  const quick = (c) => {
    const n = intl(c.phone || c.phone2)
    if (!n && !c.email) return null
    return (
      <span className="ab-quick" onClick={(e) => e.stopPropagation()}>
        {n && <a className="ab-q" href={`tel:+${n}`} title={`Call ${c.phone || c.phone2}`} aria-label="Call">{QUICK.call}</a>}
        {n && <a className="ab-q" href={`https://wa.me/${n}`} target="_blank" rel="noreferrer" title="WhatsApp" aria-label="WhatsApp">{QUICK.wa}</a>}
        {n && <a className="ab-q" href={`viber://chat?number=%2B${n}`} title="Viber" aria-label="Viber">{QUICK.viber}</a>}
        {c.email && <a className="ab-q" href={`mailto:${c.email}`} title={`Email ${c.email}`} aria-label="Email">{QUICK.mail}</a>}
      </span>
    )
  }
  const check = (c) => (
    <label className="ab-check" onClick={(e) => e.stopPropagation()} title="Select">
      <input type="checkbox" checked={picked.has(c.id)} onChange={() => pick(c.id)} />
    </label>
  )
  const star = (c) => (
    <button type="button" className={`ab-star${c.fav ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFav(c) }} title={c.fav ? 'In favourites' : 'Add to favourites'} aria-label="Favourite">{c.fav ? '★' : '☆'}</button>
  )
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
          {/* × empties the search, as does Escape (Alex, 27 Oct) */}
          <span className="ab-search">
            <Input className="input search" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE) }} onKeyDown={(e) => { if (e.key === 'Escape' && q) { setQ(''); setShown(PAGE) } }} placeholder="Search name, phone, email, specialty…" />
            {q && <button type="button" className="ab-search-x" aria-label="Clear the search" title="Clear" onClick={() => { setQ(''); setShown(PAGE) }}>×</button>}
          </span>
          {/* how many (Alex, 27 Oct: "with a search, show how many contacts it found") */}
          {list && <span className="ab-count">{q.trim() ? `${found.length} of ${list.length}` : `${list.length} contact${list.length === 1 ? '' : 's'}`}</span>}
          <input ref={fileRef} type="file" accept=".vcf,.vcard,.csv,text/vcard,text/csv" hidden onChange={(e) => importFile(e.target.files?.[0])} />
          {/* one ⋯ menu for Import, Export, Duplicates and Specialties, so the whole bar fits on the tabs' line */}
          <span className="ab-export">
            <button type="button" className={`btn btn-default ab-more${exportOpen ? ' on' : ''}`} onClick={() => setExportOpen((o) => !o)} aria-label="More" title="Import, Export, Duplicates, Specialties">{busy ? '…' : '⋯'}</button>
            {exportOpen && (
              <>
                <span className="ab-export-shade" onClick={() => setExportOpen(false)} />
                <span className="ab-export-menu" role="menu">
                  <button type="button" role="menuitem" disabled={busy} onClick={() => { setExportOpen(false); fileRef.current?.click() }}><b>Import file</b><small>.vcf or .csv · iPhone, Mac, Google, Outlook</small></button>
                  {found.length > 0 && <>
                    <span className="ab-export-head">Export {picked.size ? `the ${picked.size} selected` : q.trim() || spec ? `the ${found.length} found` : `all ${found.length}`}</span>
                    <button type="button" role="menuitem" onClick={() => exportAs('vcf')}><b>vCard</b><small>.vcf · iPhone, Mac, Google Contacts</small></button>
                    <button type="button" role="menuitem" onClick={() => exportAs('csv')}><b>CSV</b><small>.csv · Google Contacts, Outlook</small></button>
                    <button type="button" role="menuitem" onClick={() => exportAs('xlsx')}><b>Excel</b><small>.xlsx · Excel, Numbers</small></button>
                  </>}
                  <span className="ab-export-head">Tidy up</span>
                  <button type="button" role="menuitem" disabled={!list?.length} onClick={() => { setExportOpen(false); openDups() }}><b>Duplicates</b><small>The same person twice, joined into one</small></button>
                  <button type="button" role="menuitem" disabled={!chips.length} onClick={() => { setExportOpen(false); openSpecs() }}><b>Specialties</b><small>Rename or join specialties</small></button>
                </span>
              </>
            )}
          </span>
          <DbAdd label="Add contact" onClick={() => setDraft({ ...emptyContact(), addedAt: new Date().toISOString() })} />
        </div>
      </DbBar>

      {/* under the top row (Alex, 27 Oct: the search and buttons up on the tabs' line, as every Database tab): the
          specialty chips, the order, and the selection */}
        {/* the specialty chips, the most used first; ★ the favourites */}
        <div className="ab-under">
          {chips.length > 0 && (
          <nav className="chips ab-chips">
            <button type="button" className={`chip${!spec ? ' on' : ''}`} onClick={() => { setSpec(''); setShown(PAGE) }}>All</button>
            {favCount > 0 && <button type="button" className={`chip${spec === '*' ? ' on' : ''}`} onClick={() => { setSpec(spec === '*' ? '' : '*'); setShown(PAGE) }}>★ Favourites <small>{favCount}</small></button>}
            {chips.slice(0, 24).map((x) => <button key={x.k} type="button" className={`chip${spec === x.k ? ' on' : ''}`} onClick={() => { setSpec(spec === x.k ? '' : x.k); setShown(PAGE) }}>{x.label} <small>{x.n}</small></button>)}
          </nav>
          )}
          <span className="segmented small" role="tablist" aria-label="Sort">
            {[['name', 'Name'], ['new', 'Newest'], ['company', 'Specialty']].map(([v, l]) => <button key={v} type="button" className={sort === v ? 'on' : ''} onClick={() => pickSort(v)}>{l}</button>)}
          </span>
        </div>
        {/* what is done to the ticked contacts at once */}
        {picked.size > 0 && (
          <div className="ab-sel">
            <strong>{picked.size} selected</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicked(new Set(found.map((c) => c.id)))}>Select all {found.length}</button>
            <span className="grow" />
            <button type="button" className="btn btn-default btn-sm" onClick={() => moveMany(pickedList(), 'crew')}>→ Crew</button>
            <button type="button" className="btn btn-default btn-sm" onClick={() => moveMany(pickedList(), 'cast')}>→ Cast</button>
            <button type="button" className="btn btn-default btn-sm" onClick={favPicked}>★ Favourite</button>
            <button type="button" className="btn btn-default btn-sm" onClick={() => setExportOpen(true)}>Export</button>
            <Confirm onConfirm={removePicked} label={`Delete ${picked.size}`} className="ab-del">Delete</Confirm>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicked(new Set())} aria-label="Clear the selection">✕</button>
          </div>
        )}

      {error ? <p className="small muted">{error}</p> : null}
      <div className="ab-scroll" ref={scrollRef}>
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
            {/* one slim soft row per person, the columns lined up (not a ruled table); List only (Alex, 27 Oct) */}
              <div className="ab-rows">
                {items.map((c) => (
                  <article key={c.id} className={`ab-row${inLibrary(c) ? ' ab-in' : ''}`} title={inLibrary(c) ? `Already in ${inLibrary(c)}` : undefined} onClick={() => setDraft({ ...c })} role="button" tabIndex={0}>
                    {check(c)}
                    <span className="ab-ava sm" aria-hidden="true">{initials(c.name)}</span>
                    <strong className="ab-name">{star(c)}{c.name}</strong>
                    <span className="ab-cell">{c.phone}{c.phone2 && <span className="muted"> · {c.phone2}</span>}</span>
                    <span className="ab-cell muted">{c.email}</span>
                    <span className="ab-cell">{sort !== 'company' && c.company && <span className="ab-chip"><i />{c.company}</span>}{c.title && <span className="muted small"> {c.title}</span>}</span>
                    {quick(c) || <span />}
                    {acts(c)}
                  </article>
                ))}
              </div>
          </div>
        ))
      )}
      {found.length > shown && <div style={{ textAlign: 'center', marginTop: 12 }}><Button onClick={() => setShown((n) => n + PAGE)}>Show more ({found.length - shown})</Button></div>}
      </div>

      <Modal open={!!dups} wide title={dups ? `Duplicates · ${dups.groups.length}` : ''} onClose={() => setDups(null)}
        footer={dups && <><Button variant="ghost" onClick={() => setDups(null)}>Close</Button><Button variant="primary" onClick={() => mergeGroups(dups.groups)}>Join all {dups.groups.length}</Button></>}>
        {dups && (
          <div className="ab-dups">
            <p className="muted small">The same mobile, email or name. In each group the ticked one stays and takes the others' phones, email and notes; nothing is lost.</p>
            {dups.groups.slice(0, 60).map((g) => (
              <section key={g[0].id} className="ab-dup">
                {g.map((c) => (
                  <label key={c.id} className="ab-dup-row">
                    <input type="radio" name={`dup-${g[0].id}`} checked={(dups.main[g[0].id] || g[0].id) === c.id} onChange={() => setDups({ ...dups, main: { ...dups.main, [g[0].id]: c.id } })} />
                    <strong>{c.name}</strong>
                    <span className="muted small">{[c.phone, c.phone2, c.email, c.company].filter(Boolean).join(' · ')}</span>
                  </label>
                ))}
                <div className="ab-dup-acts">
                  <Button size="sm" variant="primary" onClick={() => mergeGroups([g])}>Join</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDups(dups.groups.length > 1 ? { ...dups, groups: dups.groups.filter((x) => x !== g) } : null)}>Not the same</Button>
                </div>
              </section>
            ))}
            {dups.groups.length > 60 && <p className="muted small">And {dups.groups.length - 60} more: join these and open Duplicates again.</p>}
          </div>
        )}
      </Modal>

      <Modal open={!!specs} title="Specialties" onClose={() => setSpecs(null)}
        footer={specs && <><Button variant="ghost" onClick={() => setSpecs(null)}>Cancel</Button><Button variant="primary" onClick={saveSpecs}>Save</Button></>}>
        {specs && (
          <div className="ab-specs">
            <p className="muted small">Rename a specialty for all its contacts. Give two the same name and they become one (e.g. "artist" and "Καλλιτέχνης" both "Artist").</p>
            {specs.map((x, i) => (
              <div key={x.k} className="ab-spec-row">
                <Input value={x.to} onChange={(e) => setSpecs(specs.map((y, j) => (j === i ? { ...y, to: e.target.value } : y)))} />
                <span className="muted small">{x.n}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

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
