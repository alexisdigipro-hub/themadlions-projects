/* Invoice -> a formal A4 PDF, drawn on a canvas (so Greek and Cyrillic render from the browser's
   own fonts) and wrapped in the same hand-written PDF container the estimate uses. White and plain,
   the way an invoice should print. The stamp/signature is a PNG Alex uploads; it is drawn into the
   provider's signature box. */
import { buildPdf, canvasToJpegBytes } from './estimatePdf.js'
import { amountInWords, invoiceTotals, lineNet, money, moneyBgn } from './invoice.js'

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 44
const CONTENT_W = PAGE_W - MARGIN * 2
const SCALE = 2

const INK = '#15171c'
const MUTED = '#5b6168'
const LINE = '#d7d7da'
const HEAD = '#111318'
const ACCENT = '#C8503F'
const SHADE = '#f4f2ee'

// The site's own typeface (Sofia Sans), so the invoice matches the app. We wait for it to load
// before drawing; if it is somehow missing, the stack falls back cleanly.
const FONT = "'Sofia Sans', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"

function wrap(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = w } else line = next
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function loadImage(src) {
  return new Promise((res) => {
    if (!src) return res(null)
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

export async function renderInvoice(inv) {
  const t = invoiceTotals(inv)
  const co = inv.company || {}
  const cur = inv.currency || 'EUR'
  const stamp = co.stamp ? await loadImage(co.stamp) : null
  const logo = co.logo ? await loadImage(co.logo) : null
  const header = co.headerImage ? await loadImage(co.headerImage) : null
  // make sure the site font is ready before any text is measured or drawn
  try { if (document.fonts) { await document.fonts.load(`700 15px 'Sofia Sans'`); await document.fonts.load(`400 10px 'Sofia Sans'`); await document.fonts.ready } } catch {}

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(PAGE_W * SCALE)
  canvas.height = Math.round(PAGE_H * SCALE)
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)
  ctx.textBaseline = 'alphabetic'

  const amtRight = PAGE_W - MARGIN
  const dateDM = (iso) => (iso ? new Date(`${iso}T00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '')
  let y = MARGIN + 6

  if (header) {
    // a letterhead image (logo + company details), centred and full width, replacing the text header
    const w = Math.min(CONTENT_W, header.width), h = header.width ? w * (header.height / header.width) : 90
    const drawH = Math.min(h, 150)
    const drawW = header.height ? drawH * (header.width / header.height) : w
    ctx.drawImage(header, (PAGE_W - Math.min(drawW, CONTENT_W)) / 2, MARGIN - 6, Math.min(drawW, CONTENT_W), drawH)
    y = MARGIN - 6 + drawH + 14
    // invoice number + date, centred under the letterhead
    ctx.textAlign = 'center'
    ctx.fillStyle = ACCENT; ctx.font = `800 13px ${FONT}`
    ctx.fillText(`INVOICE #${inv.number || ''}`, PAGE_W / 2, y); y += 15
    ctx.fillStyle = MUTED; ctx.font = `400 10px ${FONT}`
    ctx.fillText(`Date: ${dateDM(inv.date)}`, PAGE_W / 2, y); y += 10
    ctx.textAlign = 'left'
  } else {
    // text header: optional logo top-left, company name + address, invoice number top-right
    ctx.fillStyle = ACCENT; ctx.fillRect(0, 0, PAGE_W, 5)
    let nameX = MARGIN
    if (logo) { const h = 40, w = logo.width * (h / logo.height); ctx.drawImage(logo, MARGIN, MARGIN - 4, Math.min(w, 120), h); nameX = MARGIN + Math.min(w, 120) + 14 }
    ctx.textAlign = 'right'
    ctx.fillStyle = ACCENT; ctx.font = `800 14px ${FONT}`
    ctx.fillText('INVOICE', amtRight, MARGIN + 4)
    ctx.fillStyle = HEAD; ctx.font = `700 11px ${FONT}`
    ctx.fillText(`#${inv.number || ''}`, amtRight, MARGIN + 20)
    ctx.fillStyle = MUTED; ctx.font = `400 10px ${FONT}`
    ctx.fillText(`Date: ${dateDM(inv.date)}`, amtRight, MARGIN + 36)
    ctx.textAlign = 'left'
    ctx.fillStyle = HEAD; ctx.font = `800 15px ${FONT}`
    for (const l of wrap(ctx, co.name || 'THE MAD LIONS FILM PRODUCTION HOUSE', PAGE_W - MARGIN - 150 - nameX)) { ctx.fillText(l, nameX, y); y += 18 }
    ctx.fillStyle = MUTED; ctx.font = `400 9.5px ${FONT}`; y += 1
    for (const l of wrap(ctx, co.providerAddress || '', CONTENT_W * 0.55)) { ctx.fillText(l, nameX, y); y += 12 }
    if (co.web) { ctx.fillText(co.web, nameX, y); y += 12 }
    y = Math.max(y, MARGIN + 54) + 8
  }

  ctx.strokeStyle = ACCENT; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(MARGIN, y); ctx.lineTo(PAGE_W - MARGIN, y); ctx.stroke()
  y += 22

  // ---- provider / recipient columns ----
  const colW = (CONTENT_W - 24) / 2
  const colR = MARGIN + colW + 24
  const partyTop = y
  const party = (x, label, name, address, vatNo) => {
    let yy = partyTop
    ctx.textAlign = 'left'
    ctx.fillStyle = ACCENT
    ctx.font = `700 8.5px ${FONT}`
    ctx.fillText(label.toUpperCase(), x, yy); yy += 15
    ctx.fillStyle = INK
    ctx.font = `700 11.5px ${FONT}`
    for (const l of wrap(ctx, name, colW)) { ctx.fillText(l, x, yy); yy += 14 }
    ctx.fillStyle = MUTED
    ctx.font = `400 9.5px ${FONT}`
    for (const l of wrap(ctx, address, colW)) { ctx.fillText(l, x, yy); yy += 12 }
    if (vatNo) { ctx.fillText(`VAT No ${vatNo}`, x, yy); yy += 12 }
    return yy
  }
  const yL = party(MARGIN, 'Provider', co.providerName || '', co.providerAddress || '', co.providerVatNo || '')
  const yR = party(colR, 'Recipient', inv.recipient?.name || '', inv.recipient?.address || '', inv.recipient?.vatNo || '')
  y = Math.max(yL, yR) + 20

  // ---- line table: Description | Amount (EUR) | Amount (BGN). No quantity column (Alex). ----
  const showBgn = inv.showBgn && Number(inv.exchangeRate) > 0
  const bgnColW = showBgn ? 110 : 0
  const bgnX = amtRight
  const eurX = showBgn ? bgnX - bgnColW - 12 : amtRight
  const descX = MARGIN
  const descW = eurX - 120 - descX

  ctx.fillStyle = SHADE
  ctx.fillRect(MARGIN, y - 11, CONTENT_W, 20)
  ctx.fillStyle = MUTED
  ctx.font = `700 8px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('DESCRIPTION', descX + 4, y)
  ctx.textAlign = 'right'
  ctx.fillText(showBgn ? 'AMOUNT (EUR)' : 'AMOUNT', eurX, y)
  if (showBgn) ctx.fillText('AMOUNT (BGN)', bgnX, y)
  y += 16

  for (const l of t.lines) {
    ctx.fillStyle = INK
    ctx.font = `600 10.5px ${FONT}`
    ctx.textAlign = 'left'
    const descLines = wrap(ctx, l.description || '', descW)
    const rowTop = y
    let ly = rowTop
    for (const dl of descLines) { ctx.fillText(dl, descX + 4, ly); ly += 13 }
    ctx.font = `400 9px ${FONT}`
    ctx.fillStyle = MUTED
    if ((l.project || '').trim()) { for (const pl of wrap(ctx, `Project: ${l.project}`, descW)) { ctx.fillText(pl, descX + 4, ly); ly += 11 } }
    if ((l.date || '').trim()) { ctx.fillText(`Date: ${dateDM(l.date)}`, descX + 4, ly); ly += 11 }
    ctx.fillStyle = INK
    ctx.font = `400 10.5px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillText(money(lineNet(l), cur), eurX, rowTop)
    if (showBgn) ctx.fillText(moneyBgn(lineNet(l) * Number(inv.exchangeRate)), bgnX, rowTop)
    y = Math.max(rowTop + 18, ly + 4)
    ctx.strokeStyle = '#ececee'; ctx.beginPath(); ctx.moveTo(MARGIN, y - 5); ctx.lineTo(PAGE_W - MARGIN, y - 5); ctx.stroke()
  }

  // ---- totals ----
  y += 12
  const labelX = amtRight - 230
  const totalRow = (label, val, bold) => {
    if (bold) { ctx.fillStyle = SHADE; ctx.fillRect(labelX - 12, y - 15, amtRight - labelX + 24, 28) }
    ctx.font = bold ? `800 15px ${FONT}` : `400 10.5px ${FONT}`
    ctx.fillStyle = bold ? INK : MUTED
    ctx.textAlign = 'left'
    ctx.fillText(label, labelX, y)
    ctx.fillStyle = bold ? ACCENT : INK
    ctx.textAlign = 'right'
    ctx.fillText(val, amtRight, y)
    y += bold ? 27 : 17
  }
  if (t.vatPct > 0) { totalRow('Net', money(t.net, cur)); totalRow(`VAT ${t.vatPct}%`, money(t.vat, cur)) }
  totalRow('Total', money(t.total, cur), true)
  if (showBgn) { ctx.fillStyle = MUTED; ctx.font = `400 9.5px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(`${moneyBgn(t.totalBgn)}  ·  rate ${inv.exchangeRate}`, amtRight, y); y += 16 }

  // ---- in words + VAT note ----
  y += 6
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font = `400 9.5px ${FONT}`
  ctx.fillText(`In words: ${amountInWords(t.total, cur)}`, MARGIN, y); y += 14
  if (t.vatPct === 0 && inv.vatNote) { ctx.fillStyle = MUTED; for (const l of wrap(ctx, inv.vatNote, CONTENT_W)) { ctx.fillText(l, MARGIN, y); y += 12 } }
  if (inv.notes) { y += 4; ctx.fillStyle = MUTED; for (const l of wrap(ctx, inv.notes, CONTENT_W)) { ctx.fillText(l, MARGIN, y); y += 12 } }

  // ---- bank ----
  y += 10
  ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(MARGIN, y); ctx.lineTo(PAGE_W - MARGIN, y); ctx.stroke()
  y += 16
  ctx.fillStyle = MUTED; ctx.font = `700 8px ${FONT}`; ctx.fillText('PAYMENT', MARGIN, y); y += 14
  ctx.fillStyle = INK; ctx.font = `400 10px ${FONT}`
  if (co.bankName) { ctx.fillText(`Bank: ${co.bankName}`, MARGIN, y); y += 13 }
  const bicIban = [co.bankBic ? `BIC/SWIFT: ${co.bankBic}` : '', co.bankIban ? `IBAN: ${co.bankIban}` : ''].filter(Boolean).join('      ')
  if (bicIban) { ctx.fillText(bicIban, MARGIN, y); y += 13 }

  // ---- signatures: Provider (with stamp) / Recipient ----
  const sigTop = Math.max(y + 26, PAGE_H - 150)
  const sigY = sigTop
  ctx.fillStyle = MUTED; ctx.font = `700 8px ${FONT}`; ctx.textAlign = 'left'
  ctx.fillText('PROVIDER', MARGIN, sigY)
  ctx.fillText('RECIPIENT', colR, sigY)
  // stamp + signature image under Provider
  if (stamp) {
    const maxW = colW - 10, maxH = 92
    const k = Math.min(maxW / stamp.width, maxH / stamp.height, 1)
    const w = stamp.width * k, h = stamp.height * k
    ctx.drawImage(stamp, MARGIN, sigY + 8, w, h)
  }
  const lineY = sigY + 108
  ctx.strokeStyle = LINE
  ctx.beginPath(); ctx.moveTo(MARGIN, lineY); ctx.lineTo(MARGIN + colW, lineY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(colR, lineY); ctx.lineTo(colR + colW, lineY); ctx.stroke()
  ctx.fillStyle = MUTED; ctx.font = `400 8.5px ${FONT}`
  ctx.fillText('( Signature & Stamp )', MARGIN, lineY + 13)
  ctx.fillText('( Signature & Stamp )', colR, lineY + 13)

  return canvas
}

export async function downloadInvoicePdf(inv, filename) {
  const canvas = await renderInvoice(inv)
  const bytes = buildPdf([{ bytes: await canvasToJpegBytes(canvas, 0.92), width: canvas.width, height: canvas.height }])
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `invoice-${inv.number || ''}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
