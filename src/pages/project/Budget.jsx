import { useMemo, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'
import { download } from '../../lib/dates.js'

export const BUDGET_GROUPS = [
  ['Above the line', ['Story & rights', 'Producer', 'Director', 'Cast', 'Casting']],
  ['Production', ['Production staff', 'Extras', 'Camera', 'Lighting', 'Grip', 'Sound', 'Art & set', 'Props', 'Wardrobe', 'Makeup & hair', 'Locations', 'Studio', 'Transport', 'Catering', 'Equipment rental', 'Production office', 'Travel & accommodation']],
  ['Post-production', ['Editing', 'Color', 'Sound post', 'Music', 'VFX', 'Titles & graphics', 'Deliverables', 'Subtitles']],
  ['Other', ['Insurance', 'Legal & accounting', 'Marketing', 'Festival & distribution', 'Contingency', 'Misc']],
]
const CATEGORIES = BUDGET_GROUPS.flatMap(([, cats]) => cats)
const UNITS = ['flat', 'day', 'week', 'hour', 'unit', 'km', 'person']

export const emptyLine = () => ({ id: uid(), category: 'Camera', description: '', qty: 1, unit: 'day', rate: 0, estimate: '', actual: '', vendor: '', notes: '' })
export const lineEstimate = (l) => (l.estimate !== '' && l.estimate != null ? Number(l.estimate) : Number(l.qty || 0) * Number(l.rate || 0))
export const money = (n, cur = 'EUR') => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Number(n) || 0)

export function budgetTotals(project) {
  const b = project.budget || { lines: [], contingencyPct: 10, currency: 'EUR' }
  const est = b.lines.reduce((a, l) => a + lineEstimate(l), 0)
  const act = b.lines.reduce((a, l) => a + Number(l.actual || 0), 0)
  const cont = Math.round(est * (Number(b.contingencyPct || 0) / 100))
  return { est, act, cont, total: est + cont, currency: b.currency || 'EUR', lines: b.lines.length }
}

export function CapBar({ cap, total, spent, cur }) {
  const pct = Math.min(100, Math.round((total / cap) * 100))
  const spentPct = Math.min(100, Math.round((spent / cap) * 100))
  const over = total > cap
  const tone = over ? 'over' : pct >= 90 ? 'warn' : 'ok'
  return (
    <div className={`capbar ${tone}`}>
      <div className="capbar-head">
        <strong>{over ? `${money(total - cap, cur)} over the cap` : `${money(cap - total, cur)} left of ${money(cap, cur)}`}</strong>
        <span className="muted">{Math.round((total / cap) * 100)}% committed{spent ? ` · ${spentPct}% spent` : ''}</span>
      </div>
      <div className="capbar-track">
        <div className="capbar-fill" style={{ width: `${pct}%` }} />
        {spent > 0 && <div className="capbar-spent" style={{ width: `${spentPct}%` }} />}
        <div className="capbar-mark" style={{ left: '90%' }} title="90%" />
      </div>
    </div>
  )
}

