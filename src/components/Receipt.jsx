import { useEffect, useRef, useState } from 'react'
import { Button, Field, Input, Modal, Select, Textarea, useIsMobile, useToast } from './ui.jsx'
import { can, today, uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { pcloudTarget } from '../lib/pcloud.js'
import { deleteFile, fileUrl, uploadFile } from '../lib/files.js'
import { compress } from '../lib/photos.js'
import { syncLineWorklog } from '../lib/budget.js'
import { recordPayment } from './PaymentModal.jsx'

/*
  Expenses with a receipt: photograph the receipt on set and it becomes a budget line of the
  project, with the picture kept on the line (line.receipt) and in the project's "Receipts"
  folder (pCloud, or the private files bucket). Who paid decides what happens next:
  - the company (card or cash): an administrator's receipt is booked as paid right away, with a
    Finance expense carrying the receipt; anyone else's waits for an administrator to Pay it;
  - a team member out of pocket: line.reimburse + memberId, so it lands in their My Finance as a
    refund of the full amount, and turns to paid when Finance pays it back.
  The amount typed (or read by Claude) is the total paid, VAT included. The line keeps the net
  amount and the VAT % like every other line, so totals, payments and Finance agree.
*/

const round2 = (n) => Math.round(n * 100) / 100
const isPdf = (f) => f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''))
const safeName = (s) => (s || '').replace(/[^\wͰ-Ͽἀ-῿ -]+/g, '').trim().slice(0, 40)

/* Shrinks a photo, uploads it (or the PDF as it is) under the line's id, and returns the record
   kept on the line. The small picture rides in the project so the table and the viewer show
   something at once, before the full picture loads. */
export async function storeReceipt({ state, projectId, lineId, file, who, label }) {
  let up = file
  let thumb = ''
  if (!isPdf(file)) {
    const c = await compress(file, { max: 2000, quality: 0.85, thumb: 160 })
    thumb = c.thumb
    up = new File([c.blob], `Receipt ${safeName(label) || today()}.jpg`, { type: 'image/jpeg' })
  }
  const r = await uploadFile({ projectId, id: lineId, file: up, pcloud: pcloudTarget(state, projectId, 'Receipts') })
  return {
    id: lineId, name: up.name, type: up.type || 'application/octet-stream', size: up.size, path: r.path || '',
    ...(r.fileid ? { fileid: r.fileid, scope: r.scope } : {}),
    thumb, addedAt: new Date().toISOString(), addedBy: who?.id || '', addedByName: who?.name || '',
  }
}

/* The picture (or PDF) of a receipt, full size, with a download link. */
export function ReceiptView({ receipt, onClose }) {
  const [url, setUrl] = useState('')
  const [dl, setDl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    fileUrl(receipt).then((u) => { if (live) { setUrl(u); if (!u) setFailed(true) } }).catch(() => live && setFailed(true))
    fileUrl(receipt, true).then((u) => live && setDl(u)).catch(() => {})
    return () => { live = false }
  }, [receipt])
  const pdf = isPdf(receipt)
  return (
    <Modal open title="Receipt" onClose={onClose} footer={
      <>
        {dl && <a className="btn btn-ghost btn-md" href={dl} target="_blank" rel="noreferrer" download={receipt.name}>Download</a>}
        <Button variant="primary" onClick={onClose}>Close</Button>
      </>
    }>
      <div className="receipt-view">
        {pdf ? (
          url ? <a className="btn btn-default btn-md" href={url} target="_blank" rel="noreferrer">Open the PDF</a> : <p className="muted">{failed ? 'The file could not be opened.' : 'Loading…'}</p>
        ) : (
          <>
            <img src={url || receipt.thumb} alt="Receipt" className={url ? '' : 'loading'} />
            {failed && <p className="muted small">Only the small picture could be loaded.</p>}
          </>
        )}
        {receipt.addedByName && <p className="muted small">Added by {receipt.addedByName}{receipt.addedAt ? ` · ${new Date(receipt.addedAt).toLocaleDateString('en-GB')}` : ''}</p>}
      </div>
    </Modal>
  )
}

/* The two ways in: the camera straight away on a phone, or any photo / PDF already there. */
function Pickers({ onPick, label = 'Take a photo' }) {
  const mobile = useIsMobile()
  const cam = useRef(null)
  const any = useRef(null)
  const pick = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) onPick(f)
  }
  return (
    <div className="receipt-pickers">
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={any} type="file" accept="image/*,application/pdf,.pdf" hidden onChange={pick} />
      {mobile && <Button variant="primary" onClick={() => cam.current?.click()}>📷 {label}</Button>}
      <Button variant={mobile ? 'default' : 'primary'} onClick={() => any.current?.click()}>{mobile ? 'From photos or files' : 'Choose a photo or PDF'}</Button>
    </div>
  )
}

