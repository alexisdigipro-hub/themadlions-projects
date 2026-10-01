import { useMemo, useRef, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from './ui.jsx'
import { useStore } from '../lib/store.jsx'
import { INVOICE_STATUS, amountInWords, defaultInvoiceProfile, emptyInvoice, invoiceNumberText, invoiceTotals, lineNet, money, moneyBgn } from '../lib/invoice.js'
import { downloadInvoicePdf } from '../lib/invoicePdf.js'

const profileOf = (state) => ({ ...defaultInvoiceProfile(), ...(state.finance.settings.invoiceProfile || {}) })

/* Finance > Invoices: the list, the New button and the editor. Invoices live in finance.invoices;
   each one freezes a copy of the company profile when saved, so an old invoice never changes if the
   profile does. */
export function InvoicesTab() {
  const { state, update } = useStore()
  const toast = useToast()
  const profile = profileOf(state)
  const invoices = useMemo(() => [...(state.finance.invoices || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.number || '').localeCompare(a.number || '')), [state.finance.invoices])
  const [draft, setDraft] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const pName = (id) => state.projects.find((p) => p.id === id)?.title || ''

  const startNew = () => { setDraft(emptyInvoice(profile)); setIsNew(true) }
  const edit = (inv) => { setDraft(JSON.parse(JSON.stringify(inv))); setIsNew(false) }
  const duplicate = (inv) => {
    const copy = { ...JSON.parse(JSON.stringify(inv)), id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), number: invoiceNumberText(profile), date: new Date().toISOString().slice(0, 10), status: 'draft' }
    setDraft(copy); setIsNew(true)
  }

  const save = (inv) => {
    if (!inv.recipient?.name?.trim()) return toast('Add the recipient name.', 'error')
    if (!inv.lines.some((l) => (l.description || '').trim())) return toast('Add at least one line.', 'error')
    update((s) => {
      const list = s.finance.invoices || (s.finance.invoices = [])
      const i = list.findIndex((x) => x.id === inv.id)
      if (i >= 0) list[i] = inv
      else list.push(inv)
      // a new invoice that used the running number advances it, so the next one is unique
      if (isNew && inv.number === invoiceNumberText(s.finance.settings.invoiceProfile || profile)) {
        const p = { ...defaultInvoiceProfile(), ...(s.finance.settings.invoiceProfile || {}) }
        s.finance.settings = { ...s.finance.settings, invoiceProfile: { ...p, nextNumber: (Number(p.nextNumber) || 0) + 1 } }
      }
      return s
    })
    toast(isNew ? 'Invoice created' : 'Invoice saved', 'ok')
    setDraft(null)
  }
  const remove = (id) => update((s) => { s.finance.invoices = (s.finance.invoices || []).filter((x) => x.id !== id); return s })
  const download = async (inv) => {
    try { await downloadInvoicePdf(inv, `invoice-${inv.number || ''}.pdf`) } catch (e) { toast(e.message || 'Could not make the PDF.', 'error') }
  }

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>{invoices.length} invoice{invoices.length === 1 ? '' : 's'}</strong>
          <span className="muted">next #{invoiceNumberText(profile)}</span>
        </div>
        <div className="toolbar-actions">
          <Button variant="primary" onClick={startNew}>New invoice</Button>
        </div>
      </div>

      {!invoices.length ? (
        <Empty title="No invoices yet">Build an invoice with your company details, the client, the services and amounts. It saves here and downloads as a PDF with your stamp and signature. Set your company details and upload the stamp once in Settings below.</Empty>
      ) : (
        <table className="table">
          <thead><tr><th>Number</th><th>Date</th><th>Recipient</th><th>Project</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
          <tbody>
            {invoices.map((inv) => {
              const t = invoiceTotals(inv)
              return (
                <tr key={inv.id}>
                  <td><strong>{inv.number}</strong></td>
                  <td className="small">{inv.date}</td>
                  <td>{inv.recipient?.name}</td>
                  <td className="small">{pName(inv.projectId) || <span className="muted">—</span>}</td>
                  <td className="num">{money(t.total, inv.currency)}</td>
                  <td><span className={`inv-badge s-${inv.status}`}>{INVOICE_STATUS.find(([v]) => v === inv.status)?.[1] || 'Draft'}</span></td>
                  <td className="row-actions">
                    <button onClick={() => edit(inv)}>Edit</button>
                    <button onClick={() => download(inv)}>PDF</button>
                    <button onClick={() => duplicate(inv)}>Duplicate</button>
                    <Confirm onConfirm={() => remove(inv.id)} label="Delete">×</Confirm>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <InvoiceEditor draft={draft} isNew={isNew} projects={state.projects} onChange={setDraft} onClose={() => setDraft(null)} onSave={save} onDownload={download} />
    </>
  )
}

function InvoiceEditor({ draft, isNew, projects, onChange, onClose, onSave, onDownload }) {
  if (!draft) return null
  const t = invoiceTotals(draft)
  const set = (k, v) => onChange({ ...draft, [k]: v })
  const setR = (k, v) => onChange({ ...draft, recipient: { ...draft.recipient, [k]: v } })
  const setLine = (i, k, v) => onChange({ ...draft, lines: draft.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) })
  const addLine = () => onChange({ ...draft, lines: [...draft.lines, { qty: 1, description: '', unitPrice: '' }] })
  const rmLine = (i) => onChange({ ...draft, lines: draft.lines.filter((_, j) => j !== i) })
  const pickProject = (id) => {
    const p = projects.find((x) => x.id === id)
    onChange({ ...draft, projectId: id, recipient: { ...draft.recipient, name: draft.recipient.name || p?.client || '' } })
  }
  const cur = draft.currency || 'EUR'

  return (
    <Modal open={!!draft} title={isNew ? 'New invoice' : `Invoice #${draft.number}`} wide onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="ghost" onClick={() => onDownload(draft)}>Download PDF</Button><Button variant="primary" onClick={() => onSave(draft)}>{isNew ? 'Create invoice' : 'Save'}</Button></>}>
      <div className="stack">
        <div className="row-3">
          <Field label="Invoice number"><Input value={draft.number} onChange={(e) => set('number', e.target.value)} /></Field>
          <Field label="Date"><Input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Status"><Select value={draft.status} onChange={(e) => set('status', e.target.value)} options={INVOICE_STATUS} /></Field>
        </div>

        <Field label="Recipient (bill to)">
          <Input value={draft.recipient?.name || ''} onChange={(e) => setR('name', e.target.value)} placeholder="Client company name" />
        </Field>
        <div className="row-2">
          <Field label="Recipient address"><Textarea rows={2} value={draft.recipient?.address || ''} onChange={(e) => setR('address', e.target.value)} placeholder="Street, city, postcode, country" /></Field>
          <div className="stack">
            <Field label="Recipient VAT No"><Input value={draft.recipient?.vatNo || ''} onChange={(e) => setR('vatNo', e.target.value)} placeholder="EL…" /></Field>
            <Field label="Link to project (optional)">
              <Select value={draft.projectId || ''} onChange={(e) => pickProject(e.target.value)}>
                <option value="">No project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </Field>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Services</span>
          <div className="inv-edit">
            <div className="inv-edit-head"><span>Qty</span><span>Description</span><span>Unit price</span><span>Net</span><span /></div>
            {draft.lines.map((l, i) => (
              <div key={i} className="inv-edit-row">
                <Input type="number" min="0" step="1" value={l.qty ?? ''} onChange={(e) => setLine(i, 'qty', e.target.value)} />
                <Input value={l.description || ''} onChange={(e) => setLine(i, 'description', e.target.value)} placeholder="VIDEO EDIT & COLOR CORRECTION – …" />
                <Input type="number" min="0" step="0.01" value={l.unitPrice ?? ''} onChange={(e) => setLine(i, 'unitPrice', e.target.value)} placeholder="0" />
                <span className="inv-edit-net">{money(lineNet(l), cur)}</span>
                <button className="link small" onClick={() => rmLine(i)} disabled={draft.lines.length === 1}>Remove</button>
              </div>
            ))}
            <div className="inv-edit-foot">
              <Button variant="ghost" onClick={addLine}>Add a line</Button>
              <span className="muted small">In words: {amountInWords(t.total, cur)}</span>
              <b className="inv-edit-total">{money(t.total, cur)}</b>
            </div>
          </div>
        </div>

        <div className="row-3">
          <Field label="Currency"><Select value={cur} onChange={(e) => set('currency', e.target.value)} options={['EUR', 'USD', 'GBP', 'BGN']} /></Field>
          <Field label="VAT %" hint="0 keeps the reason note below."><Input type="number" min="0" max="30" value={draft.vatPct ?? 0} onChange={(e) => set('vatPct', Number(e.target.value) || 0)} /></Field>
          <Field label="Show BGN column"><Select value={draft.showBgn ? 'yes' : 'no'} onChange={(e) => set('showBgn', e.target.value === 'yes')} options={[['yes', 'Yes'], ['no', 'No']]} /></Field>
        </div>
        {draft.showBgn && (
          <div className="row-2">
            <Field label="Exchange rate (BGN per 1 EUR)" hint="The fixed peg is 1.95583."><Input type="number" step="0.00001" value={draft.exchangeRate ?? ''} onChange={(e) => set('exchangeRate', Number(e.target.value) || 0)} /></Field>
            <div className="inv-bgn-preview muted small">Total in BGN: <b>{moneyBgn(t.totalBgn)}</b></div>
          </div>
        )}
        {draft.vatPct === 0 && (
          <Field label="Reason for not charging VAT"><Input value={draft.vatNote || ''} onChange={(e) => set('vatNote', e.target.value)} /></Field>
        )}
        <Field label="Notes (optional)"><Textarea rows={2} value={draft.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>

        <p className="fineprint">Your company details, bank and stamp come from Finance &gt; Settings. A copy is frozen onto this invoice when you save, so changing them later does not alter invoices already made.</p>
      </div>
    </Modal>
  )
}

/* Finance > Settings: the company profile every invoice starts from, plus the stamp/signature PNG. */
export function InvoiceProfileSettings() {
  const { state, update } = useStore()
  const toast = useToast()
  const [p, setP] = useState(() => profileOf(state))
  const stampRef = useRef()
  const set = (k, v) => setP((o) => ({ ...o, [k]: v }))
  const saveProfile = () => {
    update((s) => { s.finance.settings = { ...s.finance.settings, invoiceProfile: { ...p, nextNumber: Number(p.nextNumber) || 0, exchangeRate: Number(p.exchangeRate) || 0 } }; return s })
    toast('Invoice profile saved', 'ok')
  }
  const pickStamp = async (file) => {
    if (!file) return
    try {
      const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
      const max = 600, k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      // PNG keeps transparency so the stamp sits over the signature line cleanly
      set('stamp', c.toDataURL('image/png'))
      toast('Stamp saved. Remember to Save the profile.', 'ok')
    } catch { toast('Could not read that image.', 'error') }
    finally { if (stampRef.current) stampRef.current.value = '' }
  }

  return (
    <section className="panel fin-settings">
      <h2>Invoice profile</h2>
      <p className="muted small">Your company's own side of every invoice, filled in once. A copy is frozen onto each invoice when you save it.</p>
      <div className="row-2">
        <Field label="Company name (header)"><Input value={p.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
        <Field label="Website"><Input value={p.web} onChange={(e) => set('web', e.target.value)} /></Field>
      </div>
      <div className="row-2">
        <Field label="Legal / provider name"><Input value={p.providerName} onChange={(e) => set('providerName', e.target.value)} /></Field>
        <Field label="Provider VAT No"><Input value={p.providerVatNo} onChange={(e) => set('providerVatNo', e.target.value)} /></Field>
      </div>
      <Field label="Provider address"><Textarea rows={2} value={p.providerAddress} onChange={(e) => set('providerAddress', e.target.value)} /></Field>
      <div className="row-3">
        <Field label="Bank name"><Input value={p.bankName} onChange={(e) => set('bankName', e.target.value)} /></Field>
        <Field label="BIC / SWIFT"><Input value={p.bankBic} onChange={(e) => set('bankBic', e.target.value)} /></Field>
        <Field label="IBAN"><Input value={p.bankIban} onChange={(e) => set('bankIban', e.target.value)} /></Field>
      </div>
      <div className="row-3">
        <Field label="Default currency"><Select value={p.currency} onChange={(e) => set('currency', e.target.value)} options={['EUR', 'USD', 'GBP', 'BGN']} /></Field>
        <Field label="Exchange rate (BGN per EUR)"><Input type="number" step="0.00001" value={p.exchangeRate} onChange={(e) => set('exchangeRate', e.target.value)} /></Field>
        <Field label="Show BGN column"><Select value={p.showBgn ? 'yes' : 'no'} onChange={(e) => set('showBgn', e.target.value === 'yes')} options={[['yes', 'Yes'], ['no', 'No']]} /></Field>
      </div>
      <div className="row-3">
        <Field label="Number prefix" hint="Shown before the running number."><Input value={p.numberPrefix} onChange={(e) => set('numberPrefix', e.target.value)} /></Field>
        <Field label="Next number"><Input type="number" value={p.nextNumber} onChange={(e) => set('nextNumber', e.target.value)} /></Field>
        <div />
      </div>
      <Field label="Reason for not charging VAT" hint="Shown on invoices where VAT is 0."><Input value={p.vatNote} onChange={(e) => set('vatNote', e.target.value)} /></Field>
      <Field label="Stamp & signature (PNG)" hint="A transparent PNG with your stamp and signature. It prints in the Provider signature box.">
        <div className="logo-row">
          {p.stamp ? <img className="logo-preview" src={p.stamp} alt="" /> : <span className="muted small">No stamp yet</span>}
          <input ref={stampRef} type="file" accept="image/*" hidden onChange={(e) => pickStamp(e.target.files?.[0])} />
          <Button variant="ghost" onClick={() => stampRef.current?.click()}>{p.stamp ? 'Change' : 'Upload stamp'}</Button>
          {p.stamp && <button className="link small" onClick={() => set('stamp', '')}>Remove</button>}
        </div>
      </Field>
      <div className="row-actions"><Button variant="primary" onClick={saveProfile}>Save invoice profile</Button></div>
    </section>
  )
}