export default function Budget() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const editable = canEdit('budget')
  const budget = project.budget || { lines: [], contingencyPct: 10, currency: 'EUR' }
  const [draft, setDraft] = useState(null)
  const [filter, setFilter] = useState('')
  const cur = budget.currency || 'EUR'

  const groups = useMemo(() => {
    return BUDGET_GROUPS.map(([name, cats]) => {
      const lines = budget.lines.filter((l) => cats.includes(l.category) && (!filter || l.category === filter))
      const est = lines.reduce((a, l) => a + lineEstimate(l), 0)
      const act = lines.reduce((a, l) => a + Number(l.actual || 0), 0)
      return { name, lines, est, act }
    }).filter((g) => g.lines.length)
  }, [budget.lines, filter])
  const t = budgetTotals(project)

  const save = () => {
    if (!draft.description.trim()) return toast('Describe the line.', 'error')
    if (budget.cap) {
      const others = budget.lines.filter((l) => l.id !== draft.id).reduce((a, l) => a + lineEstimate(l), 0)
      const newEst = others + lineEstimate(draft)
      const newTotal = newEst + Math.round(newEst * (Number(budget.contingencyPct || 0) / 100))
      if (newTotal > Number(budget.cap) && t.total <= Number(budget.cap)) toast(`Careful: this line takes the budget ${money(newTotal - Number(budget.cap), cur)} over the cap.`, 'error')
      else if (newTotal > Number(budget.cap)) toast(`Budget is ${money(newTotal - Number(budget.cap), cur)} over the cap.`, 'error')
    }
    edit((p) => {
      p.budget = p.budget || { lines: [], contingencyPct: 10, currency: 'EUR' }
      const i = p.budget.lines.findIndex((l) => l.id === draft.id)
      if (i >= 0) p.budget.lines[i] = draft
      else p.budget.lines.push(draft)
    })
    setDraft(null)
    toast('Line saved', 'ok')
  }
  const remove = (id) => edit((p) => (p.budget.lines = p.budget.lines.filter((l) => l.id !== id)))
  const setMeta = (k, v) => edit((p) => {
    p.budget = p.budget || { lines: [], contingencyPct: 10, currency: 'EUR' }
    p.budget[k] = v
  })
  const exportCSV = () => {
    const head = ['Group', 'Category', 'Description', 'Qty', 'Unit', 'Rate', 'Estimate', 'Actual', 'Vendor', 'Notes']
    const rows = BUDGET_GROUPS.flatMap(([g, cats]) => budget.lines.filter((l) => cats.includes(l.category)).map((l) => [g, l.category, l.description, l.qty, l.unit, l.rate, lineEstimate(l), l.actual, l.vendor, l.notes]))
    rows.push([], ['', '', 'Subtotal', '', '', '', t.est, t.act], ['', '', `Contingency ${budget.contingencyPct}%`, '', '', '', t.cont], ['', '', 'Total', '', '', '', t.total])
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    download(`${project.title} - budget.csv`, csv, 'text/csv')
  }

  const variance = (est, act) => {
    if (!act) return null
    const d = act - est
    return <span className={d > 0 ? 'over' : 'under'}>{d > 0 ? '+' : ''}{money(d, cur)}</span>
  }

  return (
    <div className="budget">
      <div className="toolbar no-print">
        <div className="toolbar-info">
          <strong>{money(t.total, cur)} total</strong>
          <span className="muted">
            {money(t.est, cur)} estimated + {budget.contingencyPct || 0}% contingency · {t.act ? `${money(t.act, cur)} spent` : 'nothing spent yet'}
          </span>
        </div>
        <div className="toolbar-actions">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} options={[['', 'All categories'], ...CATEGORIES.map((c) => [c, c])]} />
          {budget.lines.length > 0 && <Button variant="ghost" onClick={exportCSV}>Export CSV</Button>}
          {budget.lines.length > 0 && <Button variant="ghost" onClick={() => window.print()}>Print</Button>}
          {editable && <Button variant="primary" onClick={() => setDraft(emptyLine())}>Add line</Button>}
        </div>
      </div>

      {budget.cap ? (
        <CapBar cap={Number(budget.cap)} total={t.total} spent={t.act} cur={cur} />
      ) : editable ? (
        <p className="notice no-print">Set a budget cap below and the top sheet shows how much of it is committed and what is left.</p>
      ) : null}

      {editable && (
        <div className="budget-meta no-print">
          <Field label="Currency">
            <Select value={cur} onChange={(e) => setMeta('currency', e.target.value)} options={['EUR', 'USD', 'GBP']} />
          </Field>
          <Field label="Contingency %">
            <Input type="number" min="0" max="50" value={budget.contingencyPct ?? 10} onChange={(e) => setMeta('contingencyPct', Number(e.target.value))} />
          </Field>
          <Field label="Budget cap (do not exceed)" hint="Total you agreed with the client or set yourself.">
            <Input type="number" min="0" value={budget.cap || ''} onChange={(e) => setMeta('cap', e.target.value === '' ? '' : Number(e.target.value))} placeholder="45000" />
          </Field>
        </div>
      )}

      {!budget.lines.length ? (
        <Empty title="No budget lines yet">Start with the big blocks: crew day rates, camera and lighting packages, locations, post. Estimates come from quantity times rate, or type a flat estimate.</Empty>
      ) : (
        <article className="sheet topsheet">
          <header className="sheet-head">
            <div>
              <div className="sheet-brand">{project.producer || 'THEMADLIONS'}</div>
              <h1>{project.title}</h1>
              <div className="muted">Budget top sheet · {project.category}{budget.cap ? ` · client budget ${money(budget.cap, cur)}` : ''}</div>
            </div>
            <div className="sheet-call">
              <div className="sheet-call-label">Total</div>
              <div className="sheet-call-time">{money(t.total, cur)}</div>
              {budget.cap ? (
                <div className={t.total > budget.cap ? 'over' : 'under'}>{t.total > budget.cap ? `${money(t.total - budget.cap, cur)} over cap` : `${money(budget.cap - t.total, cur)} under cap`}</div>
              ) : null}
            </div>
          </header>

          {groups.map((g) => (
            <section key={g.name} className="budget-group">
              <div className="budget-group-head">
                <h3>{g.name}</h3>
                <span>{money(g.est, cur)}{g.act ? <span className="muted"> · spent {money(g.act, cur)}</span> : null}</span>
              </div>
              <table className="table budget-table">
                <thead>
                  <tr>
                    <th>Category</th><th>Description</th><th className="num">Qty</th><th>Unit</th><th className="num">Rate</th><th className="num">Estimate</th><th className="num">Actual</th><th className="num">Var.</th>{editable && <th className="no-print" />}
                  </tr>
                </thead>
                <tbody>
                  {g.lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.category}</td>
                      <td>{l.description}{l.vendor && <span className="muted small"> · {l.vendor}</span>}{l.notes && <div className="muted small">{l.notes}</div>}</td>
                      <td className="num">{l.estimate !== '' && l.estimate != null ? '' : l.qty}</td>
                      <td>{l.estimate !== '' && l.estimate != null ? 'flat' : l.unit}</td>
                      <td className="num">{l.estimate !== '' && l.estimate != null ? '' : money(l.rate, cur)}</td>
                      <td className="num">{money(lineEstimate(l), cur)}</td>
                      <td className="num">{l.actual !== '' && l.actual != null ? money(l.actual, cur) : ''}</td>
                      <td className="num">{variance(lineEstimate(l), Number(l.actual || 0))}</td>
                      {editable && (
                        <td className="row-actions no-print">
                          <button onClick={() => setDraft({ ...l })}>Edit</button>
                          <Confirm onConfirm={() => remove(l.id)} label="Delete">×</Confirm>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          <table className="table budget-totals">
            <tbody>
              <tr><td>Subtotal</td><td className="num">{money(t.est, cur)}</td><td className="num">{t.act ? money(t.act, cur) : ''}</td></tr>
              <tr><td>Contingency {budget.contingencyPct || 0}%</td><td className="num">{money(t.cont, cur)}</td><td /></tr>
              <tr className="grand"><td>Total</td><td className="num">{money(t.total, cur)}</td><td className="num">{t.act ? variance(t.total, t.act) : ''}</td></tr>
            </tbody>
          </table>
        </article>
      )}

      {draft && (
        <Modal
          open
          title={budget.lines.some((l) => l.id === draft.id) ? 'Edit budget line' : 'New budget line'}
          onClose={() => setDraft(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="primary" onClick={save}>Save line</Button>
            </>
          }
        >
          <div className="row-2">
            <Field label="Category">
              <select className="input select" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {BUDGET_GROUPS.map(([g, cats]) => (
                  <optgroup key={g} label={g}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
                ))}
              </select>
            </Field>
            <Field label="Vendor / payee"><Input value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} placeholder="Optional" /></Field>
          </div>
          <Field label="Description"><Input autoFocus value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="DoP, Alexa Mini LF package, rooftop permit" /></Field>
          <div className="row-3">
            <Field label="Quantity"><Input type="number" min="0" step="0.5" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} /></Field>
            <Field label="Unit"><Select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} options={UNITS} /></Field>
            <Field label={`Rate (${cur})`}><Input type="number" min="0" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.target.value })} /></Field>
          </div>
          <div className="row-2">
            <Field label="Flat estimate" hint="Leave empty to use quantity × rate."><Input type="number" min="0" value={draft.estimate} onChange={(e) => setDraft({ ...draft, estimate: e.target.value })} /></Field>
            <Field label="Actual spent" hint="Fill in as invoices arrive."><Input type="number" min="0" value={draft.actual} onChange={(e) => setDraft({ ...draft, actual: e.target.value })} /></Field>
          </div>
          <div className="muted small">Line estimate: <strong>{money(lineEstimate(draft), cur)}</strong></div>
          <Field label="Notes"><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  )
}
