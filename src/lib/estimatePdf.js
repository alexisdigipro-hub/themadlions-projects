/*
 * Cost estimation → a real PDF, saved with one click, no print dialog in between.
 *
 * npm's registry is unreachable from where this app is built in this session, so a normal
 * "add jsPDF" was not possible; a vendored copy could not be fetched either, every outside host
 * was blocked. And jsPDF's own built-in fonts do not carry Greek glyphs any more than the ones
 * below do, so embedding one would not by itself have solved that.
 *
 * So the page is drawn as it would look, at a good resolution, onto a plain <canvas> (Greek and
 * all, since the browser's own font stack draws it, the same way it draws any other web page);
 * each page becomes one JPEG; those JPEGs are wrapped in a hand-written, minimal but valid PDF
 * (a Catalog, a Pages tree, one Page + one Image XObject + one content stream per page, an xref
 * table). No embedded fonts, no external files, nothing to fetch: `buildPdf` below is a pure
 * function of some page images, easy to unit-test outside a browser; `downloadEstimatePdf` is
 * the only part that touches the DOM.
 */

import { amount, lineAmount } from './estimate.js'

const PAGE_W = 595.28 // A4 in points
const PAGE_H = 841.89
const MARGIN = 50
const CONTENT_W = PAGE_W - MARGIN * 2
const SCALE = 2 // canvas px per pt: about 144dpi, crisp enough to read comfortably when printed

const INK = '#15171c'
const MUTED = '#6b7280'
const LINE = '#e4e4e7'
const ACCENT = '#C8503F'

/* One line, shortened with an ellipsis if it would not fit — for the running header, where the
   title sits next to "Page N" and never gets to wrap. */
