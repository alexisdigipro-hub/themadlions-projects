/* Invoice -> a formal A4 PDF, drawn on a canvas (so Greek and Cyrillic render from the browser's
   own fonts) and wrapped in the same hand-written PDF container the estimate uses. Modern layout:
   letterhead, light "Invoice" title with number/date, light grey total card, payment box. The
   stamp/signature is a PNG Alex uploads; it sits above the provider's signature line. */
import { buildPdf, canvasToJpegBytes } from './estimatePdf.js'
import { amountInWords, invoiceTotals, lineNet, money, moneyBgn } from './invoice.js'

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 44
const CONTENT_W = PAGE_W - MARGIN * 2
const SCALE = 2

const INK = '#16181d'
const MUTED = '#6b7078'
const LINE = '#e6e4df'
const ACCENT = '#C8503F'
const SHADE = '#f6f5f2'
const CARD = '#eeedea'

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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return }
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
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
  try { if (document.fonts) { await document.fonts.load(`700 15px 'Sofia Sans'`); await document.fonts.load(`300 30px 'Sofia Sans'`); await document.fonts.load(`400 10px 'Sofia Sans'`); await document.fonts.ready } } catch {}

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(PAGE_W * SCALE)
  canvas.height = Math.round(PAGE_H * SCALE)
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)
  ctx.textBaseline = 'alphabetic'

  const right = PAGE_W - MARGIN
  const dateDM = (iso) => (iso ? new Date(`${iso}T00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '')
  const rule = (yy, color = LINE, w = 1) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(MARGIN, yy); ctx.lineTo(right, yy); ctx.stroke() }
  let y

  // ---- top: the letterhead image centred, or the company name in text when there is none ----
  if (header) {
    const drawH = Math.min(header.width ? CONTENT_W * (header.height / header.width) : 80, 110)
    const drawW = Math.min(header.height ? drawH * (header.width / header.height) : CONTENT_W, CONTENT_W)
    ctx.drawImage(header, (PAGE_W - drawW) / 2, MARGIN - 10, drawW, drawH)
    y = MARGIN - 10 + drawH + 30
  } else {
    let nameX = MARGIN
    y = MARGIN + 8
    if (logo) { const h = 36, w = Math.min(logo.width * (h / logo.height), 110); ctx.drawImage(logo, MARGIN, MARGIN - 6, w, h); nameX = MARGIN + w + 12 }
    ctx.textAlign = 'left'
    ctx.fillStyle = INK; ctx.font = `800 13px ${FONT}`
    for (const l of wrap(ctx, co.name || 'THE MAD LIONS FILM PRODUCTION HOUSE', right - nameX)) { ctx.fillText(l, nameX, y); y += 15 }
    ctx.fillStyle = MUTED; ctx.font = `400 8.5px ${FONT}`
    const sub = [co.providerAddress, co.web].filter(Boolean).join('  ·  ')
    for (const l of wrap(ctx, sub, right - nameX)) { ctx.fillText(l, nameX, y); y += 11 }
    y = Math.max(y, MARGIN + 34) + 36
  }

  // ---- "Invoice" title left, number + date right (small label over value) ----
  ctx.textAlign = 'left'
  ctx.fillStyle = INK; ctx.font = `300 30px ${FONT}`
  ctx.fillText('Invoice', MARGIN, y + 8)
  const meta = [['INVOICE NO', inv.number || ''], ['DATE', dateDM(inv.date)]]
  let mx = right
  ctx.textAlign = 'right'
  for (let i = meta.length - 1; i >= 0; i--) {
    ctx.fillStyle = MUTED; ctx.font = `700 7.5px ${FONT}`; ctx.fillText(meta[i][0], mx, y - 6)
    ctx.fillStyle = INK; ctx.font = `700 11px ${FONT}`; ctx.fillText(meta[i][1], mx, y + 9)
    mx -= 110
  }
  y += 30
  rule(y)
  y += 26

  // ---- billed by / billed to ----
  const colW = (CONTENT_W - 30) / 2
  const colR = MARGIN + colW + 30
  const partyTop = y
  const party = (x, label, name, address, vatNo) => {
    let yy = partyTop
    ctx.textAlign = 'left'
    ctx.fillStyle = ACCENT; ctx.font = `700 7.5px ${FONT}`
    ctx.fillText(label, x, yy); yy += 15
    ctx.fillStyle = INK; ctx.font = `700 11.5px ${FONT}`
    for (const l of wrap(ctx, name, colW)) { ctx.fillText(l, x, yy); yy += 14 }
    ctx.fillStyle = MUTED; ctx.font = `400 9.5px ${FONT}`
    for (const l of wrap(ctx, address, colW)) { ctx.fillText(l, x, yy); yy += 12.5 }
    if (vatNo) { ctx.fillText(`VAT No ${vatNo}`, x, yy); yy += 12.5 }
    return yy
  }
  const yL = party(MARGIN, 'BILLED BY', co.providerName || '', co.providerAddress || '', co.providerVatNo || '')
  const yR = party(colR, 'BILLED TO', inv.recipient?.name || '', inv.recipient?.address || '', inv.recipient?.vatNo || '')
  y = Math.max(yL, yR) + 24

  // ---- lines: Description | Amount (EUR) | Amount (BGN). No quantity column (Alex). ----
  const showBgn = inv.showBgn && Number(inv.exchangeRate) > 0
  const bgnX = right
  const eurX = showBgn ? bgnX - 118 : right
  const descW = eurX - 150 - MARGIN
  ctx.font = `700 7.5px ${FONT}`; ctx.fillStyle = MUTED
  ctx.textAlign = 'left'; ctx.fillText('DESCRIPTION', MARGIN, y)
  ctx.textAlign = 'right'; ctx.fillText(showBgn ? `AMOUNT (${cur})` : 'AMOUNT', eurX, y)
  if (showBgn) ctx.fillText('AMOUNT (BGN)', bgnX, y)
  y += 8
  rule(y, INK, 1.2)
  y += 20

  for (const l of t.lines) {
    const top = y
    let ly = top
    ctx.textAlign = 'left'
    ctx.fillStyle = INK; ctx.font = `700 11px ${FONT}`
    for (const d of wrap(ctx, l.description || '', descW)) { ctx.fillText(d, MARGIN, ly); ly += 14 }
    ctx.fillStyle = MUTED; ctx.font = `400 9px ${FONT}`
    const sub = [(l.project || '').trim(), (l.date || '').trim() && dateDM(l.date)].filter(Boolean).join('   ·   ')
    if (sub) { for (const sl of wrap(ctx, sub, descW)) { ctx.fillText(sl, MARGIN, ly); ly += 12 } }
    ctx.textAlign = 'right'
    ctx.fillStyle = INK; ctx.font = `600 11px ${FONT}`
    ctx.fillText(money(lineNet(l), cur), eurX, top)
    if (showBgn) { ctx.fillStyle = MUTED; ctx.font = `400 10px ${FONT}`; ctx.fillText(moneyBgn(lineNet(l) * Number(inv.exchangeRate)), bgnX, top) }
    y = Math.max(ly, top + 4) + 12
    rule(y - 6)
    y += 8
  }

  // ---- totals: net / VAT lines when there is VAT, then the accent "Total due" card ----
  y += 6
  const cardW = 230
  const cardX = right - cardW
  if (t.vatPct > 0) {
    const sumRow = (label, val) => {
      ctx.font = `400 10px ${FONT}`
      ctx.fillStyle = MUTED; ctx.textAlign = 'left'; ctx.fillText(label, cardX + 16, y)
      ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.fillText(val, right - 14, y)
      y += 16
    }
    sumRow('Net', money(t.net, cur))
    sumRow(`VAT ${t.vatPct}%`, money(t.vat, cur))
    y += 4
  }
  // in words, VAT note and notes to the left of the card
  const leftW = CONTENT_W - cardW - 30
  ctx.textAlign = 'left'; ctx.fillStyle = MUTED; ctx.font = `400 9.5px ${FONT}`
  let ny = y + 6
  for (const l of wrap(ctx, `In words: ${amountInWords(t.total, cur)}`, leftW)) { ctx.fillText(l, MARGIN, ny); ny += 13 }
  if (t.vatPct === 0 && inv.vatNote) { for (const l of wrap(ctx, inv.vatNote, leftW)) { ctx.fillText(l, MARGIN, ny); ny += 13 } }
  if (inv.notes) { ny += 4; for (const l of wrap(ctx, inv.notes, leftW)) { ctx.fillText(l, MARGIN, ny); ny += 13 } }
  // the card: light grey with dark text (Alex: not red)
  const cardH = showBgn ? 62 : 54
  ctx.fillStyle = CARD
  roundRect(ctx, cardX, y - 6, cardW, cardH, 8); ctx.fill()
  ctx.textAlign = 'left'
  ctx.fillStyle = MUTED; ctx.font = `700 8px ${FONT}`
  ctx.fillText('TOTAL DUE', cardX + 16, y + 12)
  ctx.fillStyle = INK; ctx.font = `800 20px ${FONT}`
  ctx.fillText(money(t.total, cur), cardX + 16, y + 36)
  if (showBgn) {
    ctx.fillStyle = MUTED; ctx.font = `400 8.5px ${FONT}`
    ctx.fillText(`${moneyBgn(t.totalBgn)}  ·  rate ${inv.exchangeRate}`, cardX + 16, y + 50)
  }
  y = Math.max(y - 6 + cardH, ny) + 22

  // ---- payment box: bank / BIC / IBAN side by side ----
  const pay = [['BANK', co.bankName], ['BIC / SWIFT', co.bankBic], ['IBAN', co.bankIban]].filter((p) => p[1])
  if (pay.length) {
    const pw = (CONTENT_W - 32) / pay.length
    ctx.font = `600 9.5px ${FONT}`
    const rows = Math.max(...pay.map((p) => wrap(ctx, p[1], pw - 12).length))
    const boxH = 44 + (rows - 1) * 11
    ctx.fillStyle = SHADE
    roundRect(ctx, MARGIN, y, CONTENT_W, boxH, 8); ctx.fill()
    pay.forEach((p, i) => {
      const px = MARGIN + 16 + i * pw
      ctx.textAlign = 'left'
      ctx.fillStyle = MUTED; ctx.font = `700 7.5px ${FONT}`
      ctx.fillText(p[0], px, y + 18)
      ctx.fillStyle = INK; ctx.font = `600 9.5px ${FONT}`
      wrap(ctx, p[1], pw - 12).forEach((l, k) => ctx.fillText(l, px, y + 32 + k * 11))
    })
    y += boxH
  }

  // ---- signatures: stamp above the provider line, two lines at the foot of the page ----
  const lineY = Math.max(y + 110, PAGE_H - 46)
  if (stamp) {
    const k = Math.min((colW - 10) / stamp.width, 84 / stamp.height, 1)
    const w = stamp.width * k, h = stamp.height * k
    ctx.drawImage(stamp, MARGIN, lineY - 6 - h, w, h)
  }
  ctx.strokeStyle = LINE; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(MARGIN, lineY); ctx.lineTo(MARGIN + colW, lineY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(colR, lineY); ctx.lineTo(colR + colW, lineY); ctx.stroke()
  ctx.fillStyle = MUTED; ctx.font = `400 8.5px ${FONT}`; ctx.textAlign = 'left'
  ctx.fillText('Provider · Signature & stamp', MARGIN, lineY + 13)
  ctx.fillText('Recipient · Signature & stamp', colR, lineY + 13)

  // thin accent bar along the bottom edge
  ctx.fillStyle = ACCENT
  ctx.fillRect(0, PAGE_H - 6, PAGE_W, 6)

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

export async function previewInvoicePdf(inv) {
  const canvas = await renderInvoice(inv)
  const bytes = buildPdf([{ bytes: await canvasToJpegBytes(canvas, 0.92), width: canvas.width, height: canvas.height }])
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export function getInvoiceEmailTemplate(inv) {
  const t = invoiceTotals(inv)
  const co = inv.company || {}
  const cur = inv.currency || 'EUR'
  const client = inv.recipient?.name || 'Client'
  const showBgn = inv.showBgn && Number(inv.exchangeRate) > 0

  const linesHtml = t.lines.map(l => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e6e4df;">${l.description || ''}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e6e4df; text-align: right;">${money(lineNet(l), cur)}</td>
      ${showBgn ? `<td style="padding: 12px; border-bottom: 1px solid #e6e4df; text-align: right;">${moneyBgn(lineNet(l) * Number(inv.exchangeRate))}</td>` : ''}
    </tr>
  `).join('')

  const totalHtml = `
    <tr>
      <td style="padding: 12px; font-weight: bold;">Total</td>
      <td style="padding: 12px; text-align: right; font-weight: bold; color: #C8503F;">${money(t.total, cur)}</td>
      ${showBgn ? `<td style="padding: 12px; text-align: right; font-weight: bold;">${moneyBgn(t.totalBgn)}</td>` : ''}
    </tr>
  `

  const headerHtml = `
    <tr style="background-color: #f6f5f2;">
      <th style="padding: 12px; text-align: left; font-weight: bold; color: #16181d;">Description</th>
      <th style="padding: 12px; text-align: right; font-weight: bold; color: #16181d;">${cur}</th>
      ${showBgn ? `<th style="padding: 12px; text-align: right; font-weight: bold; color: #16181d;">BGN</th>` : ''}
    </tr>
  `

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${inv.number || ''}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #16181d; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="margin-bottom: 40px;">
      <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #C8503F;">Invoice #${inv.number || ''}</h1>
      <p style="margin: 0; color: #6b7078; font-size: 14px;">Date: ${new Date(inv.date || '').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
    </div>

    <div style="margin-bottom: 30px; padding: 20px; background-color: #f6f5f2; border-radius: 8px;">
      <p style="margin: 0 0 10px 0;"><strong>From:</strong></p>
      <p style="margin: 0;">${co.providerName || 'The Mad Lions'}</p>
      <p style="margin: 5px 0 0 0; color: #6b7078; font-size: 14px;">${co.providerAddress || ''}</p>
    </div>

    <div style="margin-bottom: 30px; padding: 20px; background-color: #f6f5f2; border-radius: 8px;">
      <p style="margin: 0 0 10px 0;"><strong>Bill To:</strong></p>
      <p style="margin: 0;">${client}</p>
      <p style="margin: 5px 0 0 0; color: #6b7078; font-size: 14px;">${inv.recipient?.address || ''}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <thead>
        ${headerHtml}
      </thead>
      <tbody>
        ${linesHtml}
        ${totalHtml}
      </tbody>
    </table>

    <div style="padding: 20px; background-color: #f6f5f2; border-radius: 8px; margin-bottom: 30px;">
      <p style="margin: 0 0 10px 0;"><strong>Payment Details:</strong></p>
      <p style="margin: 5px 0; color: #6b7078; font-size: 14px;">
        Bank: ${co.bankName || ''}<br>
        BIC/SWIFT: ${co.bankBic || ''}<br>
        IBAN: ${co.bankIban || ''}
      </p>
    </div>

    <p style="margin: 0; color: #6b7078; font-size: 13px; text-align: center;">
      Please find the invoice PDF attached. If you have any questions, feel free to reach out.
    </p>
  </div>
</body>
</html>
  `
}
