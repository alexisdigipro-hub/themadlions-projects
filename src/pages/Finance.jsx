import { useEffect, useMemo, useRef, useState } from 'react'
import { useArrowTabs } from '../lib/arrowTabs.js'
import { Link, Navigate } from 'react-router-dom'
import { Act, Button, Confirm, Empty, Field, Input, Modal, Select, Stat, Textarea, useToast } from '../components/ui.jsx'
import { today, uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { DOCS, FREQ, METHODS, TX_STATUS, catsFor, duePeriods, emptyRecurring, emptyTx, expenseCats, financeCategoryUses, fiscalYearLabel, fiscalYearOf, generateFromRecurring, grossOf, incomeCats, matchTx, money, renameFinanceCategory, summarize, vatOf, ym } from '../lib/finance.js'
import { download, fmtDate } from '../lib/dates.js'
import PaymentModal from '../components/PaymentModal.jsx'
import { lineBalance, lineEstimate, linePaid, payeeOf, syncLineWorklog } from '../lib/budget.js'
import { budgetCatForFin, finCatFor } from '../lib/budgetCats.js'
import { projectWorkDate } from '../components/WorkLog.jsx'
import { InvoiceProfileSettings, InvoicesTab } from '../components/Invoices.jsx'
import { invoiceTotals } from '../lib/invoice.js'
import { ReceiptView } from '../components/Receipt.jsx'
import { Grip, moveItem, useDragSort } from '../components/DragSort.jsx'
import { FinancePinGate, FinancePinSettings } from '../components/FinancePin.jsx'

/* The tabs, a glass capsule like the Database's (Alex, 10 Oct): Overview, Invoices (back in Finance, out
   of the side menu), Transactions, Team, then the year and Settings on their own at the end. Recurring
   is no longer a tab: it opens from Transactions, whose tab stays lit while it is open. */
/* Finance rebuilt (Alex, 26 Nov: "very confusing, Team and Crew & Cast especially; build it again"):
   Overview (the year in three numbers, month by month, what we are owed and what we owe), Projects
   (one line a project), People (everyone we pay, members, crew and cast, in one place, read from the
   budgets), Transactions (only money that really moved), Invoices. One rule for the year everywhere:
   a project counts in the year of its shoot day; what is owed, either way, counts whatever the year. */
const FIN_TABS = [['overview', 'Overview'], ['projects', 'Projects'], ['people', 'People'], ['transactions', 'Transactions'], ['invoices', 'Invoices']]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/* Finance behind its PIN, when the administrator has set one (Alex, 14 Nov; components/FinancePin.jsx) */
export default function Finance(props) {
  return <FinancePinGate><FinancePage {...props} /></FinancePinGate>
}

function FinancePage({ start }) {
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const fin = state.finance
  const tabsRow = useRef(null) // ← / → step through the tabs on a computer (Alex, 27 Oct)
  // the tabs' row and the Overview's four tiles stay at the top while the rest scrolls under them (Alex, 29 Oct), on a
  // computer: once their place has scrolled away they sit on a glass band (.stuck)
  const headMark = useRef(null)
  const [headStuck, setHeadStuck] = useState(false)
  useEffect(() => {
    const el = headMark.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => setHeadStuck(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useArrowTabs(tabsRow)
  const [viewReceipt, setViewReceipt] = useState(null)
  // the receipt photographed for an expense: on the budget line it pays, or kept on the expense itself
  const receiptOf = (t) => (t.budgetLineId && state.projects.find((p) => p.id === t.projectId)?.budget?.lines?.find((l) => l.id === t.budgetLineId)?.receipt) || t.receipt || null
  const cur = fin.settings.currency || 'EUR'
  // The financial year can start in a month other than January (Finance settings), so every
  // year grouping on this page goes through fiscalYearOf rather than slicing the date.
  const fiscalStart = Number(fin.settings.fiscalYearStart) || 1
  const fyLabel = (y) => fiscalYearLabel(y, fiscalStart)
  const years = useMemo(() => [...new Set(fin.transactions.map((t) => fiscalYearOf(t.date, fiscalStart)).filter(Boolean))].sort((a, b) => b - a), [fin.transactions, fiscalStart])
  const [year, setYear] = useState(years[0] || new Date().getFullYear())
  // 'all' is All time (Alex: every year added up). Everything on this page that picks a year asks
  // inSel(date), so the tiles, the tables and the transactions list all follow the one choice.
  const allTime = year === 'all'
  const inSel = (d) => allTime || fiscalYearOf(d, fiscalStart) === year
  const yearText = allTime ? 'all time' : fyLabel(year)
  const [tab, setTab] = useState(start === 'team' || start === 'crew' ? 'people' : start || 'overview') // overview | invoices | transactions | recurring | team | settings
  const [draft, setDraft] = useState(null)
  const [f, setF] = useState({ q: '', type: '', project: '', status: '', doc: '', month: '' })
  const [settings, setSettings] = useState(fin.settings)
  const [rdraft, setRdraft] = useState(null)
  const [pay, setPay] = useState(null) // { project, line }
  const [pKind, setPKind] = useState('') // People: '' | member | crew | cast
  const [pShow, setPShow] = useState('owed') // People: owed | all
  const [pWho, setPWho] = useState('')
  const [prOpen, setPrOpen] = useState(false) // Projects: only those with money still open
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

  // VAT from the real transactions of the year
  const S = summarize(fin.transactions, { year: allTime ? null : year, projects: state.projects, fiscalStart })
  const sumOf = (l, f = (t) => Number(t.net || 0)) => l.reduce((a, t) => a + f(t), 0)
  /* A teammate who marked their fee paid in their own My Finance: the budget shows it settled ("marked by them"),
     so Finance does too, until the company records a payment that takes over (Alex, 26 Nov, Άγγελος). */
  const selfPaidIds = new Set((state.worklog || []).filter((e) => e.budgetLineId && e.status === 'paid').map((e) => e.budgetLineId))
  const selfPaid = (l) => !l.payments?.length && !!l.memberId && selfPaidIds.has(l.id)
  const paidOf = (l) => (selfPaid(l) ? lineEstimate(l) : linePaid(l))
  const owedOf = (l) => (selfPaid(l) ? 0 : lineBalance(l))

  /* Each project's money, the one source for Overview, Projects and People. Fee: the project's budget
     (what the client pays) or what was invoiced, whichever is more. Collected: income marked paid.
     Costs: expenses paid, plus what is still owed on budget lines and on unpaid expenses. */
  const txByProject = {}
  fin.transactions.forEach((t) => { if (t.projectId) (txByProject[t.projectId] = txByProject[t.projectId] || []).push(t) })
  const projRows = state.projects.map((p) => {
    const tx = txByProject[p.id] || []
    const inc = tx.filter((t) => t.type === 'income' && t.status !== 'quoted')
    const exp = tx.filter((t) => t.type === 'expense')
    const fee = Math.max(Number(p.budget?.cap) || 0, sumOf(inc))
    const collected = sumOf(inc.filter((t) => t.status === 'paid'))
    // a budget line counts what was agreed (or paid, if more); an expense not tied to a line counts on its own
    const lines = (p.budget?.lines || []).filter((l) => !l.txId && l.category !== 'Contingency')
    const loose = exp.filter((t) => !t.budgetLineId)
    const costs = lines.reduce((a, l) => a + Math.max(lineEstimate(l), paidOf(l)), 0) + sumOf(loose)
    const toPay = lines.reduce((a, l) => a + owedOf(l), 0) + sumOf(loose.filter((t) => t.status !== 'paid'))
    const paidOut = costs - toPay
    return { p, date: projectWorkDate(p) || p.startDate || '', fee, collected, toCollect: Math.max(0, fee - collected), paidOut, toPay, costs, profit: fee - costs }
  })
  const company = fin.transactions.filter((t) => !t.projectId)
  const companyIn = company.filter((t) => t.type === 'income' && t.status !== 'quoted')
  const companyOut = company.filter((t) => t.type === 'expense')
  // a teammate's own job in My Finance that no budget line pays: money we owe beyond the budgets
  const salaried = new Set(state.users.filter((u) => u.permissions?.salaried).map((u) => u.id))
  const admins = new Set(state.users.filter((u) => u.role === 'admin').map((u) => u.id))
  const ownJobs = (state.worklog || []).filter((e) => !e.budgetLineId && Number(e.amount) > 0 && !salaried.has(e.userId) && !admins.has(e.userId))
  const yearProj = projRows.filter((r) => inSel(r.date))
  const incomeAll = sumOf(yearProj, (r) => r.fee) + sumOf(companyIn.filter((t) => inSel(t.date)))
  const expenseAll = sumOf(yearProj, (r) => r.costs) + sumOf(companyOut.filter((t) => inSel(t.date))) + sumOf(ownJobs.filter((e) => inSel(e.date)), (e) => Number(e.amount))
  const profitAll = incomeAll - expenseAll
  // The bars: the twelve months of the year shown, or for All time one bar per year
  const barOf = (keyOf) => {
    const m = {}
    const add = (k, kind, v) => { if (!k) return; m[k] = m[k] || { income: 0, expense: 0 }; m[k][kind] += v }
    projRows.forEach((r) => { add(keyOf(r.date), 'income', r.fee); add(keyOf(r.date), 'expense', r.costs) })
    companyIn.forEach((t) => add(keyOf(t.date), 'income', Number(t.net || 0)))
    companyOut.forEach((t) => add(keyOf(t.date), 'expense', Number(t.net || 0)))
    ownJobs.forEach((e) => add(keyOf(e.date), 'expense', Number(e.amount || 0)))
    return m
  }
  const bars = allTime
    ? (() => { const m = barOf((d) => (d ? String(fiscalYearOf(d, fiscalStart)) : '')); return Object.keys(m).sort().map((k) => ({ key: k, label: fyLabel(Number(k)), ...m[k] })) })()
    : (() => { const m = barOf((d) => (d && fiscalYearOf(d, fiscalStart) === year ? ym(d) : '')); return Array.from({ length: 12 }, (_, i) => { const mi = ((fiscalStart - 1 + i) % 12) + 1; const k = `${fiscalStart > 1 && mi < fiscalStart ? year + 1 : year}-${String(mi).padStart(2, '0')}`; return { key: k, label: MONTHS[mi - 1], ...(m[k] || { income: 0, expense: 0 }) } }) })()
  const maxMonth = Math.max(1, ...bars.map((m) => Math.max(m.income, m.expense)))

  /* Everyone we pay, in one place: members, crew and cast. Read from every budget line with a payee
     (a member by memberId, anyone else by their Database entry or name), plus a member's own jobs in
     My Finance that no line pays. Owed counts every year. */
  const people = (() => {
    const lib = new Map((state.library?.contacts || []).map((c) => [c.id, c]))
    const map = new Map()
    const get = (key, base) => { if (!map.has(key)) map.set(key, { key, rows: [], agreed: 0, paid: 0, balance: 0, ...base }); return map.get(key) }
    const push = (r, row) => { r.rows.push(row); r.agreed += row.agreed; r.paid += row.paid; r.balance += row.balance }
    for (const p of state.projects) {
      for (const l of p.budget?.lines || []) {
        if (l.txId || l.category === 'Contingency') continue
        const agreed = lineEstimate(l)
        if (!(agreed > 0)) continue
        const date = l.date || projectWorkDate(p) || ''
        const row = { project: p, line: l, what: l.description || l.category, agreed, paid: paidOf(l), balance: owedOf(l), date, self: selfPaid(l) }
        if (l.memberId) {
          const u = state.users.find((x) => x.id === l.memberId)
          // an administrator is the company, not someone it pays (Alex, 26 Nov: "take me out, I am the company")
          if (u?.role === 'admin') continue
          push(get(`u:${l.memberId}`, { name: u?.name || payeeOf(l) || 'Teammate', role: u?.profile?.position || '', kind: 'member' }), row)
          continue
        }
        const c = l.contactId ? (p.contacts || []).find((x) => x.id === l.contactId) : null
        const name = (c?.name || payeeOf(l) || '').trim()
        if (!name) continue
        const le = c?.libraryId ? lib.get(c.libraryId) : null
        const kind = (c?.kind || le?.kind || (/cast/i.test(l.category || '') ? 'cast' : 'crew')) === 'cast' ? 'cast' : 'crew'
        push(get(le ? `lib:${le.id}` : `n:${name.toLowerCase()}`, { name: le?.name || name, role: le?.role || c?.role || '', kind }), row)
      }
    }
    for (const e of ownJobs) {
      const u = state.users.find((x) => x.id === e.userId)
      const done = e.status === 'paid'
      push(get(`u:${e.userId}`, { name: u?.name || 'Former teammate', role: u?.profile?.position || '', kind: 'member' }),
        { job: e, project: state.projects.find((x) => x.id === e.projectId), what: e.description || e.client || 'Job', agreed: Number(e.amount), paid: done ? Number(e.amount) : 0, balance: done ? 0 : Number(e.amount), date: e.date || '' })
    }
    return [...map.values()].map((r) => ({ ...r, rows: r.rows.sort((a, b) => (b.balance > 0) - (a.balance > 0) || String(b.date).localeCompare(String(a.date))) }))
  })()
  const toPayList = [
    ...people.filter((r) => r.balance > 0).map((r) => ({ key: r.key, name: r.name, sub: r.kind === 'member' ? 'Team' : r.kind === 'cast' ? 'Cast' : 'Crew', amount: r.balance, person: r.key })),
    ...Object.entries(fin.transactions.filter((t) => t.type === 'expense' && t.status !== 'paid' && !t.budgetLineId).reduce((m, t) => { const k = t.party || t.description || 'Expense'; m[k] = (m[k] || 0) + Number(t.net || 0); return m }, {}))
      .map(([k, v]) => ({ key: `tx:${k}`, name: k, sub: 'Unpaid expense', amount: v })),
  ].filter((x) => x.amount > 0).sort((a, b) => b.amount - a.amount)
  const toCollectList = [
    ...projRows.filter((r) => r.toCollect > 0).map((r) => ({ key: r.p.id, name: r.p.title, sub: r.collected ? `${money(r.collected, cur)} of ${money(r.fee, cur)} in` : r.date ? fmtDate(r.date) : '', amount: r.toCollect, projectId: r.p.id })),
    ...companyIn.filter((t) => t.status === 'invoiced').map((t) => ({ key: t.id, name: t.party || t.description, sub: 'Invoice', amount: Number(t.net || 0) })),
  ].sort((a, b) => b.amount - a.amount)
  const weAreOwed = sumOf(toCollectList, (x) => x.amount)
  const weOwe = sumOf(toPayList, (x) => x.amount)
  const markJobPaid = (e) => update((s) => { const x = (s.worklog || []).find((w) => w.id === e.id); if (x) { x.status = 'paid'; x.paidDate = today() } return s })

  const listed = fin.transactions
    .filter((t) => inSel(t.date))
    .filter((t) => (f.type ? t.type === f.type : true))
    .filter((t) => (f.project ? t.projectId === f.project : true))
    .filter((t) => (f.status ? t.status === f.status : true))
    .filter((t) => (f.doc ? t.doc === f.doc : true))
    .filter((t) => (f.month ? t.date.slice(5, 7) === f.month : true))
    .filter((t) => matchTx(t, f.q))
    .sort((a, b) => b.date.localeCompare(a.date))
  const listedAll = listed

  /* Picking a project in the transaction form fills what the project knows. Only fields that are
     empty, or still hold the previous project's fill, are touched: typed text stays. */
  const pickProject = (d, projectId) => {
    const prev = state.projects.find((p) => p.id === d.projectId)
    const next = state.projects.find((p) => p.id === projectId)
    const out = { ...d, projectId, budgetLineId: '', syncBudget: true }
    if (!next) return out
    const free = (val, was) => !val || (prev && val === was)
    if (d.type === 'income') {
      if (free(d.party, prev ? prev.client || prev.title : '')) out.party = next.client || next.title
      if (free(d.description, prev?.title)) out.description = next.title
    }
    if (!d.date || d.date === today() || (prev && d.date === projectWorkDate(prev))) out.date = projectWorkDate(next) || d.date
    return out
  }
  /* Picking a budget line fills the expense from the line: what it is, who is paid, which Finance
     column, and the open balance as the amount. */
  const pickLine = (d, lineId) => {
    const p = state.projects.find((x) => x.id === d.projectId)
    const prevLine = p?.budget?.lines?.find((l) => l.id === d.budgetLineId)
    const line = p?.budget?.lines?.find((l) => l.id === lineId)
    const out = { ...d, budgetLineId: lineId, syncBudget: !lineId }
    if (!line) return out
    const free = (val, was) => !val || (prevLine && val === was)
    if (free(d.description, prevLine?.description)) out.description = line.description
    if (free(d.party, prevLine ? payeeOf(prevLine) : '')) out.party = payeeOf(line)
    if (free(d.net, prevLine ? String(lineBalance(prevLine)) : '') || Number(d.net) === 0) out.net = String(lineBalance(line) || lineEstimate(line))
    out.category = finCatFor(state.settings, line.category)
    return out
  }
  // Invoices already sent (Finance > Invoices) that an income transaction can link to, so the
  // amount and recipient are not typed twice. One already linked to a transaction drops off the
  // list for every other transaction, the same way a budget line does once paid against.
  const invoiceOptions = (fin.invoices || []).filter((inv) => inv.status === 'invoiced' && (inv.id === draft?.invoiceId || !fin.transactions.some((t) => t.invoiceId === inv.id && t.id !== draft?.id)))
  const pickInvoice = (d, invoiceId) => {
    const inv = (fin.invoices || []).find((x) => x.id === invoiceId)
    const out = { ...d, invoiceId }
    if (!inv) return out
    const t = invoiceTotals(inv)
    out.projectId = inv.projectId || d.projectId
    out.description = inv.lines?.[0]?.description || `Invoice #${inv.number}`
    out.party = inv.recipient?.name || d.party
    out.net = String(t.net)
    out.vatPct = inv.vatPct || 0
    out.doc = 'invoice'
    out.docNumber = inv.number
    return out
  }
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
          line.payments = [...(line.payments || []).filter((x) => x.txId !== tx.id), { txId: tx.id, date: tx.date, amount: tx.net, method: tx.method }]
          line.actual = linePaid(line)
          syncLineWorklog(s, p, line)
        }
      }
      // mirror other expenses into the project budget as new actuals
      if (tx.projectId && tx.type === 'expense' && !tx.budgetLineId && tx.syncBudget !== false) {
        const p = s.projects.find((x) => x.id === tx.projectId)
        if (p) {
          p.budget = p.budget || { lines: [], contingencyPct: 10, currency: 'EUR', cap: '' }
          const existing = p.budget.lines.find((l) => l.txId === tx.id)
          const line = { id: existing?.id || uid(), txId: tx.id, category: budgetCatForFin(s.settings, tx.category), description: tx.description, qty: 1, unit: 'flat', rate: 0, estimate: existing?.estimate ?? '', actual: tx.net, vendor: tx.party, notes: existing?.notes || 'From Finance' }
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
        if (l.payments?.some((x) => x.txId === tx.id)) { l.payments = l.payments.filter((x) => x.txId !== tx.id); l.actual = linePaid(l); syncLineWorklog(s, p, l) }
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
    // only the four fields of this form: the category lists below save on their own and must not be overwritten by this copy
    update((s) => { s.finance.settings = { ...s.finance.settings, currency: settings.currency, vatDefault: Number(settings.vatDefault) || 0, taxRate: Number(settings.taxRate) || 0, fiscalYearStart: Number(settings.fiscalYearStart) || 1 }; return s })
    toast('Finance settings saved', 'ok')
  }
  const exportCSV = () => {
    const head = ['Date', 'Type', 'Project', 'Category', 'Description', 'Client / vendor', 'Net', 'VAT %', 'VAT', 'Gross', 'Status', 'Document', 'Doc number', 'Method', 'Paid on', 'Notes']
    const pById = Object.fromEntries(state.projects.map((p) => [p.id, p.title]))
    const rows = listed.map((t) => [t.date, t.type, pById[t.projectId] || '', t.category, t.description, t.party, t.net, t.vatPct, vatOf(t), grossOf(t), t.status, t.doc, t.docNumber, t.method, t.paidOn, t.notes])
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    download(`finance-${allTime ? 'all-time' : year}.csv`, '\uFEFF' + csv, 'text/csv')
  }

  const pName = (id) => state.projects.find((p) => p.id === id)?.title || ''

  const addActs = (
    <>
      <Act icon="income" label="Add income" onClick={() => setDraft(emptyTx('income', { vatPct: fin.settings.vatDefault }))} />
      <Act icon="expense" label="Add expense" main onClick={() => setDraft(emptyTx('expense', { vatPct: fin.settings.vatDefault }))} />
    </>
  )

  return (
    <div className="finance">
      <span ref={headMark} className="fin-head-mark" aria-hidden="true" />
      <div className={`fin-head${headStuck ? ' stuck' : ''}${tab === 'overview' ? ' with-hero' : ''}`}>
      <div className="db-top fin-top">
        <nav className="tabs db-tabs" ref={tabsRow}>
          {FIN_TABS.map(([k, l]) => (
            <button key={k} type="button" className={tab === k || (k === 'transactions' && tab === 'recurring') ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>
        <Select className="fin-year" value={year} onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))} options={[...[...new Set([...years, new Date().getFullYear()])].sort((a, b) => b - a).map((y) => [y, fyLabel(y)]), ['all', 'All time']]} aria-label="Year" />
        <nav className="tabs db-tabs fin-set">
          <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</button>
        </nav>
        {/* no page title (Alex, 15 Oct: more room): Add income / Add expense at the end of the tabs' line,
            round icons beside the year and Settings on a phone */}
        <div className="fin-acts">{addActs}</div>
      </div>
      {tab === 'overview' && (
      <div className="fin-hero">
        <div className="fin-card">
          <div className="fin-label">Income {yearText}</div>
          <div className="fin-value">{money(incomeAll, cur)}</div>
        </div>
        <div className="fin-card">
          <div className="fin-label">Expenses {yearText}</div>
          <div className="fin-value">{money(expenseAll, cur)}</div>
        </div>
        <div className={`fin-card ${profitAll < 0 ? 'neg' : 'pos'}`}>
          <div className="fin-label">Profit {yearText}</div>
          <div className="fin-value">{money(profitAll, cur)}</div>
        </div>
      </div>
      )}
      </div>

      {dueCount > 0 && tab !== 'recurring' && (
        <p className="notice fin-due">
          {dueCount} recurring item{dueCount === 1 ? '' : 's'} due (rent, salaries, subscriptions) not yet booked.
          <button className="link" onClick={generateDue}>Book them now</button>
        </p>
      )}

      {tab === 'overview' && (
        <div className="fin-overview">
          <section className="panel">
            <div className="panel-head"><h2>{allTime ? 'Year by year' : `Month by month ${yearText}`}</h2><span className="muted small">a project counts in the month of its shoot day</span></div>
            <div className="fin-months" style={allTime ? { gridTemplateColumns: `repeat(${bars.length}, minmax(0, 120px))`, justifyContent: 'space-around' } : undefined}>
              {bars.map((m) => (
                <div key={m.key} className="fin-month" title={`${m.label}: ${money(m.income, cur)} in, ${money(m.expense, cur)} out`}>
                  <div className="fin-bars">
                    <div className="fin-bar in" style={{ height: `${(m.income / maxMonth) * 100}%` }} />
                    <div className="fin-bar out" style={{ height: `${(m.expense / maxMonth) * 100}%` }} />
                  </div>
                  <div className="fin-month-label">{m.label}</div>
                  <div className={`fin-month-net small ${m.income - m.expense < 0 ? 'over' : ''}`}>{m.income || m.expense ? money(m.income - m.expense, cur) : ''}</div>
                </div>
              ))}
            </div>
            <div className="legend small muted"><span className="sw in" /> income <span className="sw out" /> expenses</div>
          </section>

          <div className="fo-owed">
            <section className="panel fo-list">
              <div className="panel-head"><h2>To collect</h2><strong className="fo-total pos">{money(weAreOwed, cur)}</strong></div>
              <p className="muted small fo-note">What clients still owe us, every year</p>
              {!toCollectList.length ? <p className="muted small">Nothing to collect.</p> : toCollectList.slice(0, 8).map((x) => (
                <button key={x.key} type="button" className="fo-row" onClick={() => { if (x.projectId) { setPrOpen(true); setTab('projects') } else setTab('transactions') }}>
                  <span className="fo-name"><strong>{x.name}</strong><span className="muted small">{x.sub}</span></span>
                  <span className="fo-amt">{money(x.amount, cur)}</span>
                </button>
              ))}
              {toCollectList.length > 8 && <Button size="sm" variant="ghost" onClick={() => { setPrOpen(true); setTab('projects') }}>All {toCollectList.length}</Button>}
            </section>
            <section className="panel fo-list">
              <div className="panel-head"><h2>To pay</h2><strong className="fo-total neg">{money(weOwe, cur)}</strong></div>
              <p className="muted small fo-note">What we still owe people and suppliers, every year</p>
              {!toPayList.length ? <p className="muted small">Everyone is paid.</p> : toPayList.slice(0, 8).map((x) => (
                <button key={x.key} type="button" className="fo-row" onClick={() => { if (x.person) { setPWho(x.person); setPShow('owed'); setPKind(''); setTab('people') } else setTab('transactions') }}>
                  <span className="fo-name"><strong>{x.name}</strong><span className="muted small">{x.sub}</span></span>
                  <span className="fo-amt">{money(x.amount, cur)}</span>
                </button>
              ))}
              {toPayList.length > 8 && <Button size="sm" variant="ghost" onClick={() => { setPShow('owed'); setTab('people') }}>All {toPayList.length}</Button>}
            </section>
          </div>
          {S.vatIn + S.vatOut > 0 && <p className="muted small fo-vat">VAT {allTime ? 'over all time' : yearText}: {money(S.vatIn, cur)} collected, {money(S.vatOut, cur)} paid, balance {money(S.vatBalance, cur)}</p>}
        </div>
      )}

      {tab === 'transactions' && (
        <>
          <div className="toolbar">
            <div className="toolbar-info"><strong>{listed.length} transaction{listed.length === 1 ? '' : 's'}</strong><span className="muted">{money(listed.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.net), 0), cur)} in · {money(listed.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.net), 0), cur)} out (net) · only money that moved; what is owed is in People and Projects</span></div>
            <div className="toolbar-actions">
              <Input className="input search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search" />
              <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={[['', 'Income & expense'], ['income', 'Income'], ['expense', 'Expense']]} />
              <Select value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} options={[['', 'All months'], ...MONTHS.map((m, i) => [String(i + 1).padStart(2, '0'), m])]} />
              <Select value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })} options={[['', 'All projects'], ...state.projects.map((p) => [p.id, p.title])]} />
              <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={[['', 'Any status'], ['quoted', 'Quoted'], ['invoiced', 'Invoiced'], ['pending', 'To pay'], ['paid', 'Paid']]} />
              <Select value={f.doc} onChange={(e) => setF({ ...f, doc: e.target.value })} options={[['', 'Any document'], ...DOCS]} />
              <Button variant="ghost" onClick={exportCSV}>Export CSV</Button>
              <Button variant="ghost" onClick={() => setTab('recurring')}>Recurring{dueCount ? ` (${dueCount} due)` : ''}</Button>
            </div>
          </div>
          {!listedAll.length ? (
            <Empty title="Nothing here">Add a transaction or change the filters.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table fin-list">
                <thead><tr><th>Date</th><th>Description</th><th>Project</th><th>Category</th><th className="num">Net</th><th className="num">VAT</th><th className="num">Gross</th><th>Doc</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {listedAll.map((t) => (
                    <tr key={t.id} className={`tx-${t.type}`}>
                      <td className="nowrap">{fmtDate(t.date, { day: 'numeric', month: 'short' })}</td>
                      <td><strong>{t.description}</strong>{receiptOf(t) && <button type="button" className="receipt-chip" onClick={() => setViewReceipt(receiptOf(t))} title="Open the receipt">🧾<span>Receipt</span></button>}{t.party && <div className="muted small">{t.party}{t.docNumber ? ` · ${t.docNumber}` : ''}</div>}</td>
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

      {tab === 'invoices' && <InvoicesTab />}

      {tab === 'projects' && (() => {
        const list = yearProj.filter((r) => !prOpen || r.toCollect > 0 || r.toPay > 0).sort((a, b) => String(b.date).localeCompare(String(a.date)))
        const tot = (k) => sumOf(list, (r) => r[k])
        return (
          <div className="fin-projects">
            <div className="toolbar fp-bar">
              <div className="segmented small">{[[false, 'All'], [true, 'Money still open']].map(([k, l]) => <button key={l} className={prOpen === k ? 'on' : ''} onClick={() => setPrOpen(k)}>{l}</button>)}</div>
              <span className="muted small">{list.length} project{list.length === 1 ? '' : 's'} {yearText}</span>
            </div>
            <div className="fp-head small muted"><span>Project</span><span>Fee</span><span>Costs</span><span>Profit</span><span>To collect</span><span>To pay</span></div>
            <div className="fp-row fp-total">
              <span className="fp-name"><strong>Total</strong></span>
              <span data-l="Fee">{money(tot('fee'), cur)}</span><span data-l="Costs">{money(tot('costs'), cur)}</span>
              <span data-l="Profit" className={tot('profit') < 0 ? 'over' : 'under'}>{money(tot('profit'), cur)}</span>
              <span data-l="To collect">{tot('toCollect') ? money(tot('toCollect'), cur) : ''}</span><span data-l="To pay" className="over">{tot('toPay') ? money(tot('toPay'), cur) : ''}</span>
            </div>
            {!list.length ? <Empty title="Nothing here">{prOpen ? 'Every project of this year is settled both ways.' : 'No project has its shoot day in this year.'}</Empty> : list.map((r) => (
              <Link key={r.p.id} to={`/p/${r.p.id}/budget`} className="fp-row" style={{ '--pc': r.p.color }}>
                <span className="fp-name"><strong>{r.p.title}</strong><span className="muted small">{[r.p.code, r.date ? fmtDate(r.date) : ''].filter(Boolean).join(' · ')}</span></span>
                <span data-l="Fee">{r.fee ? money(r.fee, cur) : ''}</span>
                <span data-l="Costs">{r.costs ? money(r.costs, cur) : ''}</span>
                <span data-l="Profit" className={r.profit < 0 ? 'over' : 'under'}>{r.fee || r.costs ? money(r.profit, cur) : ''}</span>
                <span data-l="To collect">{r.toCollect ? money(r.toCollect, cur) : ''}</span>
                <span data-l="To pay" className="over">{r.toPay ? money(r.toPay, cur) : ''}</span>
              </Link>
            ))}
          </div>
        )
      })()}

      {tab === 'people' && (() => {
        const ofKind = people.filter((r) => !pKind || r.kind === pKind)
        const list = ofKind.filter((r) => pShow === 'all' || r.balance > 0).sort((a, b) => b.balance - a.balance || b.agreed - a.agreed || a.name.localeCompare(b.name))
        const max = Math.max(1, ...list.map((r) => (pShow === 'all' ? r.agreed : r.balance)))
        const sel = people.find((r) => r.key === pWho)
        const openN = (r) => r.rows.filter((x) => x.balance > 0).length
        return (
          <div className="teamwork fin-people">
            <div className="fin-hero">
              <div className="fin-card neg"><div className="fin-label">We owe</div><div className="fin-value">{money(sumOf(ofKind, (r) => r.balance), cur)}</div><div className="muted small">{ofKind.filter((r) => r.balance > 0).length} people, every year</div></div>
              <div className="fin-card pos"><div className="fin-label">Paid</div><div className="fin-value">{money(sumOf(ofKind, (r) => r.paid), cur)}</div><div className="muted small">every year</div></div>
            </div>
            <div className="toolbar cc-bar">
              <div className="segmented small">{[['', 'Everyone'], ['member', 'Team'], ['crew', 'Crew'], ['cast', 'Cast']].map(([k, l]) => <button key={k} className={pKind === k ? 'on' : ''} onClick={() => setPKind(k)}>{l}</button>)}</div>
              <div className="segmented small">{[['owed', 'Owed'], ['all', 'All']].map(([k, l]) => <button key={k} className={pShow === k ? 'on' : ''} onClick={() => setPShow(k)}>{l}</button>)}</div>
            </div>
            <div className="tw-grid">
              {list.map((r) => (
                <button key={r.key} className={`tw-card ${pWho === r.key ? 'on' : ''}`} onClick={() => setPWho(pWho === r.key ? '' : r.key)}>
                  <div className="tw-head"><strong>{r.name}</strong><span className="muted small">{r.kind === 'member' ? 'Team' : r.kind === 'cast' ? 'Cast' : 'Crew'}</span></div>
                  {r.role && <div className="muted small cc-role">{r.role}</div>}
                  <div className="tw-total">{money(r.balance, cur)}</div>
                  <div className="tw-bar">
                    <div className="tw-bar-fill" style={{ width: `${((pShow === 'all' ? r.agreed : r.balance) / max) * 100}%` }}>
                      {r.paid > 0 && <span className="paid" style={{ flexGrow: r.paid }} />}
                      {r.balance > 0 && <span className="pend" style={{ flexGrow: r.balance }} />}
                    </div>
                  </div>
                  <div className="tw-nums"><span className="pend">{money(r.balance, cur)} owed</span><span className="paid">{money(r.paid, cur)} paid</span></div>
                </button>
              ))}
              {!list.length && <p className="muted">{pShow === 'owed' ? 'Nothing owed. Everyone is paid.' : 'Nobody in the budgets yet.'}</p>}
            </div>
            {sel && (
              <section className="panel tw-detail">
                <div className="panel-head"><h2>{sel.name}</h2><Button size="sm" variant="ghost" onClick={() => setPWho('')}>Close</Button></div>
                <div className="stats">
                  <Stat label="Owed" value={money(sel.balance, cur)} note={`${openN(sel)} open`} />
                  <Stat label="Paid" value={money(sel.paid, cur)} />
                  <Stat label="Jobs" value={String(sel.rows.length)} note={`${new Set(sel.rows.map((x) => x.project?.id).filter(Boolean)).size} projects`} />
                </div>
                <div className="table-wrap">
                  <table className="table fin-table">
                    <thead><tr><th>Project</th><th>Date</th><th>What</th><th className="num">Agreed</th><th className="num">Paid</th><th className="num">Balance</th><th /></tr></thead>
                    <tbody>
                      {sel.rows.map((x, i) => (
                        <tr key={x.line?.id || x.job?.id || i}>
                          <td className="small">{x.project ? <Link to={`/p/${x.project.id}/budget`}>{x.project.title}</Link> : <span className="muted">{x.job?.client || ''}</span>}</td>
                          <td className="small nowrap">{x.date ? fmtDate(x.date) : ''}</td>
                          <td>{x.what}{x.job && <div className="muted small">own job in My Finance</div>}</td>
                          <td className="num">{money(x.agreed, cur)}</td>
                          <td className="num">{x.paid ? money(x.paid, cur) : ''}{x.self && <div className="muted small">marked by them</div>}</td>
                          <td className={`num${x.balance > 0 ? ' over' : ''}`}>{x.balance ? money(x.balance, cur) : ''}</td>
                          <td className="row-actions">{x.balance > 0 && (x.line ? <Button size="sm" onClick={() => setPay({ project: x.project, line: x.line })}>Record payment</Button> : <Button size="sm" onClick={() => markJobPaid(x.job)}>Mark paid</Button>)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )
      })()}


      {tab === 'recurring' && (
        <>
          <div className="toolbar">
            <div className="toolbar-info">
              <strong>{recurring.filter((r) => r.active).length} active</strong>
              <span className="muted">≈ {money(Math.abs(monthlyLoad), cur)} net {monthlyLoad >= 0 ? 'out' : 'in'} per month{dueCount ? ` · ${dueCount} due` : ''}</span>
            </div>
            <div className="toolbar-actions">
              <Button variant="ghost" onClick={() => setTab('transactions')}>‹ Transactions</Button>
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
        <div className="fin-set-stack">
        <section className="panel fin-settings">
          <h2>Finance settings</h2>
          {/* one row (Alex, 26 Nov: "a mess"); the income tax estimate went, nothing showed it any more */}
          <div className="row-3">
            <Field label="Currency"><Select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} options={['EUR', 'USD', 'GBP']} /></Field>
            <Field label="Default VAT %"><Input type="number" min="0" max="30" value={settings.vatDefault} onChange={(e) => setSettings({ ...settings, vatDefault: e.target.value })} /></Field>
            <Field label="Financial year starts in">
              <Select value={String(settings.fiscalYearStart ?? 1)} onChange={(e) => setSettings({ ...settings, fiscalYearStart: Number(e.target.value) })} options={MONTHS.map((m, i) => [String(i + 1), m])} />
            </Field>
          </div>
          <div className="row-actions"><Button variant="primary" onClick={saveSettings}>Save</Button></div>
          <p className="fineprint">Finance is stored in its own table that only administrators can read. Expenses tied to a project also appear as actuals in that project's budget.</p>
        </section>
        <FinancePinSettings />
        <InvoiceProfileSettings />
        <section className="panel fin-settings">
          <h2>Income &amp; expense categories</h2>
          <p className="muted small">The lists the Income and Expense forms offer. Click a name to rename it and every transaction and recurring item already filed under it follows; for an expense column, the budget categories that land in it follow too (Settings &gt; Budget). A category with transactions on it asks where they go before it disappears. Changes save at once.</p>
          <FinanceCategories toast={toast} />
        </section>
        </div>
      )}

      {pay && <PaymentModal project={pay.project} line={pay.line} onClose={() => setPay(null)} />}
      {viewReceipt && <ReceiptView receipt={viewReceipt} onClose={() => setViewReceipt(null)} />}
      {rdraft && (
        <Modal open title={recurring.some((r) => r.id === rdraft.id) ? 'Edit recurring item' : 'New recurring item'} onClose={() => setRdraft(null)}
          footer={<><Button variant="ghost" onClick={() => setRdraft(null)}>Cancel</Button><Button variant="primary" onClick={saveRecurring}>Save</Button></>}>
          <div className="stack">
            <div className="segmented small">
              <button className={rdraft.type === 'expense' ? 'on' : ''} onClick={() => setRdraft({ ...rdraft, type: 'expense', category: expenseCats(fin.settings).includes(rdraft.category) ? rdraft.category : (expenseCats(fin.settings).includes('Office rent') ? 'Office rent' : expenseCats(fin.settings)[0]) })}>Expense</button>
              <button className={rdraft.type === 'income' ? 'on' : ''} onClick={() => setRdraft({ ...rdraft, type: 'income', category: incomeCats(fin.settings).includes(rdraft.category) ? rdraft.category : (incomeCats(fin.settings).includes('Consulting') ? 'Consulting' : incomeCats(fin.settings)[0]) })}>Income</button>
            </div>
            <Field label="Description"><Input autoFocus value={rdraft.description} onChange={(e) => setRdraft({ ...rdraft, description: e.target.value })} placeholder={rdraft.type === 'expense' ? 'Office rent, Adobe subscription, Editor salary' : 'Monthly retainer'} /></Field>
            <div className="row-3">
              <Field label="Category"><Select value={rdraft.category} onChange={(e) => setRdraft({ ...rdraft, category: e.target.value })} options={catsFor(fin.settings, rdraft.type)} /></Field>
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
              <button className={draft.type === 'income' ? 'on' : ''} onClick={() => setDraft({ ...draft, type: 'income', category: incomeCats(fin.settings).includes(draft.category) ? draft.category : incomeCats(fin.settings)[0], status: 'invoiced' })}>Income</button>
              <button className={draft.type === 'expense' ? 'on' : ''} onClick={() => setDraft({ ...draft, type: 'expense', category: expenseCats(fin.settings).includes(draft.category) ? draft.category : expenseCats(fin.settings)[0], status: 'pending' })}>Expense</button>
            </div>
            <div className="row-3">
              <Field label="Project" hint={draft.type === 'income' ? 'Fills the client and the description.' : 'Then pick the budget line below to fill the rest.'}>
                <Select autoFocus value={draft.projectId} onChange={(e) => setDraft(pickProject(draft, e.target.value))} options={[['', 'Company (no project)'], ...state.projects.map((p) => [p.id, p.title])]} />
              </Field>
              <Field label="Date"><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
              <Field label="Category"><Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} options={catsFor(fin.settings, draft.type)} /></Field>
            </div>
            {draft.type === 'income' && !!invoiceOptions.length && (
              <Field label="From invoice (optional)" hint="Picking one fills the client, the amount and the invoice number, so nothing is typed twice. Only invoices marked Invoiced, not already linked to another transaction, show here.">
                <Select value={draft.invoiceId || ''} onChange={(e) => setDraft(pickInvoice(draft, e.target.value))}
                  options={[['', 'Type it in manually'], ...invoiceOptions.map((inv) => [inv.id, `#${inv.number} · ${inv.recipient?.name || 'No recipient'} · ${money(invoiceTotals(inv).net, inv.currency)}`])]} />
              </Field>
            )}
            {draft.type === 'expense' && draft.projectId && (
              <Field label="Budget line" hint={(() => {
                const open = (state.projects.find((p) => p.id === draft.projectId)?.budget?.lines || []).filter((l) => !l.txId && lineBalance(l) > 0)
                return !draft.budgetLineId && open.length
                  ? `${open.length} budget line${open.length === 1 ? ' is' : 's are'} still owed on this project. Pick the one this payment settles, so it is not counted twice (once here, once as owed).`
                  : 'Pay against an agreed line (advance or balance), or add it as a new cost. Picking a line fills the description, the payee, the category and the open balance.'
              })()}>
                <Select value={draft.budgetLineId || ''} onChange={(e) => setDraft(pickLine(draft, e.target.value))}
                  options={[['', 'New cost in the budget'], ...((state.projects.find((p) => p.id === draft.projectId)?.budget?.lines || []).filter((l) => !l.txId).map((l) => [l.id, `${l.description} · ${money(lineEstimate(l), cur)} agreed${linePaid(l) ? `, ${money(linePaid(l), cur)} paid` : ''}`]))]} />
              </Field>
            )}
            <Field label="Description"><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={draft.type === 'income' ? 'Production fee, 50% advance' : 'DoP, 3 days'} /></Field>
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
            <Field label="Notes"><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}



/* Finance > Settings > Income & expense categories: two editable lists. */
function FinanceCategories({ toast }) {
  const { state, update } = useStore()
  const fs = state.finance.settings
  const [adding, setAdding] = useState({ income: '', expense: '' })
  const [moving, setMoving] = useState(null) // { type, cat, to }
  const lists = { income: incomeCats(fs), expense: expenseCats(fs) }
  const keyOf = (type) => (type === 'income' ? 'incomeCats' : 'expenseCats')
  const setList = (type, next) => update((s) => { s.finance.settings = { ...s.finance.settings, [keyOf(type)]: next }; return s })
  const rename = (type, from, e) => {
    const to = e.target.value.trim()
    if (!to || to === from) { e.target.value = from; return }
    const uses = financeCategoryUses(state, type, from)
    update((s) => { renameFinanceCategory(s, type, from, to); return s })
    toast(lists[type].includes(to) ? `Merged "${from}" into "${to}"${uses.total ? `, ${uses.total} item${uses.total === 1 ? '' : 's'} moved` : ''}` : `Renamed "${from}" to "${to}"${uses.total ? `, ${uses.total} item${uses.total === 1 ? '' : 's'} follow` : ''}`, 'ok')
  }
  // drag a category by its ⋮⋮ (Alex, 10 Oct: no more arrows); income and expense are separate lists
  const sort = useDragSort((from, to, type) => setList(type, moveItem(lists[type], from, to)))
  const askRemove = (type, cat) => {
    const uses = financeCategoryUses(state, type, cat)
    if (lists[type].length <= 1) return toast('Keep at least one category.', 'error')
    if (!uses.total) return setList(type, lists[type].filter((c) => c !== cat))
    setMoving({ type, cat, to: lists[type].find((c) => c !== cat), uses })
  }
  const confirmRemove = () => {
    const { type, cat, to } = moving
    update((s) => { renameFinanceCategory(s, type, cat, to); return s })
    toast(`"${cat}" removed, its ${moving.uses.total} item${moving.uses.total === 1 ? '' : 's'} moved to "${to}"`, 'ok')
    setMoving(null)
  }
  const add = (type) => {
    const v = (adding[type] || '').trim()
    if (!v) return
    if (lists[type].some((c) => c.toLowerCase() === v.toLowerCase())) return toast('That category already exists.', 'error')
    setList(type, [...lists[type], v])
    setAdding({ ...adding, [type]: '' })
  }
  const reset = () => { update((s) => { const { incomeCats: _a, expenseCats: _b, ...rest } = s.finance.settings; s.finance.settings = rest; return s }); toast('Categories back to standard', 'ok') }
  const renderCol = (type, title) => (
    <div className="bcat-group">
      <div className="bcat-head"><span className="bcat-name">{title}</span><span className="muted small">{lists[type].length}</span></div>
      <ul className="plain bcat-list">
        {lists[type].map((c, i) => {
          const uses = financeCategoryUses(state, type, c)
          return (
            <li key={c} {...sort.row(type, i)} className={sort.cls(type, i)}>
              <div className="bcat-row fcat-row">
                <input className="input" defaultValue={c} onBlur={(e) => rename(type, c, e)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }} aria-label="Category name" />
                <span className="muted small nowrap">{uses.total ? `${uses.total} item${uses.total === 1 ? '' : 's'}` : ''}</span>
                <Grip {...sort.grip(type, i)} />
                <button type="button" className="bcat-btn bcat-x" onClick={() => askRemove(type, c)} aria-label="Remove">×</button>
                {moving && moving.type === type && moving.cat === c && (
                  <div className="bcat-move">
                    <span>{moving.uses.total} item{moving.uses.total === 1 ? '' : 's'} use it. Move them to</span>
                    <Select value={moving.to} onChange={(e) => setMoving({ ...moving, to: e.target.value })} options={lists[type].filter((x) => x !== c)} />
                    <Button size="sm" variant="primary" onClick={confirmRemove}>Move and remove</Button>
                    <Button size="sm" variant="ghost" onClick={() => setMoving(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="row-actions">
        <Input value={adding[type]} onChange={(e) => setAdding({ ...adding, [type]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') add(type) }} placeholder={type === 'income' ? 'New income category' : 'New expense category'} />
        <Button size="sm" onClick={() => add(type)}>Add</Button>
      </div>
    </div>
  )
  return (
    <div className="stack">
      <div className="cols fcat-cols">
        {renderCol('income', 'Income')}
        {renderCol('expense', 'Expense')}
      </div>
      <div className="row-actions"><Button variant="ghost" onClick={reset}>Reset to standard</Button></div>
    </div>
  )
}