function fitText(ctx, text, maxWidth) {
  const s = String(text || '')
  if (ctx.measureText(s).width <= maxWidth) return s
  let lo = 0, hi = s.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (ctx.measureText(s.slice(0, mid) + '…').width <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return s.slice(0, lo) + '…'
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

/* Renders the estimate onto one or more A4 canvases, wrapping and paging as it goes. Returns
   [{ canvas, width, height }], canvas pixel size already includes SCALE. */
export function renderPages(d, t, groups, cur) {
  const pages = []
  const font = 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif'
  let canvas, ctx, y
  const hr = (yy = y) => {
    ctx.strokeStyle = LINE
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(MARGIN, yy)
    ctx.lineTo(PAGE_W - MARGIN, yy)
    ctx.stroke()
  }
  const newPage = () => {
    canvas = document.createElement('canvas')
    canvas.width = Math.round(PAGE_W * SCALE)
    canvas.height = Math.round(PAGE_H * SCALE)
    ctx = canvas.getContext('2d')
    ctx.scale(SCALE, SCALE)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, PAGE_W, PAGE_H)
    ctx.textBaseline = 'alphabetic'
    pages.push({ canvas, width: canvas.width, height: canvas.height })
    y = MARGIN
    // A page after the first has no letterhead of its own, so a stray page never loses its
    // context: a small running header, then straight back into the table.
    if (pages.length > 1) {
      y += 8
      ctx.fillStyle = MUTED
      ctx.font = `400 10px ${font}`
      ctx.textAlign = 'left'
      ctx.fillText(fitText(ctx, d.title, CONTENT_W - 60), MARGIN, y)
      ctx.textAlign = 'right'
      ctx.fillText(`Page ${pages.length}`, PAGE_W - MARGIN, y)
      ctx.textAlign = 'left'
      y += 16
      hr()
      y += 26
    }
  }
  const ensure = (need) => {
    if (y + need > PAGE_H - MARGIN) newPage()
  }

  newPage()

  // ---- header: company ----
  ctx.fillStyle = MUTED
  ctx.font = `700 10px ${font}`
  ctx.textAlign = 'center'
  ctx.fillText((d.company?.name || 'THEMADLIONS').toUpperCase(), PAGE_W / 2, y + 10)
  y += 26
  hr()
  y += 30

  // ---- title block ----
  ctx.fillStyle = ACCENT
  ctx.font = `700 10px ${font}`
  ctx.fillText(`COST ESTIMATION${d.version ? ` · ${d.version}` : ''}`, PAGE_W / 2, y)
  y += 24
  ctx.fillStyle = INK
  ctx.font = `700 23px ${font}`
  for (const tl of wrapText(ctx, d.title || '', CONTENT_W)) { ctx.fillText(tl, PAGE_W / 2, y); y += 27 }
  if (d.client) {
    ctx.fillStyle = MUTED
    ctx.font = `400 13px ${font}`
    ctx.fillText(d.client, PAGE_W / 2, y)
    y += 18
  }
  if (d.recipient?.name) {
    ctx.fillStyle = MUTED
    ctx.font = `700 10px ${font}`
    ctx.fillText(`FOR ${d.recipient.name.toUpperCase()}`, PAGE_W / 2, y)
    y += 18
  }
  ctx.textAlign = 'left'
  if (d.intro) {
    ctx.fillStyle = INK
    ctx.font = `400 12px ${font}`
    const lines = wrapText(ctx, d.intro, CONTENT_W)
    y += 10
    for (const l of lines) { ctx.fillText(l, MARGIN, y); y += 17 }
  }
  y += 20
  hr()
  y += 26

  // ---- what it covers ----
  ctx.fillStyle = MUTED
  ctx.font = `700 10px ${font}`
  ctx.fillText('WHAT IT COVERS', MARGIN, y)
  y += 20

  // Two columns: the description gets whatever is left of the amount's own reserved width.
  const AMT_X = PAGE_W - MARGIN
  const AMT_COL_W = 90
  const WHAT_W = (AMT_X - AMT_COL_W) - MARGIN - 16

  for (const g of groups) {
    if (g.label) {
      ensure(26)
      ctx.fillStyle = MUTED
      ctx.font = `700 10px ${font}`
      ctx.textAlign = 'left'
      ctx.fillText(g.label.toUpperCase(), MARGIN, y)
      y += 18
    }
    for (const l of g.rows) {
      ctx.font = `400 12.5px ${font}`
      const whatLines = wrapText(ctx, l.what, WHAT_W)
      const rowH = Math.max(20, whatLines.length * 16 + 6)
      ensure(rowH)
      const rowTop = y
      ctx.fillStyle = INK
      ctx.textAlign = 'left'
      let ly = rowTop
      for (const wl of whatLines) { ctx.fillText(wl, MARGIN, ly); ly += 16 }
      ctx.fillStyle = INK
      ctx.font = `400 12.5px ${font}`
      ctx.textAlign = 'right'
      ctx.fillText(amount(lineAmount(l), cur), AMT_X, rowTop)
      ctx.textAlign = 'left'
      y = rowTop + rowH
      ctx.strokeStyle = LINE
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(MARGIN, y - 2); ctx.lineTo(PAGE_W - MARGIN, y - 2); ctx.stroke()
    }
    if (g.label && g.rows.length > 1) {
      // ensure() may start a fresh page and snap y to the top margin: the +14 gap has to come
      // after that check, or a page break leaves this line touching the very top edge.
      ensure(34)
      y += 14
      ctx.fillStyle = MUTED
      ctx.font = `400 11px ${font}`
      ctx.textAlign = 'left'
      ctx.fillText('Subtotal', MARGIN, y)
      ctx.textAlign = 'right'
      ctx.fillText(amount(g.sum, cur), AMT_X, y)
      ctx.textAlign = 'left'
      y += 20
    }
  }

  // ---- totals ----
  ensure(110)
  y += 14
  const totLines = [['Subtotal', amount(t.subtotal, cur), false]]
  if (t.discount > 0) totLines.push(['Discount', `− ${amount(t.discount, cur)}`, false])
  if (t.vatPct > 0) totLines.push([`VAT ${t.vatPct}%`, amount(t.vat, cur), false])
  totLines.push(['Total', amount(t.total, cur), true])
  for (const [label, val, isTotal] of totLines) {
    ctx.font = isTotal ? `700 15px ${font}` : `400 12.5px ${font}`
    ctx.fillStyle = isTotal ? INK : MUTED
    ctx.textAlign = 'left'
    ctx.fillText(label, AMT_X - 220, y)
    ctx.fillStyle = isTotal ? ACCENT : INK
    ctx.textAlign = 'right'
    ctx.fillText(val, AMT_X, y)
    y += isTotal ? 22 : 18
  }

  // ---- valid until / terms ----
  if (d.validUntil || d.terms) {
    ensure(60)
    y += 10
    hr()
    y += 24
    ctx.textAlign = 'center'
    if (d.validUntil) {
      const expired = d.validUntil < new Date().toISOString().slice(0, 10)
      ctx.fillStyle = expired ? '#b3261e' : MUTED
      ctx.font = `400 12px ${font}`
      const label = expired ? 'This estimate ran out on ' : 'Valid until '
      const dateStr = new Date(`${d.validUntil}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      ctx.fillText(`${label}${dateStr}`, PAGE_W / 2, y)
      y += 20
    }
    if (d.terms) {
      ctx.fillStyle = MUTED
      ctx.font = `400 11.5px ${font}`
      for (const l of wrapText(ctx, d.terms, CONTENT_W * 0.75)) { ctx.fillText(l, PAGE_W / 2, y); y += 16 }
    }
    ctx.textAlign = 'left'
  }

  // ---- footer (contact), on the last page only ----
  const contact = [d.contact?.name, d.contact?.email, d.contact?.phone].filter(Boolean).join('  ·  ')
  if (contact) {
    ctx.fillStyle = MUTED
    ctx.font = `400 10.5px ${font}`
    ctx.textAlign = 'center'
    ctx.fillText(contact, PAGE_W / 2, PAGE_H - MARGIN + 16)
    ctx.textAlign = 'left'
  }

  return pages
}

export const canvasToJpegBytes = (canvas, quality = 0.9) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? blob.arrayBuffer().then((b) => resolve(new Uint8Array(b))) : reject(new Error('Could not render the page.'))),
      'image/jpeg',
      quality
    )
  })

/* A minimal but valid PDF: pages, each one a full-bleed JPEG. Pure and DOM-free, so it can be
   tested with plain fake bytes. `pages`: [{ bytes: Uint8Array (JPEG), width, height }] in px. */
export function buildPdf(pages) {
  const enc = new TextEncoder()
  const chunks = []
  const offsets = {}
  let offset = 0
  const push = (u8) => { chunks.push(u8); offset += u8.length }
  const pushStr = (s) => push(enc.encode(s))
  const writeObj = (id, header, bodyBytes, tail = 'endobj\n') => {
    offsets[id] = offset
    pushStr(`${id} 0 obj\n${header}`)
    if (bodyBytes) push(bodyBytes)
    pushStr(tail)
  }

  const N = pages.length
  const catalogId = 1
  const pagesId = 2
  const pageIds = [], imgIds = [], contentIds = []
  let next = 3
  for (let i = 0; i < N; i++) { pageIds.push(next++); imgIds.push(next++); contentIds.push(next++) }
  const totalObjs = next - 1

  pushStr('%PDF-1.4\n')
  writeObj(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>\n`)
  writeObj(pagesId, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${N} >>\n`)
  for (let i = 0; i < N; i++) {
    const p = pages[i]
    writeObj(
      pageIds[i],
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /XObject << /Im0 ${imgIds[i]} 0 R >> >> /Contents ${contentIds[i]} 0 R >>\n`
    )
    writeObj(
      imgIds[i],
      `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`,
      p.bytes,
      '\nendstream\nendobj\n'
    )
    const cs = `q ${PAGE_W} 0 0 ${PAGE_H} 0 0 cm /Im0 Do Q`
    const csBytes = enc.encode(cs)
    writeObj(contentIds[i], `<< /Length ${csBytes.length} >>\nstream\n${cs}\nendstream\n`)
  }

  const xrefStart = offset
  const pad10 = (n) => String(n).padStart(10, '0')
  pushStr('xref\n')
  pushStr(`0 ${totalObjs + 1}\n`)
  pushStr('0000000000 65535 f\r\n')
  for (let id = 1; id <= totalObjs; id++) pushStr(`${pad10(offsets[id])} 00000 n\r\n`)
  pushStr(`trailer\n<< /Size ${totalObjs + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)

  const out = new Uint8Array(offset)
  let pos = 0
  for (const c of chunks) { out.set(c, pos); pos += c.length }
  return out
}

/* Draws the estimate, turns each page into a PDF page, and saves it — no print dialog, no
   server round trip, no library to fetch. */
export async function downloadEstimatePdf(d, t, groups, cur, filename) {
  const canvasPages = renderPages(d, t, groups, cur)
  const pages = []
  for (const p of canvasPages) pages.push({ bytes: await canvasToJpegBytes(p.canvas), width: p.width, height: p.height })
  const bytes = buildPdf(pages)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'estimate.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
