import { today, uid } from './store.jsx'

export const INCOME_CATS = ['Production fee', 'Post-production fee', 'Directing fee', 'Equipment rental out', 'Licensing & rights', 'Studio rental', 'Consulting', 'Other income']
export const EXPENSE_CATS = ['Crew', 'Cast', 'Equipment rental', 'Equipment purchase', 'Locations & permits', 'Art & props', 'Wardrobe & makeup', 'Transport', 'Catering', 'Post-production', 'Music & rights', 'Insurance', 'Office rent', 'Salaries', 'Software & subscriptions', 'Marketing', 'Accounting & legal', 'Taxes & fees', 'Bank charges', 'Travel', 'Other expense']
/* The lists in use: Finance > Settings > Categories can rename, reorder, add and remove; the
   built-in lists above are the defaults and what Reset brings back. */
export const incomeCats = (settings) => (Array.isArray(settings?.incomeCats) && settings.incomeCats.length ? settings.incomeCats : INCOME_CATS)
export const expenseCats = (settings) => (Array.isArray(settings?.expenseCats) && settings.expenseCats.length ? settings.expenseCats : EXPENSE_CATS)
export const catsFor = (settings, type) => (type === 'income' ? incomeCats(settings) : expenseCats(settings))

/* How many transactions and recurring items file under a category. */
export function financeCategoryUses(s, type, cat) {
  const tx = (s.finance?.transactions || []).filter((t) => t.type === type && t.category === cat).length
  const rec = (s.finance?.recurring || []).filter((r) => r.type === type && r.category === cat).length
  return { tx, rec, total: tx + rec }
}

/* Renames a category everywhere it is written: the list, transactions, recurring items and, for
   an expense column, the budget categories that map to it (Settings > Budget). `to` may be an
   existing category, which merges `from` into it. */
export function renameFinanceCategory(s, type, from, to) {
  const key = type === 'income' ? 'incomeCats' : 'expenseCats'
  const list = catsFor(s.finance.settings, type)
  const next = list.includes(to) ? list.filter((c) => c !== from) : list.map((c) => (c === from ? to : c))
  s.finance.settings = { ...s.finance.settings, [key]: next }
  ;(s.finance.transactions || []).forEach((t) => { if (t.type === type && t.category === from) t.category = to })
  ;(s.finance.recurring || []).forEach((r) => { if (r.type === type && r.category === from) r.category = to })
  if (type === 'expense' && Array.isArray(s.settings?.budgetCategories)) {
    s.settings = { ...s.settings, budgetCategories: s.settings.budgetCategories.map((g) => ({ ...g, cats: (g.cats || []).map((c) => (c.fin === from ? { ...c, fin: to } : c)) })) }
  }
}

export const TX_STATUS = {
  income: [['quoted', 'Quoted'], ['invoiced', 'Invoiced'], ['paid', 'Paid']],
  expense: [['pending', 'To pay'], ['paid', 'Paid']],
}
export const DOCS = [['invoice', 'Invoice'], ['receipt', 'Receipt'], ['none', 'No document']]
export const METHODS = ['Bank', 'Cash', 'Card', 'Other']

export const defaultFinanceSettings = () => ({ currency: 'EUR', vatDefault: 24, taxRate: 22, fiscalYearStart: 1 })

export const emptyTx = (type = 'expense', partial = {}) => ({
  id: uid(), type, date: today(), projectId: '', category: type === 'income' ? 'Production fee' : 'Crew',
  description: '', party: '', net: '', vatPct: 24, status: type === 'income' ? 'invoiced' : 'pending', doc: 'invoice', docNumber: '', docLink: '',
  method: 'Bank', paidOn: '', notes: '', syncBudget: true, createdAt: new Date().toISOString(), ...partial,
})

export const vatOf = (t) => Math.round(Number(t.net || 0) * (Number(t.vatPct || 0) / 100) * 100) / 100
export const grossOf = (t) => Math.round((Number(t.net || 0) + vatOf(t)) * 100) / 100
export const money = (n, cur = 'EUR') => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Number(n) || 0)
export const ym = (d) => (d || '').slice(0, 7)
export const yearOf = (d) => Number((d || '').slice(0, 4))

/* Which financial year a date belongs to. With a start month of 1 (the Greek default) this is
   just the calendar year. With any other start month, everything before it counts as the
   previous financial year, so a year that starts in April puts March 2027 in FY 2026. */
export const fiscalYearOf = (d, startMonth = 1) => {
  const y = yearOf(d)
  if (!y) return 0
  const m = Number((d || '').slice(5, 7)) || 1
  return Number(startMonth) > 1 && m < Number(startMonth) ? y - 1 : y
}

/* Label for a financial year: "2026" when it follows the calendar, "2026/27" when it does not. */
export const fiscalYearLabel = (y, startMonth = 1) => (Number(startMonth) > 1 ? `${y}/${String((y + 1) % 100).padStart(2, '0')}` : String(y))

