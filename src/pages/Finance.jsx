import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { today, uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { DOCS, EXPENSE_CATS, FREQ, INCOME_CATS, METHODS, TX_STATUS, duePeriods, emptyRecurring, emptyTx, fiscalYearLabel, fiscalYearOf, generateFromRecurring, grossOf, matchTx, money, summarize, vatOf } from '../lib/finance.js'
import { download, fmtDate } from '../lib/dates.js'
import PaymentModal from '../components/PaymentModal.jsx'
import { lineBalance, lineEstimate, linePaid } from '../lib/budget.js'
import { AGE_BUCKETS, WorkLogTable, ageBucket, daysWaiting, entryTotals, money2, togglePaidEntry } from '../components/WorkLog.jsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const BUDGET_CAT = {
  Crew: 'Production staff', Cast: 'Cast', 'Equipment rental': 'Equipment rental', 'Equipment purchase': 'Equipment rental', 'Locations & permits': 'Locations',
  'Art & props': 'Art & set', 'Wardrobe & makeup': 'Wardrobe', Transport: 'Transport', Catering: 'Catering', 'Post-production': 'Editing', 'Music & rights': 'Music',
  Insurance: 'Insurance', 'Accounting & legal': 'Legal & accounting', Marketing: 'Marketing', Travel: 'Travel & accommodation',
}

