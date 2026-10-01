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

const FONT = 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif'

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

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(PAGE_W * SCALE)
  canvas.height = Math.round(PAGE_H * SCALE)
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)
  // thin accent band across the very top
  ctx.fillStyle = ACCENT
  ctx.fillRect(0, 0, PAGE_W, 5)
  ctx.textBaseline = 'alphabetic'

  let y = MARGIN + 6
  let nameX = MARGIN
  // optional company logo top-left; the name sits to its right
  if (logo) {
    const h = 40, w = logo.width * (h / logo.height)
    ctx.drawImage(logo, MARGIN, MARGIN - 4, Math.min(w, 120), h)
    nameX = MARGIN + Math.min(w, 120) + 14
  }

  // ---- header: company left, INVOICE # / date right ----
  // The invoice number block sits top-right; the company name wraps within the space left of it so
  // a long name never runs underneath it.
  ctx.textAlign = 'right'
  ctx.fillStyle = ACCENT
  ctx.font = `800 14px ${FONT}`
  ctx.fillText('INVOICE', PAGE_W - MARGIN, MARGIN + 4)
  ctx.fillStyle = HEAD
  ctx.font = `700 11px ${FONT}`
  ctx.fillText(`#${inv.number || ''}`, PAGE_W - MARGIN, MARGIN + 20)
  ctx.fillStyle = MUTED
  ctx.font = `400 10px ${FONT}`
  const dateStr = inv.date ? new Date(`${inv.date}T00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
  ctx.fillText(`Date: ${dateStr}`, PAGE_W - MARGIN, MARGIN + 36)

  ctx.textAlign = 'left'
  ctx.fillStyle = HEAD
  ctx.font = `800 15px ${FONT}`
  const nameW = PAGE_W - MARGIN - 150 - nameX // keep clear of the invoice-number block
  for (const l of wrap(ctx, co.name || 'THE MAD LIONS FILM PRODUCTION HOUSE', nameW)) { ctx.fillText(l, nameX, y); y += 18 }
  ctx.fillStyle = MUTED
  ctx.font = `400 9.5px ${FONT}`
  y += 1
  for (const l of wrap(ctx, co.providerAddress || '', CONTENT_W * 0.55)) { ctx.fillText(l, nameX, y); y += 12 }
  if (co.web) { ctx.fillText(co.web, nameX, y); y += 12 }

  y = Math.max(y, MARGIN + 54) + 8
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
    ctx.fillStyle = MUTED
    ctx.font = `700 8.5px ${FONT}`
    ctx.fillText(label.toUpperCase(), x, yy); yy += 15
    ctx.fillStyle = INK
    ctx.font = `700 11px ${FONT}`
    for (const l of wrap(ctx, name, colW)) { ctx.fillText(l, x, yy); yy += 14 }
    ctx.fillStyle = MUTED
    ctx.font = `400 9.5px ${FONT}`
    for (const l of wrap(ctx, address, colW)) { ctx.fillText(l, x, yy); yy += 12 }
    if (vatNo) { ctx.fillText(`VAT No ${vatNo}`, x, yy); yy += 12 }
    return yy
  }
  const yL = party(MARGIN, 'Provider', co.providerName || '', co.providerAddress || '', co.providerVatNo || '')
  const yR = party(colR, 'Recipient', inv.recipient?.name || '', inv.recipient?.address || '', inv.recipient?.vatNo || '')
  y = Math.max(yL, yR) + 18

  // ---- line table ----
  const showBgn = inv.showBgn && Number(inv.exchangeRate) > 0
  // columns: Qty | Description | Unit price | Net | (Total BGN) — EUR amounts are the spine
  const qtyX = MARGIN
  const amtRight = PAGE_W - MARGIN
  const totalColW = 78
  const netColW = 78
  const bgnColW = showBgn ? 92 : 0
  const unitColW = 74
  const descX = qtyX + 34
  const bgnX = amtRight
  const totX = showBgn ? bgnX - bgnColW - 10 : amtRight
  const netX = totX - totalColW - 6
  const unitX = netX - netColW - 6
  const descW = unitX - unitColW - descX - 10

  // shaded header strip for the table
  ctx.fillStyle = SHADE
  ctx.fillRect(MARGIN, y - 11, CONTENT_W, 20)
  ctx.fillStyle = MUTED
  ctx.font = `700 8px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('QTY', qtyX + 4, y)
  ctx.fillText('DESCRIPTION', descX, y)
  ctx.textAlign = 'right'
  ctx.fillText('UNIT', unitX, y)
  ctx.fillText('NET', netX, y)
  ctx.fillText(showBgn ? 'TOTAL (EUR)' : 'TOTAL', totX, y)
  if (showBgn) ctx.fillText('TOTAL (BGN)', bgnX, y)
  y += 16

  for (const l of t.lines) {
    ctx.fillStyle = INK
    ctx.font = `400 10px ${FONT}`
    ctx.textAlign = 'left'
    const descLines = wrap(ctx, l.description || '', descW)
    const rowTop = y
    ctx.fillText(String(l.qty ?? ''), qtyX, rowTop)
    let ly = rowTop
    for (const dl of descLines) { ctx.fillText(dl, descX, ly); ly += 13 }
    if ((l.project || '').trim()) {
      ctx.fillStyle = MUTED
      ctx.font = `400 9px ${FONT}`
      for (const pl of wrap(ctx, `Project: ${l.project}`, descW)) { ctx.fillText(pl, descX, ly); ly += 12 }
      ctx.fillStyle = INK
      ctx.font = `400 10px ${FONT}`
    }
    ctx.textAlign = 'right'
    ctx.fillText(money(l.unitPrice || 0, cur), unitX, rowTop)
    ctx.fillText(money(lineNet(l), cur), netX, rowTop)
    ctx.fillText(money(lineNet(l), cur), totX, rowTop)
    if (showBgn) ctx.fillText(moneyBgn(lineNet(l) * Number(inv.exchangeRate)), bgnX, rowTop)
    y = Math.max(rowTop + 16, ly + 3)
    ctx.strokeStyle = '#ececee'; ctx.beginPath(); ctx.moveTo(MARGIN, y - 4); ctx.lineTo(PAGE_W - MARGIN, y - 4); ctx.stroke()
  }

  // ---- totals ----
  y += 12
  const labelX = amtRight - 210
  const totalRow = (label, val, bold) => {
    if (bold) { ctx.fillStyle = SHADE; ctx.fillRect(labelX - 12, y - 14, amtRight - labelX + 12, 26) }
    ctx.font = bold ? `800 14px ${FONT}` : `400 10.5px ${FONT}`
    ctx.fillStyle = bold ? INK : MUTED
    ctx.textAlign = 'left'
    ctx.fillText(label, labelX, y)
    ctx.fillStyle = bold ? ACCENT : INK
    ctx.textAlign = 'right'
    ctx.fillText(val, amtRight, y)
    y += bold ? 26 : 17
  }
  totalRow('Net', money(t.net, cur))
  if (t.vatPct > 0) totalRow(`VAT ${t.vatPct}%`, money(t.vat, cur))
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
