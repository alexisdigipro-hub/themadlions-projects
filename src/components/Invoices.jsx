import { useMemo, useRef, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from './ui.jsx'
import { useCurrentUser, useStore } from '../lib/store.jsx'
import { INVOICE_STATUS, amountInWords, defaultInvoiceProfile, emptyClient, emptyInvoice, emptyService, invoiceNumberText, invoiceTotals, money, moneyBgn } from '../lib/invoice.js'
import { downloadInvoicePdf, invoiceFilename, previewInvoicePdf } from '../lib/invoicePdf.js'
import { invoiceUrl, publishShare, tokenOf } from '../lib/shares.js'
import { addDays, fmtDate } from '../lib/dates.js'

const profileOf = (state) => ({ ...defaultInvoiceProfile(), ...(state.finance.settings.invoiceProfile || {}) })
const clientsOf = (state) => state.finance.settings.invoiceClients || []
const servicesOf = (state) => state.finance.settings.invoiceServices || []

/* Finance > Invoices: the list, the New button, the editor, and three small managers reachable
   from the toolbar — the company profile + stamp, the saved clients, and the saved services. */
export function InvoicesTab() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const profile = profileOf(state)
  const clients = clientsOf(state)
  const services = servicesOf(state)
  const invoices = useMemo(() => [...(state.finance.invoices || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.number || '').localeCompare(a.number || '')), [state.finance.invoices])
  // A reminder once an unpaid invoice's payment date is within a week, or already past — same
  // spirit as the recurring-items-due banner, so Alex sees it without opening each invoice.
  const today = new Date().toISOString().slice(0, 10)
  const dueSoon = useMemo(() => invoices
    .filter((inv) => inv.dueDate && inv.status !== 'paid' && inv.dueDate <= addDays(today, 7))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [invoices, today])
  const [draft, setDraft] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [panel, setPanel] = useState('') // '' | 'profile' | 'clients' | 'services'
  const [sharePanel, setSharePanel] = useState(null) // null or { inv, url }
  const [shareBusy, setShareBusy] = useState(false)
  const pName = (id) => state.projects.find((p) => p.id === id)?.title || ''

  const logo = state.settings.logo || ''
  const startNew = () => { const inv = emptyInvoice(profile); inv.company.logo = logo; setDraft(inv); setIsNew(true) }
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
  // The stamp is applied to every invoice: an invoice made before a stamp was uploaded still gets
  // the current one when it prints, so Alex can upload once and it shows on all of them.
  const withCompany = (inv) => ({ ...inv, company: { ...inv.company, stamp: inv.company?.stamp || profile.stamp, logo: inv.company?.logo || logo, headerImage: inv.company?.headerImage || profile.headerImage } })
  const download = async (inv) => {
    const withStamp = withCompany(inv)
    try { await downloadInvoicePdf(withStamp, invoiceFilename(withStamp)) } catch (e) { toast(e.message || 'Could not make the PDF.', 'error') }
  }
  const preview = async (inv) => {
    try { await previewInvoicePdf(withCompany(inv)) } catch (e) { toast(e.message || 'Could not preview the PDF.', 'error') }
  }
  // A public link with a live preview and a Download PDF button, the same one every time this
  // invoice is shared again (publishShare reuses the token for the same ref).
  const shareInvoice = async (inv) => {
    setShareBusy(true)
    try {
      const url = await publishShare({ workspaceId: state.workspace.id, kind: 'invoice', ref: `invoice:${inv.id}`, data: withCompany(inv), userId: user?.id })
      const link = invoiceUrl(tokenOf(url))
      await navigator.clipboard.writeText(link).catch(() => {})
      setSharePanel({ inv, url: link })
      toast('Link ready, copied to clipboard', 'ok')
    } catch (e) {
      toast(e.message || 'Could not create the link.', 'error')
    } finally {
      setShareBusy(false)
    }
  }

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>{invoices.length} invoice{invoices.length === 1 ? '' : 's'}</strong>
          <span className="muted">next #{invoiceNumberText(profile)}{!profile.stamp ? ' · no stamp yet' : ''}</span>
        </div>
        <div className="toolbar-actions">
          <Button variant="ghost" onClick={() => setPanel('clients')}>Clients</Button>
          <Button variant="ghost" onClick={() => setPanel('services')}>Services</Button>
          <Button variant="ghost" onClick={() => setPanel('profile')}>Company &amp; stamp</Button>
          <Button variant="primary" onClick={startNew}>New invoice</Button>
        </div>
      </div>

      {!profile.stamp && (
        <p className="notice">No stamp &amp; signature uploaded yet. Add it once in <button className="link" onClick={() => setPanel('profile')}>Company &amp; stamp</button> and it prints on every invoice.</p>
      )}

      {!!dueSoon.length && (
        <p className="notice">
          {dueSoon.length} invoice{dueSoon.length === 1 ? '' : 's'} with payment coming up or overdue:{' '}
          {dueSoon.map((inv, i) => (
            <span key={inv.id}>
              {i > 0 && ', '}
              <button className="link" onClick={() => edit(inv)}>#{inv.number} {inv.recipient?.name}</button>{' '}
              {inv.dueDate < today ? <span className="over">overdue since {fmtDate(inv.dueDate)}</span> : <span>due {fmtDate(inv.dueDate)}</span>}
            </span>
          ))}
        </p>
      )}

      {!invoices.length ? (
        <Empty title="No invoices yet">Set your company details and upload the stamp once in <b>Company &amp; stamp</b>, add your <b>Clients</b> and <b>Services</b> so they drop in ready, then build an invoice. It downloads as a PDF with your stamp and signature.</Empty>
      ) : (
        <table className="table">
          <thead><tr><th>Number</th><th>Date</th><th>Due</th><th>Recipient</th><th>Project</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
          <tbody>
            {invoices.map((inv) => {
              const t = invoiceTotals(inv)
              return (
                <tr key={inv.id}>
                  <td><strong>{inv.number}</strong></td>
                  <td className="small">{inv.date}</td>
                  <td className={`small ${inv.dueDate && inv.status !== 'paid' && inv.dueDate < today ? 'over' : ''}`}>{inv.dueDate ? fmtDate(inv.dueDate) : <span className="muted">—</span>}</td>
                  <td>{inv.recipient?.name}</td>
                  <td className="small">{pName(inv.projectId) || <span className="muted">—</span>}</td>
                  <td className="num">{money(t.total, inv.currency)}</td>
                  <td><span className={`inv-badge s-${inv.status}`}>{INVOICE_STATUS.find(([v]) => v === inv.status)?.[1] || 'Draft'}</span></td>
                  <td className="row-actions">
                    <button onClick={() => edit(inv)}>Edit</button>
                    <button onClick={() => preview(inv)}>Preview</button>
                    <button onClick={() => download(inv)}>PDF</button>
                    <button onClick={() => shareInvoice(inv)} disabled={shareBusy}>Share link</button>
                    <button onClick={() => duplicate(inv)}>Duplicate</button>
                    <Confirm onConfirm={() => remove(inv.id)} label="Delete">×</Confirm>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <InvoiceEditor draft={draft} isNew={isNew} projects={state.projects} clients={clients} services={services} onChange={setDraft} onClose={() => setDraft(null)} onSave={save} onDownload={download} />

      <Modal open={panel === 'profile'} title="Company & stamp" wide onClose={() => setPanel('')}>
        <InvoiceProfileForm onDone={() => setPanel('')} />
      </Modal>
      <Modal open={panel === 'clients'} title="Clients" wide onClose={() => setPanel('')}>
        <ClientsManager />
      </Modal>
      <Modal open={panel === 'services'} title="Services" wide onClose={() => setPanel('')}>
        <ServicesManager />
      </Modal>
      <Modal open={!!sharePanel} title={`Share Invoice #${sharePanel?.inv?.number || ''}`} onClose={() => setSharePanel(null)}>
        <p className="muted small">Send this link to the client. It opens a page with a preview of the invoice and a Download PDF button, no login needed. Sharing again gives the same link, refreshed with the invoice's current details.</p>
        <Field label="Link"><Input value={sharePanel?.url || ''} readOnly onFocus={(e) => e.target.select()} /></Field>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={() => setSharePanel(null)}>Close</Button>
          <Button variant="primary" onClick={() => navigator.clipboard.writeText(sharePanel.url).then(() => toast('Link copied', 'ok')).catch(() => toast('Could not copy.', 'error'))}>Copy link</Button>
        </div>
      </Modal>
    </>
  )
}

function InvoiceEditor({ draft, isNew, projects, clients, services, onChange, onClose, onSave, onDownload }) {
  if (!draft) return null
  const t = invoiceTotals(draft)
  const set = (k, v) => onChange({ ...draft, [k]: v })
  const setR = (k, v) => onChange({ ...draft, recipient: { ...draft.recipient, [k]: v } })
  const setLine = (i, k, v) => onChange({ ...draft, lines: draft.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) })
  const addLine = () => onChange({ ...draft, lines: [...draft.lines, { description: '', project: '', date: '', unitPrice: '' }] })
  const rmLine = (i) => onChange({ ...draft, lines: draft.lines.filter((_, j) => j !== i) })
  const pickProject = (id) => {
    const p = projects.find((x) => x.id === id)
    onChange({ ...draft, projectId: id, recipient: { ...draft.recipient, name: draft.recipient.name || p?.client || '' } })
  }
  const pickClient = (id) => {
    const c = clients.find((x) => x.id === id)
    if (!c) return
    onChange({ ...draft, clientId: id, recipient: { name: c.name, address: c.address, vatNo: c.vatNo } })
  }
  const addService = (id) => {
    const s = services.find((x) => x.id === id)
    if (!s) return
    const line = { description: s.description || s.name, project: '', date: '', unitPrice: s.unitPrice }
    // if the only line is still empty, replace it; otherwise append
    const empty = draft.lines.length === 1 && !(draft.lines[0].description || '').trim() && !Number(draft.lines[0].unitPrice)
    onChange({ ...draft, lines: empty ? [line] : [...draft.lines, line] })
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
        <Field label="Payment due (optional)" hint="When the client is expected to pay. Shows a reminder on the Invoices list as the date gets close, until it is marked Paid.">
          <Input type="date" value={draft.dueDate || ''} onChange={(e) => set('dueDate', e.target.value)} />
        </Field>

        <div className="row-2">
          <Field label="Pick a saved client" hint="Fills the recipient below. Manage the list from the Clients button.">
            <Select value={draft.clientId || ''} onChange={(e) => pickClient(e.target.value)}>
              <option value="">{clients.length ? 'Choose a client…' : 'No saved clients yet'}</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Link to project (optional)">
            <Select value={draft.projectId || ''} onChange={(e) => pickProject(e.target.value)}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Recipient (bill to)">
          <Input value={draft.recipient?.name || ''} onChange={(e) => setR('name', e.target.value)} placeholder="Client company name" />
        </Field>
        <div className="row-2">
          <Field label="Recipient address"><Textarea rows={2} value={draft.recipient?.address || ''} onChange={(e) => setR('address', e.target.value)} placeholder="Street, city, postcode, country" /></Field>
          <Field label="Recipient VAT No"><Input value={draft.recipient?.vatNo || ''} onChange={(e) => setR('vatNo', e.target.value)} placeholder="EL…" /></Field>
        </div>

        <div className="field">
          <span className="field-label">Services</span>
          <div className="inv-edit">
            <div className="inv-edit-head"><span>Description</span><span>Project</span><span>Date</span><span>Amount</span><span /></div>
            {draft.lines.map((l, i) => (
              <div key={i} className="inv-edit-row">
                <Input value={l.description || ''} onChange={(e) => setLine(i, 'description', e.target.value)} placeholder="VIDEO EDIT & COLOR CORRECTION" />
                <Input value={l.project || ''} onChange={(e) => setLine(i, 'project', e.target.value)} placeholder="Project / song" list="inv-project-list" />
                <Input type="date" value={l.date || ''} onChange={(e) => setLine(i, 'date', e.target.value)} title="Shoot day (optional)" />
                <Input type="number" min="0" step="0.01" value={l.unitPrice ?? ''} onChange={(e) => setLine(i, 'unitPrice', e.target.value)} placeholder="0" />
                <button className="link small" onClick={() => rmLine(i)} disabled={draft.lines.length === 1}>Remove</button>
              </div>
            ))}
            <datalist id="inv-project-list">{projects.map((p) => <option key={p.id} value={p.title} />)}</datalist>
            <div className="inv-edit-foot">
              <Button variant="ghost" onClick={addLine}>Add a line</Button>
              {!!services.length && (
                <Select className="compact" value="" onChange={(e) => { addService(e.target.value); e.target.value = '' }}>
                  <option value="">Add a saved service…</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}{s.unitPrice ? ` · ${money(s.unitPrice, cur)}` : ''}</option>)}
                </Select>
              )}
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

        <p className="fineprint">Your company details, bank and stamp come from Company &amp; stamp. A copy is frozen onto this invoice when you save, so changing them later does not alter invoices already made.</p>
      </div>
    </Modal>
  )
}

/* The company profile + stamp. Shown both as a Finance > Settings section and inside a modal from
   the Invoices toolbar, so the stamp upload is easy to find. */
export function InvoiceProfileForm({ onDone }) {
  const { state, update } = useStore()
  const toast = useToast()
  const [p, setP] = useState(() => profileOf(state))
  const stampRef = useRef()
  const headerRef = useRef()
  const set = (k, v) => setP((o) => ({ ...o, [k]: v }))
  const saveProfile = () => {
    update((s) => { s.finance.settings = { ...s.finance.settings, invoiceProfile: { ...p, nextNumber: Number(p.nextNumber) || 0, exchangeRate: Number(p.exchangeRate) || 0 } }; return s })
    toast('Invoice profile saved', 'ok')
    onDone && onDone()
  }
  const pickStamp = async (file) => {
    if (!file) return
    try {
      const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
      const max = 600, k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      set('stamp', c.toDataURL('image/png'))
      toast('Stamp loaded. Press Save to keep it.', 'ok')
    } catch { toast('Could not read that image.', 'error') }
    finally { if (stampRef.current) stampRef.current.value = '' }
  }
  const pickHeader = async (file) => {
    if (!file) return
    try {
      const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
      const max = 1400, k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      set('headerImage', c.toDataURL('image/png'))
      toast('Header loaded. Press Save to keep it.', 'ok')
    } catch { toast('Could not read that image.', 'error') }
    finally { if (headerRef.current) headerRef.current.value = '' }
  }
  return (
    <div className="stack">
      <p className="muted small">Your company's own side of every invoice, filled in once. A copy is frozen onto each invoice when you save it.</p>
      <Field label="Header / letterhead (PNG)" hint="Your logo with the company details, as one image. When set it prints centred at the top of every invoice instead of the plain text header.">
        <div className="logo-row">
          {p.headerImage ? <img className="logo-preview" style={{ width: 'auto', maxWidth: 220, height: 'auto' }} src={p.headerImage} alt="" /> : <span className="muted small">No header yet</span>}
          <input ref={headerRef} type="file" accept="image/*" hidden onChange={(e) => pickHeader(e.target.files?.[0])} />
          <Button variant="ghost" onClick={() => headerRef.current?.click()}>{p.headerImage ? 'Change' : 'Upload header'}</Button>
          {p.headerImage && <button className="link small" onClick={() => set('headerImage', '')}>Remove</button>}
        </div>
      </Field>
      <Field label="Stamp & signature (PNG)" hint="A transparent PNG with your stamp and signature together. It prints in the Provider signature box of every invoice.">
        <div className="logo-row">
          {p.stamp ? <img className="logo-preview" src={p.stamp} alt="" /> : <span className="muted small">No stamp yet</span>}
          <input ref={stampRef} type="file" accept="image/*" hidden onChange={(e) => pickStamp(e.target.files?.[0])} />
          <Button variant="ghost" onClick={() => stampRef.current?.click()}>{p.stamp ? 'Change' : 'Upload stamp'}</Button>
          {p.stamp && <button className="link small" onClick={() => set('stamp', '')}>Remove</button>}
        </div>
      </Field>
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
      <div className="row-actions"><Button variant="primary" onClick={saveProfile}>Save</Button></div>
    </div>
  )
}

export function InvoiceProfileSettings() {
  return (
    <section className="panel fin-settings">
      <h2>Invoice profile</h2>
      <InvoiceProfileForm />
    </section>
  )
}

/* Saved clients — a card per client, picked into an invoice from the editor. */
function ClientsManager() {
  const { state, update } = useStore()
  const toast = useToast()
  const clients = clientsOf(state)
  const [d, setD] = useState(null)
  const set = (k, v) => setD((o) => ({ ...o, [k]: v }))
  const save = () => {
    if (!d.name.trim()) return toast('Give the client a name.', 'error')
    update((s) => {
      const list = s.finance.settings.invoiceClients ? [...s.finance.settings.invoiceClients] : []
      const i = list.findIndex((x) => x.id === d.id)
      if (i >= 0) list[i] = d; else list.push(d)
      s.finance.settings = { ...s.finance.settings, invoiceClients: list }
      return s
    })
    toast('Client saved', 'ok'); setD(null)
  }
  const remove = (id) => update((s) => { s.finance.settings = { ...s.finance.settings, invoiceClients: (s.finance.settings.invoiceClients || []).filter((x) => x.id !== id) }; return s })
  return (
    <div className="stack">
      {!clients.length && !d && <p className="muted small">No clients yet. Add one and it drops into any invoice from the editor.</p>}
      {!d && (
        <>
          {clients.map((c) => (
            <div key={c.id} className="inv-card">
              <div><strong>{c.name}</strong><div className="muted small">{[c.vatNo && `VAT ${c.vatNo}`, c.email, c.phone].filter(Boolean).join(' · ')}</div>{c.address && <div className="muted small">{c.address}</div>}</div>
              <div className="row-actions"><button onClick={() => setD({ ...c })}>Edit</button><Confirm onConfirm={() => remove(c.id)} label="Delete">×</Confirm></div>
            </div>
          ))}
          <div className="row-actions"><Button variant="primary" onClick={() => setD(emptyClient())}>Add a client</Button></div>
        </>
      )}
      {d && (
        <>
          <Field label="Client name"><Input value={d.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Field>
          <Field label="Address"><Textarea rows={2} value={d.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <div className="row-3">
            <Field label="VAT No"><Input value={d.vatNo} onChange={(e) => set('vatNo', e.target.value)} /></Field>
            <Field label="Email"><Input value={d.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Phone"><Input value={d.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          <div className="row-actions"><Button variant="ghost" onClick={() => setD(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save client</Button></div>
        </>
      )}
    </div>
  )
}

/* Saved services — a name, a default description and unit price that drop in as an invoice line. */
function ServicesManager() {
  const { state, update } = useStore()
  const toast = useToast()
  const services = servicesOf(state)
  const [d, setD] = useState(null)
  const set = (k, v) => setD((o) => ({ ...o, [k]: v }))
  const save = () => {
    if (!d.name.trim()) return toast('Give the service a name.', 'error')
    update((s) => {
      const list = s.finance.settings.invoiceServices ? [...s.finance.settings.invoiceServices] : []
      const i = list.findIndex((x) => x.id === d.id)
      if (i >= 0) list[i] = d; else list.push(d)
      s.finance.settings = { ...s.finance.settings, invoiceServices: list }
      return s
    })
    toast('Service saved', 'ok'); setD(null)
  }
  const remove = (id) => update((s) => { s.finance.settings = { ...s.finance.settings, invoiceServices: (s.finance.settings.invoiceServices || []).filter((x) => x.id !== id) }; return s })
  return (
    <div className="stack">
      {!services.length && !d && <p className="muted small">No services yet. Save the ones you invoice often and pick them in the editor.</p>}
      {!d && (
        <>
          {services.map((sv) => (
            <div key={sv.id} className="inv-card">
              <div><strong>{sv.name}</strong>{sv.unitPrice ? <span className="muted"> · {money(sv.unitPrice)}</span> : null}{sv.description && <div className="muted small">{sv.description}</div>}</div>
              <div className="row-actions"><button onClick={() => setD({ ...sv })}>Edit</button><Confirm onConfirm={() => remove(sv.id)} label="Delete">×</Confirm></div>
            </div>
          ))}
          <div className="row-actions"><Button variant="primary" onClick={() => setD(emptyService())}>Add a service</Button></div>
        </>
      )}
      {d && (
        <>
          <Field label="Service name" hint="Short label for the picker."><Input value={d.name} onChange={(e) => set('name', e.target.value)} autoFocus placeholder="Video edit & color" /></Field>
          <Field label="Description on the invoice"><Textarea rows={2} value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="VIDEO EDIT & COLOR CORRECTION – …" /></Field>
          <div className="row-2">
            <Field label="Default unit price"><Input type="number" min="0" step="0.01" value={d.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} /></Field>
            <Field label="Default quantity"><Input type="number" min="0" step="1" value={d.qty} onChange={(e) => set('qty', e.target.value)} /></Field>
          </div>
          <div className="row-actions"><Button variant="ghost" onClick={() => setD(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save service</Button></div>
        </>
      )}
    </div>
  )
}
