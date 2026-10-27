import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { gearCategoriesOf, uid, useStore } from '../../lib/store.jsx'
import { download } from '../../lib/dates.js'
import { InfoCard, QuickLinks } from '../../components/InfoCard.jsx'

const GEAR_STATUS = [['needed', 'Needed'], ['quoted', 'Quoted'], ['booked', 'Booked'], ['out', 'Picked up'], ['returned', 'Returned']]
const emptyItem = (cats) => ({ id: uid(), category: cats[0] || '', item: '', qty: 1, vendor: '', rate: '', days: '', pickup: '', dropoff: '', status: 'needed', notes: '' })
const emptyVendor = () => ({ id: uid(), name: '', contact: '', phone: '', email: '', address: '', notes: '' })

/* On the Project Database an empty card is noise, so `hideEmpty` draws nothing until there is a
   piece of equipment and `startSignal` (a counter the page bumps) opens the form from a button
   out there. Nothing else passes either. */
export default function Gear({ hideEmpty = false, startSignal = 0 }) {
  const { project, edit, canEdit } = useProject()
  const { state } = useStore()
  const toast = useToast()
  const editable = canEdit('gear')
  const gear = project.gear || []
  const vendors = project.vendors || []
  const [draft, setDraft] = useState(null)
  const [vdraft, setVdraft] = useState(null)
  const [cat, setCat] = useState('')
  // an item's or a vendor's card, as Contacts' (Alex, 27 Oct)
  const [cardId, setCardId] = useState('')
  const [vcardId, setVcardId] = useState('')
  const cur = project.budget?.currency || 'EUR'
  const money = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Number(n) || 0)

  // the standard list from Settings > Calendar & projects, plus an "Unlisted" group for items
  // whose category was since removed there, so nothing already entered goes missing
  const GEAR_CATS = gearCategoriesOf(state)
  const stray = useMemo(() => [...new Set(gear.map((g) => g.category).filter((c) => c && !GEAR_CATS.includes(c)))], [gear, GEAR_CATS])
  const allCats = [...GEAR_CATS, ...stray]
  const groups = useMemo(() => allCats.map((c) => [c, gear.filter((g) => g.category === c && (!cat || cat === c))]).filter(([, l]) => l.length), [gear, cat, allCats])
  const cost = (g) => Number(g.rate || 0) * Number(g.days || 1) * Number(g.qty || 1)
  const total = gear.reduce((a, g) => a + cost(g), 0)
  const byStatus = (st) => gear.filter((g) => g.status === st).length

  const save = () => {
    if (!draft.item.trim()) return toast('Name the item.', 'error')
    edit((p) => {
      p.gear = p.gear || []
      const i = p.gear.findIndex((g) => g.id === draft.id)
      if (i >= 0) p.gear[i] = draft
      else p.gear.push(draft)
      if (draft.vendor && !(p.vendors || []).some((v) => v.name.toLowerCase() === draft.vendor.toLowerCase())) {
        p.vendors = [...(p.vendors || []), { ...emptyVendor(), name: draft.vendor }]
      }
    })
    setDraft(null)
    toast('Item saved', 'ok')
  }
  const saveVendor = () => {
    if (!vdraft.name.trim()) return toast('Name the vendor.', 'error')
    edit((p) => {
      p.vendors = p.vendors || []
      const i = p.vendors.findIndex((v) => v.id === vdraft.id)
      if (i >= 0) p.vendors[i] = vdraft
      else p.vendors.push(vdraft)
    })
    setVdraft(null)
    toast('Vendor saved', 'ok')
  }
  const setStatus = (id, status) => edit((p) => {
    const g = p.gear.find((x) => x.id === id)
    if (g) g.status = status
  })
  const toBudget = () => {
    const booked = gear.filter((g) => ['quoted', 'booked', 'out', 'returned'].includes(g.status) && Number(g.rate))
    if (!booked.length) return toast('No quoted or booked items with a rate yet.', 'error')
    edit((p) => {
      p.budget = p.budget || { lines: [], contingencyPct: 10, currency: 'EUR', cap: '' }
      booked.forEach((g) => {
        const existing = p.budget.lines.find((l) => l.gearId === g.id)
        const line = { id: existing?.id || uid(), gearId: g.id, category: 'Equipment rental', description: `${g.item}${g.qty > 1 ? ` ×${g.qty}` : ''}`, qty: Number(g.days || 1) * Number(g.qty || 1), unit: 'day', rate: Number(g.rate), estimate: '', actual: existing?.actual ?? '', vendor: g.vendor, notes: existing?.notes || '' }
        if (existing) Object.assign(existing, line)
        else p.budget.lines.push(line)
      })
    })
    toast(`${booked.length} lines synced to the budget`, 'ok')
  }
  const exportCSV = () => {
    const head = ['Category', 'Item', 'Qty', 'Vendor', 'Rate', 'Days', 'Cost', 'Pickup', 'Return', 'Status', 'Notes']
    const rows = gear.map((g) => [g.category, g.item, g.qty, g.vendor, g.rate, g.days, cost(g), g.pickup, g.dropoff, g.status, g.notes])
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    download(`${project.title} - equipment.csv`, '\uFEFF' + csv, 'text/csv')
  }

  // The forms live apart from the cards, so a button on the Project Database still has one
  // to open while this card is hidden.
  const modals = (
    <>
      {draft && (
        <Modal open title={gear.some((g) => g.id === draft.id) ? 'Edit item' : 'New item'} onClose={() => setDraft(null)}
          footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save item</Button></>}>
          <div className="row-2">
            <Field label="Category"><Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} options={draft.category && !GEAR_CATS.includes(draft.category) ? [...GEAR_CATS, draft.category] : GEAR_CATS} /></Field>
            <Field label="Status"><Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} options={GEAR_STATUS} /></Field>
          </div>
          <Field label="Item"><Input autoFocus value={draft.item} onChange={(e) => setDraft({ ...draft, item: e.target.value })} placeholder="Alexa Mini LF body, Cooke S4 set, Aputure 600d" /></Field>
          <div className="row-3">
            <Field label="Quantity"><Input type="number" min="1" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} /></Field>
            <Field label={`Rate per day (${cur})`}><Input type="number" min="0" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.target.value })} /></Field>
            <Field label="Days"><Input type="number" min="0" value={draft.days} onChange={(e) => setDraft({ ...draft, days: e.target.value })} /></Field>
          </div>
          <Field label="Vendor">
            <Input list="vendor-names" value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} placeholder="Rental house" />
            <datalist id="vendor-names">{vendors.map((v) => <option key={v.id} value={v.name} />)}</datalist>
          </Field>
          <div className="row-2">
            <Field label="Pickup"><Input type="date" value={draft.pickup} onChange={(e) => setDraft({ ...draft, pickup: e.target.value })} /></Field>
            <Field label="Return"><Input type="date" value={draft.dropoff} onChange={(e) => setDraft({ ...draft, dropoff: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Insurance, serial numbers, who picks up" /></Field>
        </Modal>
      )}
      {vdraft && (
        <Modal open title={vendors.some((v) => v.id === vdraft.id) ? 'Edit vendor' : 'New vendor'} onClose={() => setVdraft(null)}
          footer={<><Button variant="ghost" onClick={() => setVdraft(null)}>Cancel</Button><Button variant="primary" onClick={saveVendor}>Save vendor</Button></>}>
          <Field label="Name"><Input autoFocus value={vdraft.name} onChange={(e) => setVdraft({ ...vdraft, name: e.target.value })} /></Field>
          <div className="row-2">
            <Field label="Contact person"><Input value={vdraft.contact} onChange={(e) => setVdraft({ ...vdraft, contact: e.target.value })} /></Field>
            <Field label="Phone"><Input value={vdraft.phone} onChange={(e) => setVdraft({ ...vdraft, phone: e.target.value })} /></Field>
          </div>
          <div className="row-2">
            <Field label="Email"><Input type="email" value={vdraft.email} onChange={(e) => setVdraft({ ...vdraft, email: e.target.value })} /></Field>
            <Field label="Address"><Input value={vdraft.address} onChange={(e) => setVdraft({ ...vdraft, address: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={vdraft.notes} onChange={(e) => setVdraft({ ...vdraft, notes: e.target.value })} placeholder="Opening hours, payment terms, insurance requirements" /></Field>
        </Modal>
      )}
    </>
  )

  useEffect(() => { if (startSignal) setDraft(emptyItem(GEAR_CATS)) }, [startSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  if (hideEmpty && !gear.length) return modals

  return (
    <div className="gear">
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>Equipment</strong> <span className="muted">{gear.length} items · {money(total)}</span>
          <span className="muted">{byStatus('needed')} needed · {byStatus('quoted')} quoted · {byStatus('booked')} booked · {byStatus('out')} out</span>
        </div>
        <div className="toolbar-actions">
          <Select value={cat} onChange={(e) => setCat(e.target.value)} options={[['', 'All categories'], ...allCats.map((c) => [c, c])]} />
          {gear.length > 0 && <Button variant="ghost" onClick={exportCSV}>Export CSV</Button>}
          {editable && gear.length > 0 && <Button variant="ghost" onClick={toBudget}>Sync to budget</Button>}
          {editable && <Button variant="ghost" onClick={() => setVdraft(emptyVendor())}>Add vendor</Button>}
          {editable && <Button variant="primary" onClick={() => setDraft(emptyItem(GEAR_CATS))}>Add item</Button>}
        </div>
      </div>

      <div className={`cols gear-layout${vendors.length ? '' : ' one'}`}>
        <div>
          {!gear.length ? (
            <Empty title="No equipment yet">List the camera package, lenses, lights, grip, sound and specials. Each item carries vendor, rate, pickup and return dates. Booked items sync into the <Link to="../budget">budget</Link>.</Empty>
          ) : (
            groups.map(([c, items]) => (
              <section key={c} className="gear-group">
                <h3>{c} <span className="muted">{items.length}</span></h3>
                {/* rows as Contacts' list (Alex, 27 Oct); a tap opens the item's card */}
                <div className="ab-rows">
                  {items.map((g) => (
                    <article key={g.id} className={`ab-row gear-prow${g.status === 'returned' ? ' dim' : ''}`} onClick={() => setCardId(g.id)} role="button" tabIndex={0}>
                      <span className="ab-two"><strong className="ab-name">{g.item}{Number(g.qty) > 1 && <span className="muted"> ×{g.qty}</span>}</strong>{g.notes && <span className="muted small">{g.notes}</span>}</span>
                      <span className="ab-cell">{g.vendor && <span className="ab-chip"><i />{g.vendor}</span>}</span>
                      <span className="ab-cell muted">{[g.rate && `${money(g.rate)} × ${g.days || 1}`].filter(Boolean).join('')}</span>
                      <span className="ab-cell ab-rate">{g.rate ? money(cost(g)) : ''}</span>
                      <span className="ab-cell muted small">{[g.pickup, g.dropoff].filter(Boolean).join(' → ')}</span>
                      <span className="ab-acts" onClick={(e) => e.stopPropagation()}>
                        {editable ? (
                          <select className="input select tiny" value={g.status} onChange={(e) => setStatus(g.id, e.target.value)}>
                            {GEAR_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        ) : <span className="ab-card-in">{GEAR_STATUS.find(([v]) => v === g.status)?.[1]}</span>}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Vendors fill themselves in from the items, so until there is one the card would only
            be a box explaining that it is empty. */}
        {vendors.length > 0 && (
        <section className="panel">
          <div className="panel-head"><h2>Vendors</h2></div>
          <div className="ab-rows">
            {vendors.map((v) => (
              <article key={v.id} className="ab-row lib-row" onClick={() => setVcardId(v.id)} role="button" tabIndex={0}>
                <span className="ab-ava sm" aria-hidden="true">{(v.name || '?').slice(0, 2).toUpperCase()}</span>
                <strong className="ab-name">{v.name}</strong>
                <span className="ab-cell muted">{v.contact}</span>
                <span className="ab-cell" onClick={(e) => e.stopPropagation()}>{v.phone && <a href={`tel:${v.phone}`}>{v.phone}</a>}</span>
                <span className="ab-cell muted">{gear.filter((g) => g.vendor === v.name).length} items</span>
                <span />
              </article>
            ))}
          </div>
        </section>
        )}
      </div>

      {(() => {
        const g = gear.find((x) => x.id === cardId)
        const v = vendors.find((x) => x.id === vcardId) || (g && vendors.find((x) => x.name === g.vendor))
        return <>
          <InfoCard open={!!g} onClose={() => setCardId('')} square glyph="🎥" name={g && `${g.item}${Number(g.qty) > 1 ? ` ×${g.qty}` : ''}`}
            tags={g && <>
              {g.category && <span className="ab-chip"><i />{g.category}</span>}
              <span className="ab-card-in">{GEAR_STATUS.find(([x]) => x === g.status)?.[1]}</span>
            </>}
            quick={g && v && <QuickLinks phone={v.phone} email={v.email} />}
            rows={g ? [
              ['Vendor', g.vendor && <>{g.vendor}{v?.contact ? <span className="muted"> · {v.contact}</span> : ''}</>],
              ['Rate', g.rate && `${money(g.rate)} a day × ${g.days || 1}`],
              ['Cost', g.rate && money(cost(g))],
              ['Pickup', g.pickup], ['Return', g.dropoff],
            ] : []}
            notes={g?.notes}
            footer={g && editable && <>
              <Confirm onConfirm={() => { edit((p) => (p.gear = p.gear.filter((x) => x.id !== g.id))); setCardId('') }} label="Delete" className="ab-del">Delete</Confirm>
              <span className="grow" />
              <Button variant="primary" onClick={() => { setCardId(''); setDraft({ ...g }) }}>Edit</Button>
            </>} />
          <InfoCard open={!!vcardId && !!v} onClose={() => setVcardId('')} square name={v?.name}
            tags={v && <span className="ab-chip"><i />Vendor · {gear.filter((x) => x.vendor === v.name).length} items</span>}
            quick={v && <QuickLinks phone={v.phone} email={v.email} />}
            rows={v ? [['Contact', v.contact], ['Phone', v.phone && <a href={`tel:${v.phone}`}>{v.phone}</a>], ['Email', v.email && <a href={`mailto:${v.email}`}>{v.email}</a>], ['Address', v.address]] : []}
            notes={v?.notes}
            footer={v && editable && <>
              <Confirm onConfirm={() => { edit((p) => (p.vendors = p.vendors.filter((x) => x.id !== v.id))); setVcardId('') }} label="Delete" className="ab-del">Delete</Confirm>
              <span className="grow" />
              <Button variant="primary" onClick={() => { setVcardId(''); setVdraft({ ...v }) }}>Edit</Button>
            </>} />
        </>
      })()}
      {modals}
    </div>
  )
}
