import { useMemo, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'
import { download } from '../../lib/dates.js'
import { useCurrentUser, useStore } from '../../lib/store.jsx'
import PaymentModal from '../../components/PaymentModal.jsx'
import { lineBalance, lineEstimate, linePaid, syncLineWorklog, dropLineWorklog } from '../../lib/budget.js'
import { groupPairs } from '../../lib/budgetCats.js'

// The categories and their groups live in Settings > Budget (src/lib/budgetCats.js holds the
// standard list and the helpers). The page reads them through groupPairs() below.
// memberId: a team member this line pays; the line is then mirrored into their My work (see
// syncLineWorklog). vendor keeps the name so Finance, CSV and print read the same as before.
// date: the day the work is done, which is the date My work files the job under.
// estimate: the one amount of the line. qty / unit / rate stay in the data for lines made before
// the form went down to one amount; lineEstimate() still reads them.
export const emptyLine = () => ({ id: uid(), category: 'Camera', description: '', qty: 1, unit: 'flat', rate: 0, estimate: '', actual: '', vendor: '', memberId: '', date: '', notes: '' })
export { lineEstimate }
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
  const { state, update } = useStore()
  const me = useCurrentUser()
  const team = (state.users || []).filter((u) => u.active !== false)
  const teamLabel = (u) => `${u.name}${u.profile?.position ? ` · ${u.profile.position}` : ''}`
  const toast = useToast()
  const editable = canEdit('budget')
  const finTx = me?.role === 'admin' ? (state.finance?.transactions || []).filter((t) => t.projectId === project.id) : []
  const finIn = finTx.filter((t) => t.type === 'income' && t.status !== 'quoted').reduce((a, t) => a + Number(t.net || 0), 0)
  const finOut = finTx.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.net || 0), 0)
  const budget = project.budget || { lines: [], contingencyPct: 10, currency: 'EUR' }
  const [draft, setDraft] = useState(null)
  const [pay, setPay] = useState(null) // line
  const [filter, setFilter] = useState('')
  const cur = budget.currency || 'EUR'
  // groups from Settings, plus an "Unlisted" group for lines whose category was removed there
  const BUDGET_GROUPS = useMemo(() => groupPairs(state.settings, budget.lines), [state.settings, budget.lines])
  const CATEGORIES = BUDGET_GROUPS.flatMap(([, cats]) => cats)

  const groups = useMemo(() => {
    return BUDGET_GROUPS.map(([name, cats]) => {
      const lines = budget.lines.filter((l) => cats.includes(l.category) && (!filter || l.category === filter))
      const est = lines.reduce((a, l) => a + lineEstimate(l), 0)
      const act = lines.reduce((a, l) => a + Number(l.actual || 0), 0)
      return { name, lines, est, act }
    }).filter((g) => g.lines.length)
  }, [BUDGET_GROUPS, budget.lines, filter])
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
    // The whole state, not just the project: a line paid to a team member also writes their My work.
    const who = team.find((u) => u.id === draft.memberId)
    const line = { ...draft, vendor: who ? who.name : draft.vendor }
    update((s) => {
      const p = s.projects.find((x) => x.id === project.id)
      if (!p) return s
      p.budget = p.budget || { lines: [], contingencyPct: 10, currency: 'EUR' }
      const i = p.budget.lines.findIndex((l) => l.id === line.id)
      if (i >= 0) p.budget.lines[i] = line
      else p.budget.lines.push(line)
      p.updatedAt = new Date().toISOString()
      syncLineWorklog(s, p, line)
      return s
    })
    setDraft(null)
    toast(who ? `Line saved, and it is now in ${who.name}'s My work` : 'Line saved', 'ok')
  }
  const remove = (id) => update((s) => {
    const p = s.projects.find((x) => x.id === project.id)
    if (!p?.budget) return s
    p.budget.lines = p.budget.lines.filter((l) => l.id !== id)
    p.updatedAt = new Date().toISOString()
    dropLineWorklog(s, id)
    return s
  })
  const setMeta = (k, v) => edit((p) => {
    p.budget = p.budget || { lines: [], contingencyPct: 10, currency: 'EUR' }
    p.budget[k] = v
  })
  const exportCSV = () => {
    const head = ['Group', 'Category', 'Description', 'Amount', 'Paid', 'Paid to', 'Notes']
    const rows = BUDGET_GROUPS.flatMap(([g, cats]) => budget.lines.filter((l) => cats.includes(l.category)).map((l) => [g, l.category, l.description, lineEstimate(l), l.payments?.length ? linePaid(l) : l.actual, l.vendor, l.notes]))
    rows.push([], ['', '', 'Subtotal', t.est, t.act], ['', '', `Contingency ${budget.contingencyPct}%`, t.cont], ['', '', 'Total', t.total])
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    download(`${project.title} - budget.csv`, csv, 'text/csv')
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
          {editable && <Button variant="primary" onClick={() => setDraft({ ...emptyLine(), category: CATEGORIES.includes('Camera') ? 'Camera' : CATEGORIES[0] || '' })}>Add line</Button>}
        </div>
      </div>

      {me?.role === 'admin' && finTx.length > 0 && (
        <div className="pl-strip no-print">
          <span><span className="muted">Invoiced</span> <strong>{money(finIn, cur)}</strong></span>
          <span><span className="muted">Costs booked</span> <strong>{money(finOut, cur)}</strong></span>
          <span><span className="muted">Profit</span> <strong className={finIn - finOut < 0 ? 'over' : 'under'}>{money(finIn - finOut, cur)}</strong>{finIn ? <span className="muted"> · {Math.round(((finIn - finOut) / finIn) * 100)}%</span> : null}</span>
          <span className="muted small">from Finance, administrators only</span>
        </div>
      )}
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
        <Empty title="No budget lines yet">Start with the big blocks: crew, camera and lighting packages, locations, post. One amount per line.</Empty>
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
                    <th>Category</th><th>Description</th><th className="num">Amount</th><th className="num">Paid</th><th className="num">Balance</th>{editable && <th className="no-print" />}
                  </tr>
                </thead>
                <tbody>
                  {g.lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.category}</td>
                      <td>{l.description}{l.vendor && <span className="muted small"> · {l.vendor}{l.memberId ? ' (team)' : ''}</span>}{l.notes && <div className="muted small">{l.notes}</div>}</td>
                      <td className="num">{money(lineEstimate(l), cur)}</td>
                      <td className="num">{l.payments?.length ? money(linePaid(l), cur) : l.actual !== '' && l.actual != null && Number(l.actual) ? money(l.actual, cur) : ''}</td>
                      <td className={`num ${l.payments?.length && lineBalance(l) > 0 ? 'over' : ''}`}>{l.payments?.length ? (lineBalance(l) > 0 ? money(lineBalance(l), cur) : <span className="under">settled</span>) : ''}</td>
                      {editable && (
                        <td className="row-actions no-print">
                          {me?.role === 'admin' && lineEstimate(l) > 0 && lineBalance(l) > 0 && <button onClick={() => setPay(l)}>Pay</button>}
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
              <tr className="grand"><td>Total</td><td className="num">{money(t.total, cur)}</td><td className="num">{t.act ? <span className={t.act > t.total ? 'over' : 'muted'}>{money(t.act, cur)} paid</span> : ''}</td></tr>
            </tbody>
          </table>
        </article>
      )}

      {pay && <PaymentModal project={project} line={budget.lines.find((l) => l.id === pay.id) || pay} onClose={() => setPay(null)} />}
      {draft && (
        <Modal
          open
          wide
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
                {draft.category && !CATEGORIES.includes(draft.category) && <option value={draft.category}>{draft.category} (unlisted)</option>}
              </select>
            </Field>
            <Field label="Paid to" hint={draft.memberId ? 'A team member: this line goes into their My work, and turns to paid when you pay it.' : ''}>
              <Select value={draft.memberId || ''} onChange={(e) => setDraft({ ...draft, memberId: e.target.value })} options={[['', 'Someone outside the team'], ...team.map((u) => [u.id, teamLabel(u)])]} />
            </Field>
          </div>
          {draft.memberId ? (
            <Field label="Work date" hint="The day My work files this job under. Leave empty for today."><Input type="date" value={draft.date || ''} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
          ) : (
            <Field label="Vendor / payee"><Input value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} placeholder="Optional" /></Field>
          )}
          <Field label="Description"><Input autoFocus value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="DoP, Alexa Mini LF package, rooftop permit" /></Field>
          {/* One amount per line, Alex's call. An old line made as quantity × rate shows its total here and is saved as that total. */}
          <Field label={`Amount (${cur})`} hint={draft.payments?.length ? `${money(linePaid(draft), cur)} paid so far, ${draft.payments.length} payment${draft.payments.length === 1 ? '' : 's'} recorded in Finance.` : 'What this costs. Payments are recorded from Finance or with Pay on the line.'}>
            <Input type="number" min="0" step="0.01" value={draft.estimate === '' || draft.estimate == null ? (lineEstimate(draft) || '') : draft.estimate} onChange={(e) => setDraft({ ...draft, estimate: e.target.value, qty: 1, unit: 'flat', rate: 0 })} placeholder="800" />
          </Field>
          <Field label="Notes"><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  )
}