export default function Finance() {
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const fin = state.finance
  const cur = fin.settings.currency || 'EUR'
  // The financial year can start in a month other than January (Finance settings), so every
  // year grouping on this page goes through fiscalYearOf rather than slicing the date.
  const fiscalStart = Number(fin.settings.fiscalYearStart) || 1
  const fyLabel = (y) => fiscalYearLabel(y, fiscalStart)
  const years = useMemo(() => [...new Set(fin.transactions.map((t) => fiscalYearOf(t.date, fiscalStart)).filter(Boolean))].sort((a, b) => b - a), [fin.transactions, fiscalStart])
  const [year, setYear] = useState(years[0] || new Date().getFullYear())
  const [tab, setTab] = useState('overview') // overview | transactions | settings
  const [draft, setDraft] = useState(null)
  const [f, setF] = useState({ q: '', type: '', project: '', status: '', doc: '', month: '' })
  const [settings, setSettings] = useState(fin.settings)
  const [rdraft, setRdraft] = useState(null)
  const [pay, setPay] = useState(null) // { project, line }
  const commitments = state.projects.flatMap((p) => (p.budget?.lines || []).filter((l) => lineEstimate(l) > 0 && l.category !== 'Contingency' && !l.txId).map((l) => ({ project: p, line: l, agreed: lineEstimate(l), paid: linePaid(l), balance: lineBalance(l) })))
  const openCommitments = commitments.filter((c) => c.balance > 0 && c.project.status !== 'Delivered').sort((a, b) => b.balance - a.balance)
  const committed = openCommitments.reduce((a, c) => a + c.balance, 0)
  const recurring = fin.recurring || []
  const due = recurring.map((r) => ({ r, periods: duePeriods(r) })).filter((x) => x.periods.length)
  const dueCount = due.reduce((a, x) => a + x.periods.length, 0)

  if (me?.role !== 'admin') return <Navigate to="/" replace />

  const generateDue = () => {
    if (!due.length) return
    const n = dueCount
    update((s) => {
      due.forEach(({ r, periods }) => {
        s.finance.transactions.push(...generateFromRecurring(r, periods))
        const t = s.finance.recurring.find((x) => x.id === r.id)
        if (t) t.lastGenerated = periods[periods.length - 1]
      })
      return s
    })
    toast(`${n} transaction${n === 1 ? '' : 's'} booked from recurring items`, 'ok')
  }
  const saveRecurring = () => {
    if (!rdraft.description.trim()) return toast('Describe the recurring item.', 'error')
    if (!Number(rdraft.net)) return toast('Enter the net amount.', 'error')
    update((s) => {
      s.finance.recurring = s.finance.recurring || []
      const i = s.finance.recurring.findIndex((r) => r.id === rdraft.id)
      const r = { ...rdraft, net: Number(rdraft.net), vatPct: Number(rdraft.vatPct) || 0, day: Number(rdraft.day) || 1 }
      if (i >= 0) s.finance.recurring[i] = r
      else s.finance.recurring.push(r)
      return s
    })
    setRdraft(null)
    toast('Recurring item saved', 'ok')
  }
  const monthlyLoad = recurring.filter((r) => r.active).reduce((a, r) => a + (r.type === 'expense' ? 1 : -1) * Number(r.net || 0) / (r.frequency === 'yearly' ? 12 : r.frequency === 'quarterly' ? 3 : 1), 0)

  const S = summarize(fin.transactions, { year, projects: state.projects, fiscalStart })
  const taxEst = Math.max(0, Math.round(S.profit * (Number(fin.settings.taxRate || 0) / 100)))
  const maxMonth = Math.max(1, ...S.months.map((m) => Math.max(m.income, m.expense)))

  const listed = fin.transactions
    .filter((t) => fiscalYearOf(t.date, fiscalStart) === year)
    .filter((t) => (f.type ? t.type === f.type : true))
    .filter((t) => (f.project ? t.projectId === f.project : true))
    .filter((t) => (f.status ? t.status === f.status : true))
    .filter((t) => (f.doc ? t.doc === f.doc : true))
    .filter((t) => (f.month ? t.date.slice(5, 7) === f.month : true))
    .filter((t) => matchTx(t, f.q))
    .sort((a, b) => b.date.localeCompare(a.date))

  const save = () => {
    if (!draft.description.trim()) return toast('Describe the transaction.', 'error')
    if (!Number(draft.net)) return toast('Enter the net amount.', 'error')
    update((s) => {
      const tx = { ...draft, net: Number(draft.net), vatPct: Number(draft.vatPct) || 0 }
      const i = s.finance.transactions.findIndex((t) => t.id === tx.id)
      if (i >= 0) s.finance.transactions[i] = tx
      else s.finance.transactions.push(tx)
      // payment against an agreed budget line
      if (tx.projectId && tx.type === 'expense' && tx.budgetLineId) {
        const p = s.projects.find((x) => x.id === tx.projectId)
        const line = p?.budget?.lines?.find((l) => l.id === tx.budgetLineId)
        if (line) {
          line.payments = [...(line.payments || []).filter((x) => x.txId !== tx.id), { txId: tx.id, date: tx.date, amount: tx.net }]
          line.actual = linePaid(line)
        }
      }
      // mirror other expenses into the project budget as new actuals
      if (tx.projectId && tx.type === 'expense' && !tx.budgetLineId && tx.syncBudget !== false) {
        const p = s.projects.find((x) => x.id === tx.projectId)
        if (p) {
          p.budget = p.budget || { lines: [], contingencyPct: 10, currency: 'EUR', cap: '' }
          const existing = p.budget.lines.find((l) => l.txId === tx.id)
          const line = { id: existing?.id || uid(), txId: tx.id, category: BUDGET_CAT[tx.category] || 'Misc', description: tx.description, qty: 1, unit: 'flat', rate: 0, estimate: existing?.estimate ?? '', actual: tx.net, vendor: tx.party, notes: existing?.notes || 'From Finance' }
          if (existing) Object.assign(existing, line)
          else p.budget.lines.push(line)
        }
      }
      return s
    })
    setDraft(null)
    toast('Saved', 'ok')
  }
  const remove = (tx) => update((s) => {
    s.finance.transactions = s.finance.transactions.filter((t) => t.id !== tx.id)
    s.projects.forEach((p) => {
      if (!p.budget?.lines) return
      p.budget.lines = p.budget.lines.filter((l) => l.txId !== tx.id)
      p.budget.lines.forEach((l) => {
        if (l.payments?.some((x) => x.txId === tx.id)) { l.payments = l.payments.filter((x) => x.txId !== tx.id); l.actual = linePaid(l) }
      })
    })
    return s
  })
  const setStatus = (tx, status) => update((s) => {
    const t = s.finance.transactions.find((x) => x.id === tx.id)
    if (t) { t.status = status; if (status === 'paid' && !t.paidOn) t.paidOn = today() }
    return s
  })
  const saveSettings = () => {
    update((s) => { s.finance.settings = { ...s.finance.settings, ...settings, vatDefault: Number(settings.vatDefault) || 0, taxRate: Number(settings.taxRate) || 0, fiscalYearStart: Number(settings.fiscalYearStart) || 1 }; return s })
    toast('Finance settings saved', 'ok')
  }
  const exportCSV = () => {
    const head = ['Date', 'Type', 'Project', 'Category', 'Description', 'Client / vendor', 'Net', 'VAT %', 'VAT', 'Gross', 'Status', 'Document', 'Doc number', 'Method', 'Paid on', 'Notes']
    const pById = Object.fromEntries(state.projects.map((p) => [p.id, p.title]))
    const rows = listed.map((t) => [t.date, t.type, pById[t.projectId] || '', t.category, t.description, t.party, t.net, t.vatPct, vatOf(t), grossOf(t), t.status, t.doc, t.docNumber, t.method, t.paidOn, t.notes])
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    download(`finance-${year}.csv`, '\uFEFF' + csv, 'text/csv')
  }

  const pName = (id) => state.projects.find((p) => p.id === id)?.title || ''
  const Table = ({ rows, label }) => (
    <table className="table fin-table">
      <thead><tr><th>{label}</th><th className="num">Income</th><th className="num">Expense</th><th className="num">Profit</th><th className="num">Margin</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}><td>{r.key}</td><td className="num">{r.income ? money(r.income, cur) : ''}</td><td className="num">{r.expense ? money(r.expense, cur) : ''}</td><td className={`num ${r.profit < 0 ? 'over' : ''}`}>{money(r.profit, cur)}</td><td className="num muted">{r.margin != null ? `${r.margin}%` : ''}</td></tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="finance">
      <PageHead title="Finance" sub="Administrators only. Company and projects together, net amounts unless stated.">
        <div className="segmented small">
          {[['overview', 'Overview'], ['transactions', 'Transactions'], ['recurring', `Recurring${dueCount ? ` (${dueCount} due)` : ''}`], ['team', 'Team work'], ['settings', 'Settings']].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <Select className="compact" value={year} onChange={(e) => setYear(Number(e.target.value))} options={[...new Set([...years, new Date().getFullYear()])].sort((a, b) => b - a).map((y) => [y, fyLabel(y)])} />
        <Button variant="ghost" onClick={() => setDraft(emptyTx('income', { vatPct: fin.settings.vatDefault }))}>Add income</Button>
        <Button variant="primary" onClick={() => setDraft(emptyTx('expense', { vatPct: fin.settings.vatDefault }))}>Add expense</Button>
      </PageHead>

      {dueCount > 0 && tab !== 'recurring' && (
        <p className="notice fin-due">
          {dueCount} recurring item{dueCount === 1 ? '' : 's'} due (rent, salaries, subscriptions) not yet booked.
          <button className="link" onClick={generateDue}>Book them now</button>
        </p>
      )}

      {tab === 'overview' && (
        <>
          <div className="fin-hero">
            <div className={`fin-card ${S.profit < 0 ? 'neg' : 'pos'}`}>
              <div className="fin-label">Profit {year}</div>
              <div className="fin-value">{money(S.profit, cur)}</div>
              <div className="fin-sub">{money(S.income, cur)} in · {money(S.expense, cur)} out · est. tax {money(taxEst, cur)} ({fin.settings.taxRate}%) · after tax {money(S.profit - taxEst, cur)}</div>
            </div>
            <div className="fin-card">
              <div className="fin-label">Owed to us</div>
              <div className="fin-value">{money(S.owedToUs, cur)}</div>
              <div className="fin-sub">{S.owedCount} unpaid invoice{S.owedCount === 1 ? '' : 's'} (gross){S.quoted ? ` · ${money(S.quoted, cur)} quoted, not yet invoiced` : ''}</div>
            </div>
            <div className="fin-card">
              <div className="fin-label">We owe</div>
              <div className="fin-value">{money(S.weOwe + committed, cur)}</div>
              <div className="fin-sub">{money(S.weOwe, cur)} in {S.weOweCount} bill{S.weOweCount === 1 ? '' : 's'} (gross) · {money(committed, cur)} still owed to crew & vendors on {openCommitments.length} budget line{openCommitments.length === 1 ? '' : 's'} (net)</div>
            </div>
            <div className="fin-card">
              <div className="fin-label">This month</div>
              <div className="fin-value">{money(S.monthIn - S.monthOut, cur)}</div>
              <div className="fin-sub">{money(S.monthIn, cur)} in · {money(S.monthOut, cur)} out</div>
            </div>
          </div>

          <section className="panel">
            <div className="panel-head"><h2>Month by month {year}</h2><span className="muted small">VAT balance for the year: {money(S.vatBalance, cur)} ({money(S.vatIn, cur)} collected, {money(S.vatOut, cur)} paid)</span></div>
            <div className="fin-months">
              {S.months.map((m, i) => (
                <div key={m.key} className="fin-month" title={`${MONTHS[i]}: ${money(m.income, cur)} in, ${money(m.expense, cur)} out`}>
                  <div className="fin-bars">
                    <div className="fin-bar in" style={{ height: `${(m.income / maxMonth) * 100}%` }} />
                    <div className="fin-bar out" style={{ height: `${(m.expense / maxMonth) * 100}%` }} />
                  </div>
                  <div className="fin-month-label">{MONTHS[i]}</div>
                  <div className={`fin-month-net small ${m.income - m.expense < 0 ? 'over' : ''}`}>{m.income || m.expense ? money(m.income - m.expense, cur) : ''}</div>
                </div>
              ))}
            </div>
            <div className="legend small muted"><span className="sw in" /> income <span className="sw out" /> expense</div>
          </section>

          {openCommitments.length > 0 && (
            <section className="panel">
              <div className="panel-head"><h2>Owed to crew & vendors</h2><span className="muted small">from project budgets · agreed minus paid</span></div>
              <div className="table-wrap">
                <table className="table fin-table">
                  <thead><tr><th>Project</th><th>Line</th><th>Payee</th><th className="num">Agreed</th><th className="num">Paid</th><th className="num">Balance</th><th /></tr></thead>
                  <tbody>
                    {openCommitments.map((c) => (
                      <tr key={c.line.id}>
                        <td className="small">{c.project.title}</td>
                        <td><strong>{c.line.description}</strong><div className="muted small">{c.line.category}</div></td>
                        <td className="small">{c.line.vendor}</td>
                        <td className="num">{money(c.agreed, cur)}</td>
                        <td className="num">{c.paid ? money(c.paid, cur) : ''}</td>
                        <td className="num over">{money(c.balance, cur)}</td>
                        <td className="row-actions"><button onClick={() => setPay({ project: c.project, line: c.line })}>Record payment</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!fin.transactions.length ? (
            <Empty title="No transactions yet">Start with this year's invoices and the big expenses: crew, rentals, rent, salaries. Tie project costs to their project and the profit per project appears by itself.</Empty>
          ) : (
            <div className="cols">
              <section className="panel"><h2>By project</h2><Table rows={S.byProject} label="Project" /></section>
              <section className="panel"><h2>By client</h2><Table rows={S.byClient} label="Client" /></section>
              <section className="panel"><h2>By category</h2><Table rows={S.byCategory} label="Category" /></section>
              <section className="panel"><h2>By project type</h2><Table rows={S.byType} label="Type" /></section>
            </div>
          )}
        </>
      )}

      {tab === 'transactions' && (
        <>
          <div className="toolbar">
            <div className="toolbar-info"><strong>{listed.length} transactions</strong><span className="muted">{money(listed.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.net), 0), cur)} in · {money(listed.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.net), 0), cur)} out (net)</span></div>
            <div className="toolbar-actions">
              <Input className="input search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search…" />
              <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={[['', 'Income & expense'], ['income', 'Income'], ['expense', 'Expense']]} />
              <Select value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} options={[['', 'All months'], ...MONTHS.map((m, i) => [String(i + 1).padStart(2, '0'), m])]} />
              <Select value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })} options={[['', 'All projects'], ...state.projects.map((p) => [p.id, p.title])]} />
              <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={[['', 'Any status'], ['quoted', 'Quoted'], ['invoiced', 'Invoiced'], ['pending', 'To pay'], ['paid', 'Paid']]} />
              <Select value={f.doc} onChange={(e) => setF({ ...f, doc: e.target.value })} options={[['', 'Any document'], ...DOCS]} />
              <Button variant="ghost" onClick={exportCSV}>Export CSV</Button>
            </div>
          </div>
          {!listed.length ? (
            <Empty title="Nothing here">Add a transaction or change the filters.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table fin-list">
                <thead><tr><th>Date</th><th>Description</th><th>Project</th><th>Category</th><th className="num">Net</th><th className="num">VAT</th><th className="num">Gross</th><th>Doc</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {listed.map((t) => (
                    <tr key={t.id} className={`tx-${t.type}`}>
                      <td className="nowrap">{fmtDate(t.date, { day: 'numeric', month: 'short' })}</td>
                      <td><strong>{t.description}</strong>{t.party && <div className="muted small">{t.party}{t.docNumber ? ` · ${t.docNumber}` : ''}</div>}</td>
                      <td className="small">{pName(t.projectId) || <span className="muted">Company</span>}</td>
                      <td className="small">{t.category}</td>
                      <td className={`num ${t.type === 'income' ? 'under' : ''}`}>{t.type === 'income' ? '+' : '−'}{money(t.net, cur)}</td>
                      <td className="num muted">{t.vatPct ? money(vatOf(t), cur) : ''}</td>
                      <td className="num">{money(grossOf(t), cur)}</td>
                      <td className="small">{DOCS.find(([v]) => v === t.doc)?.[1]}{t.docLink && <a className="link" href={t.docLink} target="_blank" rel="noreferrer"> ↗</a>}</td>
                      <td>
                        <select className="input select tiny" value={t.status} onChange={(e) => setStatus(t, e.target.value)}>
                          {TX_STATUS[t.type].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                      <td className="row-actions">
                        <button onClick={() => setDraft({ ...t })}>Edit</button>
                        <button onClick={() => setDraft({ ...t, id: uid(), date: today(), status: t.type === 'income' ? 'invoiced' : 'pending', paidOn: '', docNumber: '' })}>Copy</button>
                        {!t.recurringId && <button onClick={() => setRdraft(emptyRecurring({ type: t.type, description: t.description, party: t.party, category: t.category, projectId: t.projectId, net: t.net, vatPct: t.vatPct, doc: t.doc, method: t.method, day: Number(t.date.slice(8, 10)) || 1, start: t.date.slice(0, 7), lastGenerated: t.date.slice(0, 7) }))}>Repeat</button>}
                        <Confirm onConfirm={() => remove(t)} label="Delete">×</Confirm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'team' && <TeamWork />}

      {tab === 'recurring' && (
        <>
          <div className="toolbar">
            <div className="toolbar-info">
              <strong>{recurring.filter((r) => r.active).length} active</strong>
              <span className="muted">≈ {money(Math.abs(monthlyLoad), cur)} net {monthlyLoad >= 0 ? 'out' : 'in'} per month{dueCount ? ` · ${dueCount} due` : ''}</span>
            </div>
            <div className="toolbar-actions">
              {dueCount > 0 && <Button variant="primary" onClick={generateDue}>Book {dueCount} due</Button>}
              <Button variant={dueCount ? 'ghost' : 'primary'} onClick={() => setRdraft(emptyRecurring({ vatPct: fin.settings.vatDefault }))}>Add recurring</Button>
            </div>
          </div>
          {!recurring.length ? (
            <Empty title="No recurring items yet">Rent, salaries, insurance, software subscriptions, retainers you invoice every month. Add them once; each month you book them with one click and they land in Transactions as "to pay" or "invoiced".</Empty>
          ) : (
            <table className="table">
              <thead><tr><th>Item</th><th>Every</th><th>Day</th><th className="num">Net</th><th className="num">Gross</th><th>Project</th><th>Last booked</th><th>Next</th><th /></tr></thead>
              <tbody>
                {recurring.map((r) => {
                  const periods = duePeriods(r)
                  return (
                    <tr key={r.id} className={r.active ? '' : 'dim'}>
                      <td><strong>{r.description}</strong><div className="muted small">{r.type === 'income' ? 'Income' : 'Expense'} · {r.category}{r.party ? ` · ${r.party}` : ''}</div></td>
                      <td className="small">{FREQ.find(([v]) => v === r.frequency)?.[1]}</td>
                      <td className="small">{r.day}</td>
                      <td className={`num ${r.type === 'income' ? 'under' : ''}`}>{money(r.net, cur)}</td>
                      <td className="num">{money(grossOf(r), cur)}</td>
                      <td className="small">{pName(r.projectId) || <span className="muted">Company</span>}</td>
                      <td className="small">{r.lastGenerated || <span className="muted">never</span>}</td>
                      <td className="small">{!r.active ? <span className="muted">paused</span> : periods.length ? <span className="late">{periods.length} due</span> : r.end && r.lastGenerated >= r.end ? <span className="muted">ended</span> : 'up to date'}</td>
                      <td className="row-actions">
                        <button onClick={() => setRdraft({ ...r })}>Edit</button>
                        <button onClick={() => update((s) => { const x = s.finance.recurring.find((y) => y.id === r.id); if (x) x.active = !x.active; return s })}>{r.active ? 'Pause' : 'Resume'}</button>
                        <Confirm onConfirm={() => update((s) => { s.finance.recurring = s.finance.recurring.filter((y) => y.id !== r.id); return s })} label="Delete">×</Confirm>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <p className="fineprint">Booked items are normal transactions: edit the amount or mark them paid in Transactions. Deleting a recurring item keeps what was already booked.</p>
        </>
      )}

      {tab === 'settings' && (
        <section className="panel fin-settings">
          <h2>Finance settings</h2>
          <div className="row-3">
            <Field label="Currency"><Select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} options={['EUR', 'USD', 'GBP']} /></Field>
            <Field label="Default VAT %"><Input type="number" min="0" max="30" value={settings.vatDefault} onChange={(e) => setSettings({ ...settings, vatDefault: e.target.value })} /></Field>
            <Field label="Income tax estimate %" hint="Applied to the year's profit for the estimate on the overview."><Input type="number" min="0" max="60" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })} /></Field>
          </div>
          <div className="row-2">
            <Field label="Financial year starts in" hint="January for a Greek company, which is the default. Change it only if you close the books on another month; every year total and year tab on this page follows it.">
              <Select value={String(settings.fiscalYearStart ?? 1)} onChange={(e) => setSettings({ ...settings, fiscalYearStart: Number(e.target.value) })} options={MONTHS.map((m, i) => [String(i + 1), m])} />
            </Field>
            <div />
          </div>
          <div className="row-actions"><Button variant="primary" onClick={saveSettings}>Save</Button></div>
          <p className="fineprint">Finance is stored in its own table that only administrators can read. Expenses tied to a project also appear as actuals in that project's budget.</p>
        </section>
      )}

      {pay && <PaymentModal project={pay.project} line={pay.line} onClose={() => setPay(null)} />}
      {rdraft && (
        <Modal open title={recurring.some((r) => r.id === rdraft.id) ? 'Edit recurring item' : 'New recurring item'} onClose={() => setRdraft(null)}
          footer={<><Button variant="ghost" onClick={() => setRdraft(null)}>Cancel</Button><Button variant="primary" onClick={saveRecurring}>Save</Button></>}>
          <div className="stack">
            <div className="segmented small">
              <button className={rdraft.type === 'expense' ? 'on' : ''} onClick={() => setRdraft({ ...rdraft, type: 'expense', category: EXPENSE_CATS.includes(rdraft.category) ? rdraft.category : 'Office rent' })}>Expense</button>
              <button className={rdraft.type === 'income' ? 'on' : ''} onClick={() => setRdraft({ ...rdraft, type: 'income', category: INCOME_CATS.includes(rdraft.category) ? rdraft.category : 'Consulting' })}>Income</button>
            </div>
            <Field label="Description"><Input autoFocus value={rdraft.description} onChange={(e) => setRdraft({ ...rdraft, description: e.target.value })} placeholder={rdraft.type === 'expense' ? 'Office rent, Adobe subscription, Editor salary' : 'Monthly retainer'} /></Field>
            <div className="row-3">
              <Field label="Category"><Select value={rdraft.category} onChange={(e) => setRdraft({ ...rdraft, category: e.target.value })} options={rdraft.type === 'income' ? INCOME_CATS : EXPENSE_CATS} /></Field>
              <Field label={rdraft.type === 'income' ? 'Client' : 'Vendor / payee'}><Input value={rdraft.party} onChange={(e) => setRdraft({ ...rdraft, party: e.target.value })} /></Field>
              <Field label="Project"><Select value={rdraft.projectId} onChange={(e) => setRdraft({ ...rdraft, projectId: e.target.value })} options={[['', 'Company (no project)'], ...state.projects.map((p) => [p.id, p.title])]} /></Field>
            </div>
            <div className="row-3">
              <Field label={`Net (${cur})`}><Input type="number" min="0" step="0.01" value={rdraft.net} onChange={(e) => setRdraft({ ...rdraft, net: e.target.value })} /></Field>
              <Field label="VAT %"><Input type="number" min="0" max="30" value={rdraft.vatPct} onChange={(e) => setRdraft({ ...rdraft, vatPct: e.target.value })} /></Field>
              <Field label="Document"><Select value={rdraft.doc} onChange={(e) => setRdraft({ ...rdraft, doc: e.target.value, vatPct: e.target.value === 'none' ? 0 : rdraft.vatPct })} options={DOCS} /></Field>
            </div>
            <div className="row-3">
              <Field label="Every"><Select value={rdraft.frequency} onChange={(e) => setRdraft({ ...rdraft, frequency: e.target.value })} options={FREQ} /></Field>
              <Field label="Day of month"><Input type="number" min="1" max="31" value={rdraft.day} onChange={(e) => setRdraft({ ...rdraft, day: e.target.value })} /></Field>
              <Field label="Payment method"><Select value={rdraft.method} onChange={(e) => setRdraft({ ...rdraft, method: e.target.value })} options={METHODS} /></Field>
            </div>
            <div className="row-2">
              <Field label="First month" hint="Months before this are not booked."><Input type="month" value={rdraft.start} onChange={(e) => setRdraft({ ...rdraft, start: e.target.value })} /></Field>
              <Field label="Last month (optional)"><Input type="month" value={rdraft.end} onChange={(e) => setRdraft({ ...rdraft, end: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Input value={rdraft.notes} onChange={(e) => setRdraft({ ...rdraft, notes: e.target.value })} /></Field>
          </div>
        </Modal>
      )}

      {draft && (
        <Modal open title={`${fin.transactions.some((t) => t.id === draft.id) ? 'Edit' : 'New'} ${draft.type}`} onClose={() => setDraft(null)}
          footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
          <div className="stack">
            <div className="segmented small">
              <button className={draft.type === 'income' ? 'on' : ''} onClick={() => setDraft({ ...draft, type: 'income', category: INCOME_CATS.includes(draft.category) ? draft.category : 'Production fee', status: 'invoiced' })}>Income</button>
              <button className={draft.type === 'expense' ? 'on' : ''} onClick={() => setDraft({ ...draft, type: 'expense', category: EXPENSE_CATS.includes(draft.category) ? draft.category : 'Crew', status: 'pending' })}>Expense</button>
            </div>
            <Field label="Description"><Input autoFocus value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={draft.type === 'income' ? 'Production fee, 50% advance' : 'DoP, 3 days'} /></Field>
            <div className="row-3">
              <Field label="Date"><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
              <Field label="Project"><Select value={draft.projectId} onChange={(e) => setDraft({ ...draft, projectId: e.target.value })} options={[['', 'Company (no project)'], ...state.projects.map((p) => [p.id, p.title])]} /></Field>
              <Field label="Category"><Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} options={draft.type === 'income' ? INCOME_CATS : EXPENSE_CATS} /></Field>
            </div>
            <Field label={draft.type === 'income' ? 'Client' : 'Vendor / payee'}><Input value={draft.party} onChange={(e) => setDraft({ ...draft, party: e.target.value })} /></Field>
            <div className="row-3">
              <Field label={`Net (${cur})`}><Input type="number" min="0" step="0.01" value={draft.net} onChange={(e) => setDraft({ ...draft, net: e.target.value })} /></Field>
              <Field label="VAT %"><Input type="number" min="0" max="30" value={draft.vatPct} onChange={(e) => setDraft({ ...draft, vatPct: e.target.value })} /></Field>
              <Field label="Gross"><Input value={money(grossOf(draft), cur)} disabled /></Field>
            </div>
            <div className="row-3">
              <Field label="Document"><Select value={draft.doc} onChange={(e) => setDraft({ ...draft, doc: e.target.value, vatPct: e.target.value === 'none' ? 0 : draft.vatPct })} options={DOCS} /></Field>
              <Field label="Document number"><Input value={draft.docNumber} onChange={(e) => setDraft({ ...draft, docNumber: e.target.value })} placeholder="TΠΥ 0123" /></Field>
              <Field label="Status"><Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} options={TX_STATUS[draft.type]} /></Field>
            </div>
            <div className="row-3">
              <Field label="Payment method"><Select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })} options={METHODS} /></Field>
              <Field label="Paid on"><Input type="date" value={draft.paidOn} onChange={(e) => setDraft({ ...draft, paidOn: e.target.value })} /></Field>
              <Field label="Document link"><Input value={draft.docLink} onChange={(e) => setDraft({ ...draft, docLink: e.target.value })} placeholder="Drive, email" /></Field>
            </div>
            {draft.type === 'expense' && draft.projectId && (
              <Field label="Budget line" hint="Pay against an agreed line (advance or balance), or add it as a new cost.">
                <Select value={draft.budgetLineId || ''} onChange={(e) => setDraft({ ...draft, budgetLineId: e.target.value, syncBudget: !e.target.value })}
                  options={[['', 'New cost in the budget'], ...((state.projects.find((p) => p.id === draft.projectId)?.budget?.lines || []).filter((l) => !l.txId).map((l) => [l.id, `${l.description} · ${money(lineEstimate(l), cur)} agreed${linePaid(l) ? `, ${money(linePaid(l), cur)} paid` : ''}`]))]} />
              </Field>
            )}
            <Field label="Notes"><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}


function TeamWork() {
  const { state, update } = useStore()
  const [who, setWho] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [allOwed, setAllOwed] = useState(false)
  const log = state.worklog || []
  const years = [...new Set([String(new Date().getFullYear()), ...log.map((e) => (e.date || '').slice(0, 4)).filter(Boolean)])].sort().reverse()

  // Everyone who can appear here: the active team, plus anyone who still has jobs logged
  // but has since left, been deactivated or become an administrator. Without that second
  // group their money counted in the totals above with no card to open below, and the
  // figures on this page did not add up.
  const people = useMemo(() => {
    const team = state.users.filter((u) => u.active !== false && u.role !== 'admin')
    const out = [...team]
    const seen = new Set(team.map((u) => u.id))
    for (const e of log) {
      const id = e.userId || ''
      if (seen.has(id)) continue
      seen.add(id)
      const known = state.users.find((u) => u.id === id)
      out.push({ id, name: known?.name || (id ? 'Former teammate' : 'Not assigned'), gone: true })
    }
    return out
  }, [state.users, log])

  const rows = people
    .map((u) => ({ u, t: entryTotals(log.filter((e) => (e.userId || '') === u.id && (e.date || '').startsWith(year))), allT: entryTotals(log.filter((e) => (e.userId || '') === u.id)) }))
    .sort((a, b) => b.t.total - a.t.total || a.u.name.localeCompare(b.u.name))
  // Counts exactly the people listed below, so the hero and the cards always agree.
  const all = entryTotals(rows.flatMap((r) => log.filter((e) => (e.userId || '') === r.u.id && (e.date || '').startsWith(year))))
  const sel = people.find((u) => u.id === who)
  const max = Math.max(1, ...rows.map((r) => r.t.total))

  // Money owed is money owed whatever year it was earned in, so this list ignores the year tabs.
  const owed = useMemo(() => log
    .filter((e) => e.status !== 'paid')
    .map((e) => ({ e, days: daysWaiting(e), name: people.find((u) => u.id === (e.userId || ''))?.name || 'Someone' }))
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name)), [log, people])
  const aging = owed.reduce((acc, o) => { acc[ageBucket(o.days)] += Number(o.e.amount) || 0; return acc }, { fresh: 0, warn: 0, late: 0 })
  const owedTotal = owed.reduce((a, o) => a + (Number(o.e.amount) || 0), 0)

  return (
    <div className="teamwork">
      <section className="panel tw-owed">
        <div className="panel-head">
          <h2>Owed right now</h2>
          <span className="muted small">Every unpaid job across all years, the one that has waited longest first. The year tabs below do not change this list.</span>
        </div>
        {!owed.length ? (
          <p className="muted small tw-owed-empty">Nothing outstanding. Everyone is paid up.</p>
        ) : (
          <>
            <div className="tw-aging">
              {AGE_BUCKETS.map((b) => (
                <div key={b.key} className={`tw-age ${b.key}`}>
                  <span className="tw-age-label">{b.label}</span>
                  <strong>{money2(aging[b.key])}</strong>
                </div>
              ))}
              <div className="tw-age total">
                <span className="tw-age-label">All unpaid</span>
                <strong>{money2(owedTotal)}</strong>
              </div>
            </div>
            <ul className="plain tw-owed-list">
              {(allOwed ? owed : owed.slice(0, 8)).map(({ e, days, name }) => (
                <li key={e.id} className={`tw-owed-row ${ageBucket(days)}`}>
                  <span className="tw-age-dot" aria-hidden="true" />
                  <div className="tw-owed-main">
                    <strong>{name}</strong>
                    <span className="tw-owed-desc">{[e.client, e.description].filter(Boolean).join(' · ') || <span className="muted">No description</span>}</span>
                    <span className="muted small">{fmtDate(e.date, { day: 'numeric', month: 'short', year: 'numeric' })} · waiting {days} day{days === 1 ? '' : 's'}</span>
                  </div>
                  <div className="tw-owed-amount">{money2(e.amount)}</div>
                  <Button size="sm" variant="ghost" onClick={() => togglePaidEntry(update, e.id)}>Mark paid</Button>
                </li>
              ))}
            </ul>
            {owed.length > 8 && (
              <button className="link small tw-owed-more" onClick={() => setAllOwed((v) => !v)}>
                {allOwed ? 'Show less' : `Show all ${owed.length} unpaid jobs`}
              </button>
            )}
          </>
        )}
      </section>

      <div className="fin-hero">
        <div className="fin-card neg"><div className="fin-label">Owed in {year}</div><div className="fin-value">{money2(all.pending)}</div><div className="muted small">{all.open} unpaid job{all.open === 1 ? '' : 's'}</div></div>
        <div className="fin-card pos"><div className="fin-label">Paid to the team</div><div className="fin-value">{money2(all.paid)}</div><div className="muted small">in {year}</div></div>
        <div className="fin-card"><div className="fin-label">Total {year}</div><div className="fin-value">{money2(all.total)}</div><div className="muted small">{all.jobs} job{all.jobs === 1 ? '' : 's'} logged</div></div>
        <div className="fin-card"><div className="fin-label">People logging</div><div className="fin-value">{rows.filter((r) => r.t.jobs).length}</div><div className="muted small">of {people.length} with a work log</div></div>
      </div>
      <div className="toolbar">
        <div className="segmented small">{years.map((y) => <button key={y} className={year === y ? 'on' : ''} onClick={() => setYear(y)}>{y}</button>)}</div>
        <p className="muted small">Each member keeps their own list under My work. Here you see everyone, and you can mark jobs as paid on their behalf.</p>
      </div>
      <div className="tw-grid">
        {rows.map(({ u, t, allT }) => (
          <button key={u.id} className={`tw-card ${who === u.id ? 'on' : ''}`} onClick={() => setWho(who === u.id ? '' : u.id)}>
            <div className="tw-head"><strong>{u.name}</strong><span className="muted small">{t.jobs} job{t.jobs === 1 ? '' : 's'}</span></div>
            {/* Bar length compares this person with the biggest earner of the year; the split inside is their own paid vs pending. */}
            <div className="tw-bar" title={`${money2(t.total)} of ${money2(max)}, the most anyone logged in ${year}`}>
              <div className="tw-bar-fill" style={{ width: `${(t.total / max) * 100}%` }}>
                {t.paid > 0 && <span className="paid" style={{ flexGrow: t.paid }} />}
                {t.pending > 0 && <span className="pend" style={{ flexGrow: t.pending }} />}
              </div>
            </div>
            <div className="tw-nums"><span className="pend">{money2(t.pending)} pending</span><span className="paid">{money2(t.paid)} paid</span></div>
            {u.gone && <div className="muted small">not in the active team any more</div>}
            {allT.pending > t.pending && <div className="muted small">plus {money2(allT.pending - t.pending)} pending from other years</div>}
          </button>
        ))}
        {!people.length && <p className="muted">No teammates yet.</p>}
      </div>
      {sel && (
        <section className="panel tw-detail">
          <div className="panel-head"><h2>{sel.name}</h2><button className="link small" onClick={() => setWho('')}>Close</button></div>
          <WorkLogTable userId={sel.id} editable showHero={false} compact />
        </section>
      )}
    </div>
  )
}
