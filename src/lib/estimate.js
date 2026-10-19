/* Cost estimations. The numbers are worked out in one place, so the page the client sees and the
   page Alex fills in can never disagree about a total. */

export const lineAmount = (l) => (Number(l.qty) || 0) * (Number(l.price) || 0)

export function estimateTotals(d = {}) {
  const lines = (d.lines || []).filter((l) => (l.what || '').trim())
  // A total price for the whole job (Alex, 19 Oct): when it is set it is the clean cost, and the lines only say
  // what it includes (their amounts are not shown to the client)
  const totalPrice = Math.max(Number(d.totalPrice) || 0, 0)
  const fixed = totalPrice > 0
  const subtotal = fixed ? totalPrice : lines.reduce((a, l) => a + lineAmount(l), 0)
  // A discount can never take the estimate below zero, however it is typed in.
  const discount = Math.min(Math.max(Number(d.discount) || 0, 0), subtotal)
  const net = subtotal - discount
  const vatPct = Math.max(Number(d.vatPct) || 0, 0)
  const vat = (net * vatPct) / 100
  // Lines marked as part of the advance payment (Alex picks them by hand); shown as their own
  // sum next to the totals, not folded into any of the numbers above.
  const advance = lines.filter((l) => l.advance).reduce((a, l) => a + lineAmount(l), 0)
  return { lines, subtotal, discount, net, vatPct, vat, total: net + vat, advance, fixed }
}

/* What the client sees beside a line or a group: nothing with a total price; otherwise every amount that was typed,
   0 included (Alex, 19 Oct: "when I put 0 the 0 shows"), and nothing for a line whose amount was left empty (it just
   says what is included) */
export const hasAmount = (l) => l.price !== null && l.price !== undefined && String(l.price).trim() !== ''
export const showLineAmount = (l, t) => !t.fixed && hasAmount(l)
export const showGroupSum = (g, t) => !t.fixed && g.label && g.rows.length > 1 && g.sum > 0

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

// a heading in capitals without the Greek accents (ΓΥΡΙΣΜΑ, not ΓΎΡΙΣΜΑ)
export const upper = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

export const amount = (n, cur = 'EUR') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur || 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
