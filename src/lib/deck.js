/*
 * Presentations (moodboards, treatments) drawn in the house style of Alex's Keynote template
 * "MB - Template": a white card on a two-tone grey ground, the lion symbol, titles in a light
 * and a black weight, grey boxes where a picture is still missing, the TML letters bottom right.
 *
 * Every slide is drawn on a 1920×1080 canvas by drawSlide(); the editor shows those canvases
 * as previews and the PDF is those same canvases as JPEG pages (buildPdf from estimatePdf.js),
 * so what is on screen is what goes out. The template's own typeface, Cera GR, is a paid font;
 * Commissioner (Google Fonts, Greek included, Thin to Black) stands in for it.
 */
import { buildPdf, canvasToJpegBytes } from './estimatePdf.js'
import { photoUrls } from './photos.js'
import { uid } from './store.jsx'

export const W = 1920
export const H = 1080
const FONT = "'Commissioner', 'Helvetica Neue', Arial, sans-serif"
const INK = '#151515'
const TEXT = '#4a4a4a'
const BOX = '#e2e2e4'
const CARD = { x: 60, y: 64, w: 1800, h: 952 }

export const LAYOUTS = [
  ['cover', 'Cover'],
  ['overview', 'Title and text, logo behind'],
  ['box', 'Title and text in a box'],
  ['grid', 'Title, a line and 5 pictures'],
  ['side', 'Text on the left, 3 pictures'],
  ['end', 'Closing logo'],
]
export const PHOTO_SLOTS = { grid: 5, side: 3 }
export const HAS_TEXT = { cover: true, overview: true, box: true, grid: true, side: true }

const slide = (layout, title, text = '') => ({ id: uid(), layout, title, text, photos: [] })

/* The template's seven slides, empty of content, for a project that has no presentation yet. */
export function starterSlides() {
  return [
    slide('cover', 'MOOD*BOARD*'),
    slide('overview', '*OVER*VIEW'),
    slide('box', 'SCRIPT *| STUDIO VERSION*'),
    slide('grid', 'SETUP *ΣΑΛΟΝΙ*'),
    slide('grid', 'PROPS'),
    slide('side', 'WARDROBE'),
    slide('end', ''),
  ]
}
export const newSlide = (layout) => slide(layout, layout === 'cover' ? 'MOOD*BOARD*' : layout === 'end' ? '' : 'TITLE')

/* "MOOD*BOARD*" → light "MOOD" + black "BOARD": stars mark the bold part, as in WhatsApp. */
export function titleRuns(t) {
  const out = []
  String(t || '').split('*').forEach((part, i) => { if (part) out.push({ text: part, bold: i % 2 === 1 }) })
  return out
}

/* ---------- loading: fonts, logos, pictures ---------- */

let fontsReady = null
export function loadDeckFonts() {
  if (!fontsReady) {
    fontsReady = (async () => {
      if (!document.getElementById('font-deck')) {
        const l = document.createElement('link')
        l.id = 'font-deck'
        l.rel = 'stylesheet'
        l.href = 'https://fonts.googleapis.com/css2?family=Commissioner:wght@200;300;400;600;800;900&display=swap'
        document.head.appendChild(l)
        await new Promise((res) => { l.onload = res; l.onerror = res })
      }
      const sample = 'ΑΒΓ abc ΣΑΛΟΝΙ'
      await Promise.all([200, 300, 400, 600, 800, 900].map((w) => document.fonts.load(`${w} 40px Commissioner`, sample).catch(() => {})))
    })()
  }
  return fontsReady
}

