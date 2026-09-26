import { useState } from 'react'
import { Button, Field, Input, Modal, Select, useToast } from './ui.jsx'
import { today, uid, useStore } from '../lib/store.jsx'
import { DOCS, METHODS, emptyTx, money } from '../lib/finance.js'
import { lineBalance, lineEstimate, linePaid, syncLineWorklog } from '../lib/budget.js'
import { finCatFor } from '../lib/budgetCats.js'


/* Records a payment against a project budget line: creates the Finance expense and updates the line. */
export function recordPayment(s, { projectId, lineId, amount, date, method, doc, docNumber, note, vatPct }) {
  const p = s.projects.find((x) => x.id === projectId)
  const line = p?.budget?.lines?.find((l) => l.id === lineId)
  if (!p || !line) return null
  const tx = emptyTx('expense', {
    date, projectId, category: finCatFor(s.settings, line.category), description: `${line.description}${note ? ` · ${note}` : ''}`, party: line.vendor || '',
    net: Number(amount), vatPct: Number(vatPct) || 0, status: 'paid', paidOn: date, doc, docNumber, method, budgetLineId: line.id, syncBudget: false,
  })
  s.finance.transactions.push(tx)
  line.payments = [...(line.payments || []), { txId: tx.id, date, amount: Number(amount), method }]
  line.actual = linePaid(line)
  syncLineWorklog(s, p, line) // a team member's My work turns to paid when the line is settled
  return tx
}

export default function PaymentModal({ project, line, onClose }) {
  const { state, update } = useStore()
  const toast = useToast()
  const cur = project.budget?.currency || 'EUR'
  const balance = lineBalance(line)
  const [f, setF] = useState({ amount: balance || lineEstimate(line), date: today(), method: 'Bank', doc: 'invoice', docNumber: '', note: balance && balance < lineEstimate(line) ? 'balance' : '', vatPct: state.finance.settings.vatDefault ?? 24 })
  const save = () => {
    if (!Number(f.amount)) return toast('Enter the amount.', 'error')
    update((s) => { recordPayment(s, { projectId: project.id, lineId: line.id, ...f }); return s })
    toast(`${money(f.amount, cur)} recorded for ${line.description}`, 'ok')
    onClose()
  }
  const isAdvance = Number(f.amount) < balance
  return (
    <Modal open title={`Payment · ${line.description}`} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Record payment</Button></>}>
      <div className="stack">
        <p className="small muted">Agreed {money(lineEstimate(line), cur)} · paid so far {money(linePaid(line), cur)} · balance <strong>{money(balance, cur)}</strong>{line.vendor ? ` · ${line.vendor}` : ''}</p>
        <div className="row-3">
          <Field label={`Amount (${cur}, net)`}><Input autoFocus type="number" min="0" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="VAT %"><Input type="number" min="0" max="30" value={f.vatPct} onChange={(e) => setF({ ...f, vatPct: e.target.value })} /></Field>
        </div>
        <div className="row-3">
          <Field label="Method"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} options={METHODS} /></Field>
          <Field label="Document"><Select value={f.doc} onChange={(e) => setF({ ...f, doc: e.target.value, vatPct: e.target.value === 'none' ? 0 : f.vatPct })} options={DOCS} /></Field>
          <Field label="Document number"><Input value={f.docNumber} onChange={(e) => setF({ ...f, docNumber: e.target.value })} /></Field>
        </div>
        <Field label="Note"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="advance, 2nd instalment, balance" /></Field>
        {isAdvance && <p className="notice">Partial payment: {money(balance - Number(f.amount), cur)} will remain as balance on this line.</p>}
      </div>
    </Modal>
  )
}
