import { uid } from './store.jsx'

export const INCOME_CATS = ['Production fee', 'Post-production fee', 'Directing fee', 'Equipment rental out', 'Licensing & rights', 'Studio rental', 'Consulting', 'Other income']
export const EXPENSE_CATS = ['Crew', 'Cast', 'Equipment rental', 'Equipment purchase', 'Locations & permits', 'Art & props', 'Wardrobe & makeup', 'Transport', 'Catering', 'Post-production', 'Music & rights', 'Insurance', 'Office rent', 'Salaries', 'Software & subscriptions', 'Marketing', 'Accounting & legal', 'Taxes & fees', 'Bank charges', 'Travel', 'Other expense']
export const TX_STATUS = {
  income: [['quoted', 'Quoted'], ['invoiced', 'Invoiced'], ['paid', 'Paid']],
  expense: [['pending', 'To pay'], ['paid', 'Paid']],
}
export const DOCS = [['invoice', 'Invoice'], ['receipt', 'Receipt'], ['none', 'No document']]
export const METHODS = ['Bank', 'Cash', 'Card', 'Other']

export const defaultFinanceSettings = () => ({ currency: 'EUR', vatDefault: 24, taxRate: 22, fiscalYearStart: 1 })

export const emptyTx = (type = 'expense', partial = {}) => ({
  id: uid(), type, date: new Date().toISOString().slice(0, 10), projectId: '', category: type === 'income' ? 'Production fee' : 'Crew',
  description: '', party: '', net: '', vatPct: 24, status: type === 'income' ? 'invoiced' : 'pending', doc: 'invoice', docNumber: '', docLink: '',
  method: 'Bank', paidOn: '', notes: '', syncBudget: true, createdAt: new Date().toISOString(), ...partial,
})

export const vatOf = (t) => Math.round(Number(t.net || 0) * (Number(t.vatPct || 0) / 100) * 100) / 100
export const grossOf = (t) => Math.round((Number(t.net || 0) + vatOf(t)) * 100) / 100
export const money = (n, cur = 'EUR') => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Number(n) || 0)
export const ym = (d) => (d || '').slice(0, 7)
export const yearOf = (d) => Number((d || '').slice(0, 4))

export function summarize(txs, { year, projects = [] } = {}) {
  const inYear = year ? txs.filter((t) => yearOf(t.date) === year) : txs
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
  const byKey = (list, keyFn) => {
    const m = {}
    list.forEach((t) => {
      const k = keyFn(t) || 'Unassigned'
      m[k] = m[k] || { income: 0, expense: 0 }
      m[k][t.type === 'income' ? 'income' : 'expense'] += Number(t.net || 0)
    })
    return Object.entries(m).map(([k, v]) => ({ key: k, ...v, profit: v.income - v.expense, margin: v.income ? Math.round(((v.income - v.expense) / v.income) * 100) : null })).sort((a, b) => b.income - a.income)
  }
  const pById = Object.fromEntries(projects.map((p) => [p.id, p]))
  const byProject = byKey([...inc, ...exp], (t) => (t.projectId ? pById[t.projectId]?.title || 'Deleted project' : 'Company (no project)'))
  const byClient = byKey(inc, (t) => t.party)
  const byCategory = byKey([...inc, ...exp], (t) => t.category)
  const byType = byKey([...inc, ...exp], (t) => (t.projectId ? pById[t.projectId]?.category || 'Other' : 'Company'))
  return {
    income, expense, profit, vatIn, vatOut, vatBalance: vatIn - vatOut,
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