const bitmap = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Could not load a picture (${r.status}).`)
  return createImageBitmap(await r.blob())
}

let assets = null
export function loadDeckAssets() {
  if (!assets) {
    const base = import.meta.env.BASE_URL || './'
    assets = Promise.all([bitmap(`${base}deck/tml-symbol.png`), bitmap(`${base}deck/tml-letters.png`)]).then(([symbol, letters]) => ({ symbol, letters }))
  }
  return assets
}

const pictureCache = new Map() // photo id -> Promise<ImageBitmap>
export async function loadSlidePhotos(photos) {
  const missing = photos.filter((p) => !pictureCache.has(p.id))
  if (missing.length) {
    const urls = await photoUrls(missing)
    missing.forEach((p) => { if (urls[p.id]) pictureCache.set(p.id, bitmap(urls[p.id]).catch(() => null)) })
  }
  const out = {}
  await Promise.all(photos.map(async (p) => { out[p.id] = (await pictureCache.get(p.id)) || null }))
  return out
}

/* ---------- drawing ---------- */

function frame(ctx, a) {
  ctx.fillStyle = '#f3f3f3'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#dcdde0'
  ctx.fillRect(0, 0, 690, H)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur = 34
  ctx.shadowOffsetY = 10
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(CARD.x, CARD.y, CARD.w, CARD.h)
  ctx.restore()
  if (a.letters) {
    const w = 120
    ctx.globalAlpha = 0.28
    ctx.drawImage(a.letters, CARD.x + CARD.w - w - 10, CARD.y + CARD.h + 18, w, (w * a.letters.height) / a.letters.width)
    ctx.globalAlpha = 1
  }
}

function symbol(ctx, a, cx, cy, h, alpha = 1) {
  if (!a.symbol) return
  const w = (h * a.symbol.width) / a.symbol.height
  ctx.globalAlpha = alpha
  ctx.drawImage(a.symbol, cx - w / 2, cy - h / 2, w, h)
  ctx.globalAlpha = 1
}

/* Draws a title made of light and black runs; returns its width. align: 'left' | 'center'. */
function title(ctx, text, x, y, size, { align = 'left', light = 300, bold = 900, color = INK, upper = true } = {}) {
  const runs = titleRuns(upper ? String(text || '').toUpperCase() : text)
  const font = (b) => `${b ? bold : light} ${size}px ${FONT}`
  const total = runs.reduce((a, r) => { ctx.font = font(r.bold); return a + ctx.measureText(r.text).width }, 0)
  let cx = align === 'center' ? x - total / 2 : x
  ctx.fillStyle = color
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  for (const r of runs) {
    ctx.font = font(r.bold)
    ctx.fillText(r.text, cx, y)
    cx += ctx.measureText(r.text).width
  }
  return total
}

function wrap(ctx, text, maxWidth) {
  const lines = []
  for (const para of String(text || '').split('\n')) {
    if (!para.trim()) { lines.push(''); continue }
    let line = ''
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word } else line = test
    }
    lines.push(line)
  }
  return lines
}

/* Paragraph text inside a box; shrinks the size until it fits the height. */
function body(ctx, text, x, y, w, h, { size = 24, align = 'left', color = TEXT, weight = 300 } = {}) {
  let s = size
  let lines
  for (;;) {
    ctx.font = `${weight} ${s}px ${FONT}`
    lines = wrap(ctx, text, w)
    if (lines.length * s * 1.55 <= h || s <= 12) break
    s -= 1
  }
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  const lx = align === 'center' ? x + w / 2 : x
  lines.forEach((ln, i) => ctx.fillText(ln, lx, y + i * s * 1.55))
  ctx.textAlign = 'left'
}

function picture(ctx, img, x, y, w, h) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (img) {
    const k = Math.max(w / img.width, h / img.height)
    const iw = img.width * k, ih = img.height * k
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)
  } else {
    ctx.fillStyle = BOX
    ctx.fillRect(x, y, w, h)
  }
  ctx.restore()
}

/* Fills `canvas` (W×H) with one slide. `ctxData`: { assets, pictures: {photoId: ImageBitmap}, subtitle } */
export function drawSlide(canvas, s, { assets: a = {}, pictures = {}, subtitle = '' } = {}) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = (i) => pictures[s.photos?.[i]?.id] || null
  ctx.clearRect(0, 0, W, H)

  if (s.layout === 'end') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    symbol(ctx, a, W / 2, H / 2, 700, 0.07)
    if (a.letters) {
      const w = 360
      ctx.globalAlpha = 0.85
      ctx.drawImage(a.letters, W / 2 - w / 2, H / 2 - (w * a.letters.height) / a.letters.width / 2, w, (w * a.letters.height) / a.letters.width)
      ctx.globalAlpha = 1
    }
    return canvas
  }

  frame(ctx, a)

  if (s.layout === 'cover') {
    symbol(ctx, a, 395, 540, 190)
    ctx.fillStyle = '#8c8c8c'
    ctx.fillRect(688, 315, 3, 445)
    title(ctx, s.title || 'MOOD*BOARD*', 742, 556, 54)
    ctx.font = `300 26px ${FONT}`
    ctx.fillStyle = '#2b2b2b'
    ctx.textBaseline = 'top'
    ctx.fillText((s.text || subtitle).toUpperCase(), 744, 580)
    return canvas
  }

  if (s.layout === 'overview') {
    symbol(ctx, a, 380, 570, 300, 0.12)
    title(ctx, s.title, 360, 600, 44)
    body(ctx, s.text, 790, 470, 1000, 470, { size: 25 })
    return canvas
  }

  if (s.layout === 'box') {
    symbol(ctx, a, 190, 240, 170, 0.1)
    title(ctx, s.title, 180, 222, 44)
    ctx.fillStyle = '#f2f2f3'
    ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(176, 290, 1570, 668, 8) : ctx.rect(176, 290, 1570, 668)
    ctx.fill()
    body(ctx, s.text, 216, 330, 1490, 600, { size: 25 })
    return canvas
  }

  if (s.layout === 'grid') {
    symbol(ctx, a, 190, 205, 150, 0.1)
    title(ctx, s.title, 180, 192, 42)
    if (s.text) body(ctx, s.text, 182, 218, 1560, 64, { size: 21 })
    const x0 = 180, y0 = 300, cw = 510, gap = 22, rh = 300
    picture(ctx, img(0), x0, y0, cw, rh)
    picture(ctx, img(1), x0 + cw + gap, y0, cw, rh)
    picture(ctx, img(2), x0, y0 + rh + gap, cw, rh)
    picture(ctx, img(3), x0 + cw + gap, y0 + rh + gap, cw, rh)
    picture(ctx, img(4), x0 + (cw + gap) * 2, y0, cw, rh * 2 + gap)
    return canvas
  }

  if (s.layout === 'side') {
    symbol(ctx, a, 390, 470, 210, 0.1)
    title(ctx, s.title, 390, 500, 40, { align: 'center', light: 400, bold: 900 })
    body(ctx, s.text, 160, 530, 460, 330, { size: 21, align: 'center' })
    ctx.fillStyle = '#9a9a9a'
    ctx.fillRect(687, 230, 2, 620)
    picture(ctx, img(0), 744, 232, 510, 300)
    picture(ctx, img(1), 744, 554, 510, 296)
    picture(ctx, img(2), 1278, 232, 510, 618)
    return canvas
  }
  return canvas
}

/* ---------- the PDF ---------- */

export async function deckPdfBlob(slides, subtitle) {
  await loadDeckFonts()
  const a = await loadDeckAssets()
  const pictures = await loadSlidePhotos(slides.flatMap((s) => s.photos || []))
  const pages = []
  for (const s of slides) {
    const c = drawSlide(document.createElement('canvas'), s, { assets: a, pictures, subtitle })
    pages.push({ bytes: await canvasToJpegBytes(c, 0.9), width: W, height: H })
  }
  // 16:9 page, 960×540 points (13.33×7.5 in, the size Keynote and PowerPoint export at)
  return new Blob([buildPdf(pages, { width: 960, height: 540 })], { type: 'application/pdf' })
}
