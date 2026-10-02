/* Invoices (Finance > Invoices). One invoice is one JSON document, the same model the rest of the
   app uses. The provider/bank details and the stamp live on a profile in finance.settings so a new
   invoice is almost filled in already; a copy of them is frozen onto each invoice when it is saved,
   so changing the profile later never rewrites an invoice already sent. */

/* The company's own details, pre-filled from the sample invoice Alex works from. All editable in
   Finance > Settings; none of it is secret (a VAT number and IBAN are printed on every invoice). */
export const defaultInvoiceProfile = () => ({
  companyName: 'THE MAD LIONS FILM PRODUCTION HOUSE',
  web: 'www.themadlions.com',
  providerName: 'Mad Lions LTD',
  providerAddress: 'Vasil Mechkuevski 22, office 1, Blagoevgrad, Bulgaria, PC 2700',
  providerVatNo: '203955731',
  bankName: 'FIRST INVESTMENT BANK - SOFIA',
  bankBic: 'FINVBGSF',
  bankIban: 'BG85FINV91501016735912',
  vatNote: 'Reason for not charging VAT: Under Article 21 of the VAT Law',
  currency: 'EUR',
  showBgn: true,
  exchangeRate: 1.95583, // BGN per 1 EUR, fixed peg
  nextNumber: 407, // shown as a long number; prefix + nextNumber = 1000000407
  numberPrefix: '1000000',
  stamp: '', // a PNG data URL (stamp + signature), uploaded in Finance > Settings
  headerImage: '', // optional letterhead PNG (logo + details); when set it replaces the text header
})

const prof = (p = {}) => ({ ...defaultInvoiceProfile(), ...p })

/* The number as it prints: a prefix plus the running number, like the sample's 1000000405. */
export const invoiceNumberText = (profile) => {
  const p = prof(profile)
  return `${p.numberPrefix || ''}${p.nextNumber ?? ''}`
}

export const emptyInvoice = (profile = {}) => {
  const p = prof(profile)
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    number: invoiceNumberText(p),
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    projectId: '',
    status: 'draft', // draft | sent | paid
    currency: p.currency || 'EUR',
    showBgn: p.showBgn !== false,
    exchangeRate: Number(p.exchangeRate) || 1.95583,
    vatPct: 0,
    vatNote: p.vatNote || '',
    recipient: { name: '', address: '', vatNo: '' },
    lines: [{ description: '', project: '', date: '', unitPrice: '' }],
    notes: '',
    // frozen copy of the company's own side, so an old invoice never changes when the profile does
    company: { name: p.companyName, web: p.web, providerName: p.providerName, providerAddress: p.providerAddress, providerVatNo: p.providerVatNo, bankName: p.bankName, bankBic: p.bankBic, bankIban: p.bankIban, stamp: p.stamp || '', headerImage: p.headerImage || '' },
  }
}

// No quantity any more (Alex): a line is just an amount. Older invoices with a qty keep using it.
export const lineNet = (l) => {
  const q = l.qty === undefined || l.qty === null || l.qty === '' ? 1 : (Number(l.qty) || 0)
  return q * (Number(l.unitPrice) || 0)
}

export function invoiceTotals(inv = {}) {
  const lines = (inv.lines || []).filter((l) => (l.description || '').trim() || lineNet(l))
  const net = lines.reduce((a, l) => a + lineNet(l), 0)
  const vatPct = Math.max(Number(inv.vatPct) || 0, 0)
  const vat = (net * vatPct) / 100
  const total = net + vat
  const rate = Number(inv.exchangeRate) || 0
  return { lines, net, vatPct, vat, total, totalBgn: rate ? total * rate : 0, netBgn: rate ? net * rate : 0, vatBgn: rate ? vat * rate : 0 }
}

export const money = (n, cur = 'EUR') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur || 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)

/* BGN amounts print the way the sample does: 18.971,55 лв — dot thousands, comma decimals. */
export const moneyBgn = (n) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0) + ' лв'

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
function under1000(n) {
  let s = ''
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' hundred'; n %= 100; if (n) s += ' and ' }
  if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += '-' + ONES[n % 10] }
  else if (n > 0) s += ONES[n]
  return s
}
/* Whole-number amount in English words, like the sample's "Nine Thousand and seven hundred euros". */
export function amountInWords(n, currency = 'EUR') {
  const units = { EUR: 'euros', USD: 'dollars', GBP: 'pounds', BGN: 'leva' }
  const whole = Math.floor(Math.abs(Number(n) || 0))
  const cents = Math.round((Math.abs(Number(n) || 0) - whole) * 100)
  if (whole === 0 && !cents) return `Zero ${units[currency] || 'euros'}`
  const groups = [['', 1], ['thousand', 1000], ['million', 1000000]]
  let rem = whole, parts = []
  const chunks = []
  while (rem > 0) { chunks.push(rem % 1000); rem = Math.floor(rem / 1000) }
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (!chunks[i]) continue
    const word = under1000(chunks[i])
    parts.push(word + (groups[i] && groups[i][0] ? ' ' + groups[i][0] : ''))
  }
  let text = parts.join(' and ')
  text = text.charAt(0).toUpperCase() + text.slice(1)
  let out = `${text} ${units[currency] || 'euros'}`
  if (cents) out += ` and ${under1000(cents)} cents`
  return out
}

export const INVOICE_STATUS = [['draft', 'Draft'], ['sent', 'Sent'], ['paid', 'Paid']]

const rid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

/* Saved clients and services live in finance.settings (invoiceClients / invoiceServices) so they
   sync like the rest of Finance and need no new table. Picking one fills the invoice. */
export const emptyClient = () => ({ id: rid(), name: '', address: '', vatNo: '', email: '', phone: '', notes: '' })
export const emptyService = () => ({ id: rid(), name: '', description: '', unitPrice: '', qty: 1 })