/* A new expense from a receipt. groups: [[group, [categories]]] as the Budget page has them. */
export function ReceiptModal({ project, groups, onClose }) {
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const admin = me?.role === 'admin'
  const team = (state.users || []).filter((u) => u.active !== false)
  const cats = groups.flatMap(([, c]) => c)
  const guessCat = ['Expendables', 'Production expenses', 'Petty cash', 'Miscellaneous'].find((c) => cats.includes(c)) || cats[0] || ''
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [f, setF] = useState({ total: '', vatPct: '24', description: '', category: guessCat, vendor: '', date: today(), payer: 'company', method: 'Card', notes: '' })
  const [reading, setReading] = useState(false)
  const [busy, setBusy] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const read = async (fl) => {
    if (!state.settings?.aiKey) return
    setReading(true)
    try {
      const { aiReadReceipt } = await import('../lib/ai.js')
      const r = await aiReadReceipt({ settings: state.settings, file: fl })
      // only what is still empty, so nothing typed meanwhile is overwritten
      setF((x) => ({
        ...x,
        total: x.total === '' && r.total !== '' ? String(r.total) : x.total,
        vatPct: r.vatPct !== '' && x.vatPct === '24' ? String(r.vatPct) : x.vatPct,
        vendor: x.vendor || r.vendor,
        description: x.description || r.description,
        date: r.date && x.date === today() ? r.date : x.date,
      }))
      toast(r.total !== '' ? 'Receipt read. Check the amount before you save.' : 'Claude could not read the amount. Type it in.', r.total !== '' ? 'ok' : 'error')
    } catch (e) {
      toast(e.message || 'Could not read the receipt.', 'error')
    } finally {
      setReading(false)
    }
  }
  const pick = (fl) => {
    setFile(fl)
    setPreview(isPdf(fl) ? '' : URL.createObjectURL(fl))
    read(fl)
  }

  const total = Number(f.total) || 0
  const vat = Math.max(0, Number(f.vatPct) || 0)
  const net = round2(total / (1 + vat / 100))
  const member = f.payer !== 'company' ? team.find((u) => u.id === f.payer) : null

  const save = async () => {
    if (!file) return toast('Take a photo of the receipt first.', 'error')
    if (!(total > 0)) return toast('Type the total paid.', 'error')
    const id = uid()
    const description = f.description.trim() || f.category || 'Expense'
    try {
      setBusy('Uploading the receipt…')
      const receipt = await storeReceipt({ state, projectId: project.id, lineId: id, file, who: me, label: `${f.date} ${f.vendor || description}` })
      const shop = f.vendor.trim()
      const line = {
        id, category: f.category, description, qty: 1, unit: 'flat', rate: 0,
        estimate: net, vatPct: vat || '', actual: '',
        vendor: member ? member.name : shop, memberId: member ? member.id : '', contactId: '', locationId: '',
        date: f.date, notes: [member && shop ? `Receipt from ${shop}` : '', f.notes.trim()].filter(Boolean).join(' · '),
        receipt, ...(member ? { reimburse: true } : {}),
      }
      update((s) => {
        const p = s.projects.find((x) => x.id === project.id)
        if (!p) return s
        p.budget = p.budget || { lines: [] }
        p.budget.lines.push(line)
        p.updatedAt = new Date().toISOString()
        if (!member && admin) {
          const tx = recordPayment(s, { projectId: p.id, lineId: id, amount: net, date: f.date, method: f.method, doc: 'receipt', docNumber: '', note: '', vatPct: vat })
          if (tx) tx.receipt = receipt
        } else {
          syncLineWorklog(s, p, line)
        }
        return s
      })
      toast(member ? `Expense saved. ${member.id === me?.id ? 'You are' : `${member.name} is`} owed it back in My Finance.` : admin ? 'Expense saved and booked as paid in Finance.' : 'Expense saved. An administrator books the payment.', 'ok')
      onClose()
    } catch (e) {
      setBusy('')
      toast(e.message || 'Could not save the receipt.', 'error')
    }
  }

  return (
    <Modal open wide title="Add a receipt" onClose={busy ? undefined : onClose} footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={!!busy}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={!!busy || reading}>{busy || (total > 0 ? `Save expense · €${total.toFixed(2)}` : 'Save expense')}</Button>
      </>
    }>
      <div className="receipt-form">
        <div className="receipt-shot">
          {file ? (
            <>
              {preview ? <img src={preview} alt="Receipt" /> : <div className="receipt-pdf">📄 {file.name}</div>}
              {reading && <div className="receipt-reading">Claude is reading the receipt…</div>}
              <Pickers onPick={pick} label="Take it again" />
            </>
          ) : (
            <>
              <div className="receipt-empty">🧾<span>Photograph the receipt, or pick a photo or PDF.</span></div>
              <Pickers onPick={pick} />
            </>
          )}
          {!state.settings?.aiKey && <p className="muted small">With an Anthropic key in Settings, Claude reads the amount, the shop and the date for you.</p>}
        </div>
        <div className="receipt-fields">
          <div className="row-2">
            <Field label="Total paid (€)" hint={vat && total ? `${vat}% VAT included: €${net.toFixed(2)} + €${(total - net).toFixed(2)}` : 'VAT included, as on the receipt.'}>
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={f.total} onChange={(e) => set('total', e.target.value)} placeholder="38.40" />
            </Field>
            <Field label="VAT %"><Input type="number" inputMode="decimal" min="0" step="1" value={f.vatPct} onChange={(e) => set('vatPct', e.target.value)} placeholder="24" /></Field>
          </div>
          <Field label="What for"><Input value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Gaffer tape, fuel, catering" /></Field>
          <div className="row-2">
            <Field label="Category">
              <select className="input select" value={f.category} onChange={(e) => set('category', e.target.value)}>
                {groups.map(([g, c]) => <optgroup key={g} label={g}>{c.map((x) => <option key={x} value={x}>{x}</option>)}</optgroup>)}
              </select>
            </Field>
            <Field label="Shop"><Input value={f.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="Optional" /></Field>
          </div>
          <div className="row-2">
            <Field label="Date"><Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="Who paid" hint={member ? `${member.id === me?.id ? 'You get' : `${member.name} gets`} it back: it goes into My Finance as a refund of €${total ? total.toFixed(2) : '0'}.` : admin ? 'Booked as paid now, with the receipt in Finance.' : 'An administrator records the payment in Finance.'}>
              <Select value={f.payer} onChange={(e) => set('payer', e.target.value)}>
                <option value="company">The company</option>
                <optgroup label="Out of their own pocket">
                  {me && <option value={me.id}>Me ({me.name})</option>}
                  {/* a refund owed to someone else goes into their My Finance, which needs Budget edit (assign_worklog) */}
                  {(admin || can(me, 'budget', 'edit')) && team.filter((u) => u.id !== me?.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </optgroup>
              </Select>
            </Field>
          </div>
          {!member && admin && (
            <Field label="Paid with"><Select value={f.method} onChange={(e) => set('method', e.target.value)} options={[['Card', 'Company card'], ['Cash', 'Cash'], ['Bank', 'Bank transfer'], ['Other', 'Other']]} /></Field>
          )}
          <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" /></Field>
        </div>
      </div>
    </Modal>
  )
}

/* On the edit form of a line: the receipt it has (view, replace, remove) or a button to attach one.
   Changes are written at once, not with Save line, because the file itself is already moved. */
export function ReceiptField({ project, line, onChange }) {
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState(false)
  const r = line.receipt
  const write = (receipt) => update((s) => {
    const p = s.projects.find((x) => x.id === project.id)
    const l = p?.budget?.lines?.find((x) => x.id === line.id)
    if (l) {
      if (receipt) l.receipt = receipt
      else delete l.receipt
      p.updatedAt = new Date().toISOString()
    }
    return s
  })
  const attach = async (file) => {
    setBusy(true)
    try {
      const next = await storeReceipt({ state, projectId: project.id, lineId: line.id, file, who: me, label: `${line.date || today()} ${line.vendor || line.description}` })
      // the old file goes while the line still records it, which is what pCloud asks for
      if (r) await deleteFile(r).catch(() => {})
      if (state.projects.find((x) => x.id === project.id)?.budget?.lines?.some((l) => l.id === line.id)) write(next)
      onChange(next)
      toast('Receipt attached', 'ok')
    } catch (e) {
      toast(e.message || 'Could not upload the receipt.', 'error')
    } finally {
      setBusy(false)
    }
  }
  const remove = async () => {
    setBusy(true)
    try {
      await deleteFile(r)
    } catch { /* the line lets go of it anyway */ }
    write(null)
    onChange(null)
    setBusy(false)
  }
  return (
    // a div, not a <label>: a click on the file name must not open the camera
    <div className="field">
      <span className="field-label">Receipt</span>
      <div className="receipt-field">
        {r ? (
          <>
            <button type="button" className="receipt-thumb" onClick={() => setView(true)} title="Open the receipt">
              {r.thumb ? <img src={r.thumb} alt="" /> : <span>📄</span>}
            </button>
            <span className="muted small">{r.name}</span>
            <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>Remove</Button>
          </>
        ) : null}
        {busy ? <span className="muted small">Working…</span> : <Pickers onPick={attach} label={r ? 'Take it again' : 'Take a photo'} />}
      </div>
      {view && r && <ReceiptView receipt={r} onClose={() => setView(false)} />}
    </div>
  )
}
