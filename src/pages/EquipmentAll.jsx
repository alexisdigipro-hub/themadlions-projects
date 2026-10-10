import { useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../components/ui.jsx'
import { can, gearCategoriesOf, uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'
import PhotoGrid from '../components/PhotoGrid.jsx'
import { DbAdd, DbFilter } from '../components/DbTools.jsx'

/* Database > Equipment (Alex, 10 Oct): the company's own film equipment, each item with what it is,
   how many, its serial and a rental price per day, so it can later be sent to whoever wants to rent it.
   The same cards and window as Locations; stored in the library table as kind 'gear'
   (supabase/equipment.sql). Sending a price list comes next. */
const emptyItem = (category) => ({ id: uid(), name: '', category, model: '', qty: 1, dayRate: '', serial: '', notes: '', photos: [], createdAt: new Date().toISOString() })
const euro = (n) => (Number(n) ? `€${Number(n).toLocaleString('el-GR', { maximumFractionDigits: 2 })}` : '')

export default function EquipmentAll() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const editable = can(user, 'gear', 'edit')
  const cats = gearCategoriesOf(state)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [detailFor, setDetailFor] = useState('')
  const [draft, setDraft] = useState(null)
  const items = state.library.gear || []
  const list = items
    .filter((g) => (cat ? g.category === cat : true))
    .filter((g) => matchText(q, g.name, g.model, g.category, g.serial, g.notes))
    .sort((a, b) => (cats.indexOf(a.category) - cats.indexOf(b.category)) || a.name.localeCompare(b.name))
  const detail = items.find((g) => g.id === detailFor)

  const save = () => {
    if (!draft.name.trim()) return toast('Name the item.', 'error')
    const item = { ...draft, name: draft.name.trim(), qty: Math.max(1, Number(draft.qty) || 1), dayRate: draft.dayRate === '' ? '' : Number(draft.dayRate) || 0 }
    update((s) => {
      s.library.gear = s.library.gear || []
      const i = s.library.gear.findIndex((g) => g.id === item.id)
      if (i >= 0) s.library.gear[i] = item
      else s.library.gear.push(item)
      return s
    })
    setDetailFor(item.id)
    setDraft(null)
    toast('Saved to Equipment', 'ok')
  }
  const remove = (g) => {
    update((s) => { s.library.gear = (s.library.gear || []).filter((x) => x.id !== g.id); return s })
    setDetailFor('')
  }
  const setPhotos = (id, photos) => update((s) => {
    const g = (s.library.gear || []).find((x) => x.id === id)
    if (g) g.photos = photos
    return s
  })

  return (
    <section className="panel db-card">
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>Equipment</strong> <span className="muted">{items.length}</span>
        </div>
        <div className="toolbar-actions">
          <Input className="input search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, model, serial…" />
          <DbFilter value={cat} onChange={(e) => setCat(e.target.value)} options={[['', 'All categories'], ...cats.map((c) => [c, c])]} label="Category" />
          {editable && <DbAdd label="Add equipment" onClick={() => setDraft(emptyItem(cat || cats[0]))} />}
        </div>
      </div>

      {!list.length ? (
        <Empty title={items.length ? 'No matches' : 'No equipment yet'}>
          {items.length ? 'Try another search.' : 'Add the cameras, lenses, lights and the rest you own, with a rental price per day, so you can send them to whoever wants to rent.'}
        </Empty>
      ) : (
        <div className="people-grid compact">
          {list.map((g) => (
            <article key={g.id} className="person loc-card" onClick={() => setDetailFor(g.id)} role="button" tabIndex={0}>
              <div className="person-photo" aria-hidden="true">
                {g.photos?.[0]?.thumb ? <img src={g.photos[0].thumb} alt="" /> : <span className="person-initials">🎥</span>}
              </div>
              <div className="person-body">
                <strong>{g.name}{Number(g.qty) > 1 ? ` ×${g.qty}` : ''}</strong>
                <div className="small muted">{[g.category, g.model].filter(Boolean).join(' · ')}</div>
                {euro(g.dayRate) && <div className="small">{euro(g.dayRate)} / day</div>}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={!!detail} title={detail?.name || ''} onClose={() => setDetailFor('')}>
        {detail && (
          <div className="stack">
            <div className="row-actions">
              {editable && <Button size="sm" onClick={() => { const d = detail; setDetailFor(''); setDraft({ ...d }) }}>Edit</Button>}
              {editable && <Confirm onConfirm={() => remove(detail)} />}
            </div>
            <dl className="details">
              <dt>Category</dt><dd>{detail.category || '–'}</dd>
              {detail.model && (<><dt>Brand / model</dt><dd>{detail.model}</dd></>)}
              <dt>Quantity</dt><dd>{detail.qty || 1}</dd>
              <dt>Rental</dt><dd>{euro(detail.dayRate) ? `${euro(detail.dayRate)} / day` : <span className="muted">No price yet</span>}</dd>
              {detail.serial && (<><dt>Serial</dt><dd>{detail.serial}</dd></>)}
            </dl>
            {detail.notes && <p className="notes-text">{detail.notes}</p>}
            <PhotoGrid photos={detail.photos || []} projectId="library" ownerId={detail.id} editable={editable} onChange={(photos) => setPhotos(detail.id, photos)} />
          </div>
        )}
      </Modal>

      <Modal open={!!draft} title={draft && items.some((g) => g.id === draft.id) ? 'Edit equipment' : 'New equipment'} onClose={() => setDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {draft && (
          <div className="stack">
            <div className="row-2">
              <Field label="Name"><Input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Sony FX6" /></Field>
              <Field label="Category"><Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} options={cats.includes(draft.category) || !draft.category ? cats : [draft.category, ...cats]} /></Field>
            </div>
            <div className="row-2">
              <Field label="Brand / model"><Input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="Body only, with 2 batteries" /></Field>
              <Field label="Serial number"><Input value={draft.serial} onChange={(e) => setDraft({ ...draft, serial: e.target.value })} /></Field>
            </div>
            <div className="row-2">
              <Field label="Quantity"><Input type="number" min="1" inputMode="numeric" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} /></Field>
              <Field label="Rental price per day (€)"><Input type="number" min="0" step="any" inputMode="decimal" value={draft.dayRate} onChange={(e) => setDraft({ ...draft, dayRate: e.target.value })} placeholder="0" /></Field>
            </div>
            <Field label="Notes"><Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="What comes with it, condition, insurance value" /></Field>
          </div>
        )}
      </Modal>
    </section>
  )
}
