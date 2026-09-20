/* Cost estimations. The numbers are worked out in one place, so the page the client sees and the
   page Alex fills in can never disagree about a total. */

export const lineAmount = (l) => (Number(l.qty) || 0) * (Number(l.price) || 0)

export function estimateTotals(d = {}) {
  const lines = (d.lines || []).filter((l) => (l.what || '').trim())
  const subtotal = lines.reduce((a, l) => a + lineAmount(l), 0)
  // A discount can never take the estimate below zero, however it is typed in.
  const discount = Math.min(Math.max(Number(d.discount) || 0, 0), subtotal)
  const net = subtotal - discount
  const vatPct = Math.max(Number(d.vatPct) || 0, 0)
  const vat = (net * vatPct) / 100
  return { lines, subtotal, discount, net, vatPct, vat, total: net + vat }
}

/* Lines in the order they were typed, kept under the heading they were given. Anything with no
   heading of its own goes last, under nothing, rather than inventing a group for it. */
export function groupLines(lines) {
  const m = new Map()
  for (const l of lines) {
    const k = (l.group || '').trim()
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(l)
  }
  const out = [...m.entries()].map(([label, rows]) => ({ label, rows, sum: rows.reduce((a, l) => a + lineAmount(l), 0) }))
  return [...out.filter((g) => g.label), ...out.filter((g) => !g.label)]
}

export const amount = (n, cur = 'EUR') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur || 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