export function summarize(txs, { year, projects = [], fiscalStart = 1 } = {}) {
  const inYear = year ? txs.filter((t) => fiscalYearOf(t.date, fiscalStart) === year) : txs
  const inc = inYear.filter((t) => t.type === 'income' && t.status !== 'quoted')
  const exp = inYear.filter((t) => t.type === 'expense')
  const sum = (l, f = (t) => Number(t.net || 0)) => l.reduce((a, t) => a + f(t), 0)
  const income = sum(inc), expense = sum(exp)
  const profit = income - expense
  const vatIn = sum(inc, vatOf), vatOut = sum(exp, vatOf)
  const owedToUs = txs.filter((t) => t.type === 'income' && t.status === 'invoiced')
  const weOwe = txs.filter((t) => t.type === 'expense' && t.status === 'pending')
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthTx = txs.filter((t) => ym(t.date) === thisMonth)
  const monthIn = sum(monthTx.filter((t) => t.type === 'income' && t.status !== 'quoted'))
  const monthOut = sum(monthTx.filter((t) => t.type === 'expense'))
  // monthly series for the year
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`
    const l = inYear.filter((t) => ym(t.date) === key)
    return { key, income: sum(l.filter((t) => t.type === 'income' && t.status !== 'quoted')), expense: sum(l.filter((t) => t.type === 'expense')) }
  })
  // every breakdown row also carries how many transactions it holds and what of its income is
  // invoiced but not yet paid (gross), for the Outstanding column of the client table
  const byKey = (list, keyFn) => {
    const m = {}
    list.forEach((t) => {
      const k = keyFn(t) || 'Unassigned'
      m[k] = m[k] || { income: 0, expense: 0, count: 0, outstanding: 0 }
      m[k][t.type === 'income' ? 'income' : 'expense'] += Number(t.net || 0)
      m[k].count += 1
      if (t.type === 'income' && t.status === 'invoiced') m[k].outstanding += grossOf(t)
    })
    return Object.entries(m).map(([k, v]) => ({ key: k, ...v, profit: v.income - v.expense, margin: v.income ? Math.round(((v.income - v.expense) / v.income) * 100) : null })).sort((a, b) => b.income - a.income)
  }
  const pById = Object.fromEntries(projects.map((p) => [p.id, p]))
  const byProject = byKey([...inc, ...exp], (t) => (t.projectId ? pById[t.projectId]?.title || 'Deleted project' : 'Company (no project)'))
  const byClient = byKey(inc, (t) => t.party)
  const byCategory = byKey([...inc, ...exp], (t) => t.category)
  const byType = byKey([...inc, ...exp], (t) => (t.projectId ? pById[t.projectId]?.category || 'Other' : 'Company'))
  // quarters of the calendar year shown, with VAT in and out: what the quarterly VAT return asks
  const quarters = [0, 1, 2, 3].map((qi) => {
    const l = inYear.filter((t) => { const mth = Number((t.date || '').slice(5, 7)); return mth >= qi * 3 + 1 && mth <= qi * 3 + 3 })
    const qi_ = l.filter((t) => t.type === 'income' && t.status !== 'quoted')
    const qe = l.filter((t) => t.type === 'expense')
    const income = sum(qi_), expense = sum(qe), vIn = sum(qi_, vatOf), vOut = sum(qe, vatOf)
    return { key: `Q${qi + 1}`, income, expense, profit: income - expense, vatIn: vIn, vatOut: vOut, vatBalance: vIn - vOut, count: l.length }
  })
  return {
    income, expense, profit, vatIn, vatOut, vatBalance: vatIn - vatOut, quarters,
    owedToUs: sum(owedToUs, grossOf), owedCount: owedToUs.length, weOwe: sum(weOwe, grossOf), weOweCount: weOwe.length,
    monthIn, monthOut, months, byProject, byClient, byCategory, byType,
    quoted: sum(inYear.filter((t) => t.type === 'income' && t.status === 'quoted')),
  }
}

export const matchTx = (t, q) => {
  const s = (q || '').trim().toLowerCase()
  if (!s) return true
  return [t.description, t.party, t.category, t.docNumber, t.notes].some((f) => (f || '').toLowerCase().includes(s))
}

/* ---------- recurring ---------- */
export const FREQ = [['monthly', 'Every month'], ['quarterly', 'Every 3 months'], ['yearly', 'Every year']]
export const emptyRecurring = (partial = {}) => ({
  id: uid(), type: 'expense', description: '', party: '', category: 'Office rent', projectId: '', net: '', vatPct: 24, doc: 'invoice', method: 'Bank',
  frequency: 'monthly', day: 1, start: new Date().toISOString().slice(0, 7), end: '', active: true, lastGenerated: '', notes: '', ...partial,
})
const addMonths = (ymStr, n) => {
  const [y, m] = ymStr.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const step = (f) => (f === 'yearly' ? 12 : f === 'quarterly' ? 3 : 1)
// periods (YYYY-MM) a template still owes, up to and including the current month
export function duePeriods(r, now = new Date()) {
  if (!r.active || !r.start) return []
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const out = []
  let p = r.lastGenerated ? addMonths(r.lastGenerated, step(r.frequency)) : r.start
  if (p < r.start) p = r.start
  let guard = 0
  while (p <= cur && (!r.end || p <= r.end) && guard < 120) {
    out.push(p)
    p = addMonths(p, step(r.frequency))
    guard += 1
  }
  return out
}
export function generateFromRecurring(r, periods) {
  return periods.map((ym) => {
    const [y, m] = ym.split('-').map(Number)
    const last = new Date(y, m, 0).getDate()
    const day = Math.min(Math.max(1, Number(r.day) || 1), last)
    const date = `${ym}-${String(day).padStart(2, '0')}`
    const label = r.frequency === 'monthly' ? new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : ym
    return emptyTx(r.type, { date, projectId: r.projectId, category: r.category, description: `${r.description} · ${label}`, party: r.party, net: Number(r.net) || 0, vatPct: Number(r.vatPct) || 0, doc: r.doc, method: r.method, status: r.type === 'income' ? 'invoiced' : 'pending', recurringId: r.id, notes: r.notes || '' })
  })
}
