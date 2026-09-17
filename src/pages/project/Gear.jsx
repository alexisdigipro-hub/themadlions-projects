import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'
import { download } from '../../lib/dates.js'

const GEAR_CATS = ['Camera', 'Lenses', 'Lighting', 'Grip', 'Sound', 'Monitoring & video village', 'Power & distro', 'Art & set', 'Wardrobe & makeup', 'Vehicles', 'Drone & special rigs', 'Expendables', 'Other']
const GEAR_STATUS = [['needed', 'Needed'], ['quoted', 'Quoted'], ['booked', 'Booked'], ['out', 'Picked up'], ['returned', 'Returned']]
const emptyItem = () => ({ id: uid(), category: 'Camera', item: '', qty: 1, vendor: '', rate: '', days: '', pickup: '', dropoff: '', status: 'needed', notes: '' })
const emptyVendor = () => ({ id: uid(), name: '', contact: '', phone: '', email: '', address: '', notes: '' })

export default function Gear() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const editable = canEdit('gear')
  const gear = project.gear || []
  const vendors = project.vendors || []
  const [draft, setDraft] = useState(null)
  const [vdraft, setVdraft] = useState(null)
  const [cat, setCat] = useState('')
  const cur = project.budget?.currency || 'EUR'
  const money = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Number(n) || 0)

  const groups = useMemo(() => GEAR_CATS.map((c) => [c, gear.filter((g) => g.category === c && (!cat || cat === c))]).filter(([, l]) => l.length), [gear, cat])
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

  return (
    <div className="gear">
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>{gear.length} items · {money(total)}</strong>
          <span className="muted">{byStatus('needed')} needed · {byStatus('quoted')} quoted · {byStatus('booked')} booked · {byStatus('out')} out</span>
        </div>
        <div className="toolbar-actions">
          <Select value={cat} onChange={(e) => setCat(e.target.value)} options={[['', 'All categories'], ...GEAR_CATS.map((c) => [c, c])]} />
          {gear.length > 0 && <Button variant="ghost" onClick={exportCSV}>Export CSV</Button>}
          {editable && gear.length > 0 && <Button variant="ghost" onClick={toBudget}>Sync to budget</Button>}
          {editable && <Button variant="ghost" onClick={() => setVdraft(emptyVendor())}>Add vendor</Button>}
          {editable && <Button variant="primary" onClick={() => setDraft(emptyItem())}>Add item</Button>}
        </div>
      </div>

      <div className="cols gear-layout">
        <div>
          {!gear.length ? (
            <Empty title="No equipment yet">List the camera package, lenses, lights, grip, sound and specials. Each item carries vendor, rate, pickup and return dates. Booked items sync into the <Link to="../budget">budget</Link>.</Empty>
          ) : (
            groups.map(([c, items]) => (
              <section key={c} className="gear-group">
                <h3>{c} <span className="muted">{items.length}</span></h3>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Item</th><th className="num">Qty</th><th>Vendor</th><th className="num">Rate</th><th className="num">Days</th><th className="num">Cost</th><th>Pickup / return</th><th>Status</th>{editable && <th />}</tr>
                    </thead>
                    <tbody>
                      {items.map((g) => (
                        <tr key={g.id} className={g.status === 'returned' ? 'dim' : ''}>
                          <td><strong>{g.item}</strong>{g.notes && <div className="muted small">{g.notes}</div>}</td>
                          <td className="num">{g.qty}</td>
                          <td>{g.vendor}</td>
                          <td className="num">{g.rate ? money(g.rate) : ''}</td>
                          <td className="num">{g.days}</td>
                          <td className="num">{g.rate ? money(cost(g)) : ''}</td>
                          <td className="small">{[g.pickup, g.dropoff].filter(Boolean).join(' → ')}</td>
                          <td>
                            {editable ? (
                              <select className="input select tiny" value={g.status} onChange={(e) => setStatus(g.id, e.target.value)}>
                                {GEAR_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                            ) : GEAR_STATUS.find(([v]) => v === g.status)?.[1]}
                          </td>
                          {editable && (
                            <td className="row-actions">
                              <button onClick={() => setDraft({ ...g })}>Edit</button>
                              <Confirm onConfirm={() => edit((p) => (p.gear = p.gear.filter((x) => x.id !== g.id)))} label="Delete">×</Confirm>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </div>

        <section className="panel">
          <div className="panel-head"><h2>Vendors</h2></div>
          {!vendors.length ? (
            <p className="muted small">Rental houses, studios, transport, catering. Added automatically when you type a vendor on an item.</p>
          ) : (
            <ul className="vendor-list">
              {vendors.map((v) => (
                <li key={v.id}>
                  <div>
                    <strong>{v.name}</strong>
                    <div className="muted small">{[v.contact, v.phone, v.email].filter(Boolean).join(' · ')}</div>
                    {v.notes && <div className="muted small">{v.notes}</div>}
                    <div className="muted small">{gear.filter((g) => g.vendor === v.name).length} items</div>
                  </div>
                  {editable && (
                    <div className="row-actions">
                      <button onClick={() => setVdraft({ ...v })}>Edit</button>
                      <Confirm onConfirm={() => edit((p) => (p.vendors = p.vendors.filter((x) => x.id !== v.id)))} label="Delete">×</Confirm>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {draft && (
        <Modal open title={gear.some((g) => g.id === draft.id) ? 'Edit item' : 'New item'} onClose={() => setDraft(null)}
          footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save item</Button></>}>
          <div className="row-2">
            <Field label="Category"><Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} options={GEAR_CATS} /></Field>
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
    </div>
  )
}
