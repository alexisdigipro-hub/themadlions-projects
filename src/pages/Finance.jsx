import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { DOCS, EXPENSE_CATS, INCOME_CATS, METHODS, TX_STATUS, emptyTx, grossOf, matchTx, money, summarize, vatOf, yearOf } from '../lib/finance.js'
import { download, fmtDate } from '../lib/dates.js'

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
  const years = useMemo(() => [...new Set(fin.transactions.map((t) => yearOf(t.date)).filter(Boolean))].sort((a, b) => b - a), [fin.transactions])
  const [year, setYear] = useState(years[0] || new Date().getFullYear())
  const [tab, setTab] = useState('overview') // overview | transactions | settings
  const [draft, setDraft] = useState(null)
  const [f, setF] = useState({ q: '', type: '', project: '', status: '', doc: '', month: '' })
  const [settings, setSettings] = useState(fin.settings)

  if (me?.role !== 'admin') return <Navigate to="/" replace />

  const S = summarize(fin.transactions, { year, projects: state.projects })
  const taxEst = Math.max(0, Math.round(S.profit * (Number(fin.settings.taxRate || 0) / 100)))
  const maxMonth = Math.max(1, ...S.months.map((m) => Math.max(m.income, m.expense)))

  const listed = fin.transactions
    .filter((t) => yearOf(t.date) === year)
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
      // mirror expenses into the project budget actuals
      if (tx.projectId && tx.type === 'expense' && tx.syncBudget !== false) {
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
    s.projects.forEach((p) => { if (p.budget?.lines) p.budget.lines = p.budget.lines.filter((l) => l.txId !== tx.id) })
    return s
  })
  const setStatus = (tx, status) => update((s) => {
    const t = s.finance.transactions.find((x) => x.id === tx.id)
    if (t) { t.status = status; if (status === 'paid' && !t.paidOn) t.paidOn = new Date().toISOString().slice(0, 10) }
    return s
  })
  const saveSettings = () => {
    update((s) => { s.finance.settings = { ...s.finance.settings, ...settings, vatDefault: Number(settings.vatDefault) || 0, taxRate: Number(settings.taxRate) || 0 }; return s })
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
          {[['overview', 'Overview'], ['transactions', 'Transactions'], ['settings', 'Settings']].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <Select className="compact" value={year} onChange={(e) => setYear(Number(e.target.value))} options={[...new Set([...years, new Date().getFullYear()])].sort((a, b) => b - a).map((y) => [y, String(y)])} />
        <Button variant="ghost" onClick={() => setDraft(emptyTx('income', { vatPct: fin.settings.vatDefault }))}>Add income</Button>
        <Button variant="primary" onClick={() => setDraft(emptyTx('expense', { vatPct: fin.settings.vatDefault }))}>Add expense</Button>
      </PageHead>

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
              <div className="fin-value">{money(S.weOwe, cur)}</div>
              <div className="fin-sub">{S.weOweCount} bill{S.weOweCount === 1 ? '' : 's'} to pay (gross)</div>
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
                        <button onClick={() => setDraft({ ...t, id: uid(), date: new Date().toISOString().slice(0, 10), status: t.type === 'income' ? 'invoiced' : 'pending', paidOn: '', docNumber: '' })}>Copy</button>
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

      {tab === 'settings' && (
        <section className="panel fin-settings">
          <h2>Finance settings</h2>
          <div className="row-3">
            <Field label="Currency"><Select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} options={['EUR', 'USD', 'GBP']} /></Field>
            <Field label="Default VAT %"><Input type="number" min="0" max="30" value={settings.vatDefault} onChange={(e) => setSettings({ ...settings, vatDefault: e.target.value })} /></Field>
            <Field label="Income tax estimate %" hint="Applied to the year's profit for the estimate on the overview."><Input type="number" min="0" max="60" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })} /></Field>
          </div>
          <div className="row-actions"><Button variant="primary" onClick={saveSettings}>Save</Button></div>
          <p className="fineprint">Finance is stored in its own table that only administrators can read. Expenses tied to a project also appear as actuals in that project's budget.</p>
        </section>
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
              <label className="check"><input type="checkbox" checked={draft.syncBudget !== false} onChange={(e) => setDraft({ ...draft, syncBudget: e.target.checked })} /> Show as an actual cost in the project budget</label>
            )}
            <Field label="Notes"><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
