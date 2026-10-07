/*
 * Presentations (moodboards, treatments) drawn in the house style of Alex's Keynote template
 * "MB - Template": a white card on a two-tone grey ground, the lion symbol, titles in a light
 * and a black weight, grey boxes where a picture is still missing, the TML letters bottom right.
 *
 * Alex then asked for other looks for the same slides (7 Oct): Noir, Editorial and Poster sit
 * next to the template's own (THEMES below), picked per presentation, drawn by the same layouts.
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
const SERIF = "'Noto Serif', Georgia, 'Times New Roman', serif"

/* The looks a presentation can take. Same slides, same layouts, same pictures; only how they are
   drawn changes, so switching costs nothing and can be undone. */
export const THEMES = [
  ['mb', 'MB Studio', 'The Keynote template: a white card on grey, the lion, light and black titles'],
  ['noir', 'Noir', 'Black, pictures edge to edge, a thin red line, white titles'],
  ['editorial', 'Editorial', 'Warm paper, serif titles, a magazine grid with fine rules'],
  ['poster', 'Poster', 'The project colour, huge titles, rounded pictures'],
]

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

/* Capitals the Greek way: no accents on an all-caps word ("ΜΑΡΙΝΑ", not "ΜΑΡΊΝΑ"). Only the
   tonos goes; the dialytika stays, since it changes how the word is read (ΠΡΩΤΕΪΝΗ). */
export const upperGr = (t) => String(t || '').toUpperCase().normalize('NFD').replace(/\u0301/g, '').normalize('NFC')

/* "MOOD*BOARD*" → light "MOOD" + black "BOARD": stars mark the bold part, as in WhatsApp. */
export function titleRuns(t) {
  const out = []
  String(t || '').split('*').forEach((part, i) => { if (part) out.push({ text: part, bold: i % 2 === 1 }) })
  return out
}

/* ---------- loading: fonts, logos, pictures ---------- */

let serifReady = null
function loadSerif() {
  if (!serifReady) {
    serifReady = (async () => {
      if (!document.getElementById('font-deck-serif')) {
        const l = document.createElement('link')
        l.id = 'font-deck-serif'
        l.rel = 'stylesheet'
        l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,300;0,400;0,700;1,300;1,400&display=swap'
        document.head.appendChild(l)
        await new Promise((res) => { l.onload = res; l.onerror = res })
      }
      await Promise.all(['300', '700', 'italic 300'].map((w) => document.fonts.load(`${w} 40px 'Noto Serif'`, 'ΑΒΓ abc').catch(() => {})))
    })()
  }
  return serifReady
}

let fontsReady = null
/* Commissioner always; the serif only for Editorial, so the other looks never fetch it. */
export function loadDeckFonts(theme = 'mb') {
  const extra = theme === 'editorial' ? loadSerif() : Promise.resolve()
  return Promise.all([loadSans(), extra])
}
function loadSans() {
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
function title(ctx, text, x, y, size, { align = 'left', light = 300, bold = 900, color = INK, upper = true, family = FONT, maxWidth = 0, boldStyle = '' } = {}) {
  const runs = titleRuns(upper ? upperGr(text) : text)
  const font = (b) => `${b ? `${boldStyle} ${bold}` : light} ${size}px ${family}`
  const measure = () => runs.reduce((a, r) => { ctx.font = font(r.bold); return a + ctx.measureText(r.text).width }, 0)
  let total = measure()
  // a long title steps down until it fits, rather than running off the slide
  while (maxWidth && total > maxWidth && size > 24) { size -= 2; total = measure() }
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
function body(ctx, text, x, y, w, h, { size = 24, align = 'left', color = TEXT, weight = 300, family = FONT, lh = 1.55 } = {}) {
  let s = size
  let lines
  for (;;) {
    ctx.font = `${weight} ${s}px ${family}`
    lines = wrap(ctx, text, w)
    if (lines.length * s * lh <= h || s <= 12) break
    s -= 1
  }
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  const lx = align === 'center' ? x + w / 2 : x
  lines.forEach((ln, i) => ctx.fillText(ln, lx, y + i * s * lh))
  ctx.textAlign = 'left'
}

function picture(ctx, img, x, y, w, h, { radius = 0, empty = BOX } = {}) {
  ctx.save()
  ctx.beginPath()
  if (radius && ctx.roundRect) ctx.roundRect(x, y, w, h, radius)
  else ctx.rect(x, y, w, h)
  ctx.clip()
  if (img) {
    const k = Math.max(w / img.width, h / img.height)
    const iw = img.width * k, ih = img.height * k
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)
  } else {
    ctx.fillStyle = empty
    ctx.fillRect(x, y, w, h)
  }
  ctx.restore()
}

/* The lion and the letters are black masks; the dark looks need them in another colour. */
const tinted = new Map()
function tint(bitmap, color) {
  if (!bitmap) return null
  const key = `${color}|${bitmap.width}x${bitmap.height}`
  if (!tinted.has(key)) {
    const c = document.createElement('canvas')
    c.width = bitmap.width
    c.height = bitmap.height
    const x = c.getContext('2d')
    x.drawImage(bitmap, 0, 0)
    x.globalCompositeOperation = 'source-in'
    x.fillStyle = color
    x.fillRect(0, 0, c.width, c.height)
    tinted.set(key, c)
  }
  return tinted.get(key)
}
function mark(ctx, bitmap, cx, cy, h, alpha = 1) {
  if (!bitmap) return
  const w = (h * bitmap.width) / bitmap.height
  ctx.globalAlpha = alpha
  ctx.drawImage(bitmap, cx - w / 2, cy - h / 2, w, h)
  ctx.globalAlpha = 1
}
function spaced(ctx, text, x, y, { size = 20, color = INK, weight = 600, family = FONT, spacing = 6, align = 'left' } = {}) {
  ctx.font = `${weight} ${size}px ${family}`
  ctx.fillStyle = color
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = align
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
  ctx.fillText(upperGr(text), x, y)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  ctx.textAlign = 'left'
}
/* Black or white, whichever reads on a ground of this colour. */
function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? '#141414' : '#ffffff'
}

/* Fills `canvas` (W×H) with one slide. `ctxData`: { assets, pictures: {photoId: ImageBitmap}, subtitle } */
export function drawSlide(canvas, s, { assets: a = {}, pictures = {}, subtitle = '', theme = 'mb', accent = '', company = '' } = {}) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = (i) => pictures[s.photos?.[i]?.id] || null
  ctx.clearRect(0, 0, W, H)
  if (theme === 'noir') return drawNoir(canvas, ctx, s, a, img, subtitle)
  if (theme === 'editorial') return drawEditorial(canvas, ctx, s, a, img, subtitle, company)
  if (theme === 'poster') return drawPoster(canvas, ctx, s, a, img, subtitle, accent)

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
    ctx.fillText(upperGr(s.text || subtitle), 744, 580)
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

/* ---------- Noir: black, pictures edge to edge, a thin red line ---------- */

const NOIR = { bg: '#0b0b0c', ink: '#ffffff', text: '#c4c4c4', muted: '#7d7d7d', red: '#C8503F', empty: '#1c1c1e', line: '#2c2c2e' }

function drawNoir(canvas, ctx, s, a, img, subtitle) {
  const N = NOIR
  const lion = tint(a.symbol, '#ffffff')
  const letters = tint(a.letters, '#ffffff')
  const pic = (i, x, y, w, h) => picture(ctx, img(i), x, y, w, h, { empty: N.empty })
  const rule = (x, y, w = 90) => { ctx.fillStyle = N.red; ctx.fillRect(x, y, w, 4) }
  const corner = () => { if (letters) { const w = 110; ctx.globalAlpha = 0.45; ctx.drawImage(letters, W - w - 60, H - 60 - (w * letters.height) / letters.width, w, (w * letters.height) / letters.width); ctx.globalAlpha = 1 } }
  ctx.fillStyle = N.bg
  ctx.fillRect(0, 0, W, H)

  if (s.layout === 'end') {
    mark(ctx, lion, W / 2, H / 2, 760, 0.05)
    if (letters) { const w = 380; ctx.globalAlpha = 0.92; ctx.drawImage(letters, W / 2 - w / 2, H / 2 - (w * letters.height) / letters.width / 2, w, (w * letters.height) / letters.width); ctx.globalAlpha = 1 }
    return canvas
  }
  if (s.layout === 'cover') {
    mark(ctx, lion, W / 2, H / 2, 820, 0.05)
    rule(W / 2 - 60, H / 2 - 110, 120)
    title(ctx, s.title || 'MOOD*BOARD*', W / 2, H / 2 + 40, 120, { align: 'center', light: 200, bold: 800, color: N.ink, maxWidth: 1640 })
    spaced(ctx, s.text || subtitle, W / 2, H / 2 + 120, { size: 26, color: N.muted, weight: 400, spacing: 8, align: 'center' })
    corner()
    return canvas
  }
  if (s.layout === 'overview') {
    title(ctx, s.title, 140, 300, 76, { light: 200, bold: 800, color: N.ink, maxWidth: 680 })
    rule(140, 336)
    body(ctx, s.text, 920, 230, 860, 720, { size: 32, color: N.text, weight: 300 })
    corner()
    return canvas
  }
  if (s.layout === 'box') {
    title(ctx, s.title, 140, 210, 66, { light: 200, bold: 800, color: N.ink, maxWidth: 1640 })
    rule(140, 244)
    ctx.strokeStyle = N.line
    ctx.lineWidth = 2
    ctx.strokeRect(140, 290, 1640, 660)
    body(ctx, s.text, 196, 340, 1528, 560, { size: 30, color: N.text })
    corner()
    return canvas
  }
  if (s.layout === 'grid') {
    // one tall picture on the left and four on the right, six-pixel black seams, no margins
    const g = 6, bw = 760, cw = (W - bw - g * 2) / 2, ch = (H - g) / 2
    pic(0, 0, 0, bw, H)
    pic(1, bw + g, 0, cw, ch)
    pic(2, bw + g * 2 + cw, 0, cw, ch)
    pic(3, bw + g, ch + g, cw, ch)
    pic(4, bw + g * 2 + cw, ch + g, cw, ch)
    const grad = ctx.createLinearGradient(0, H - 420, 0, H)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.82)')
    ctx.fillStyle = grad
    ctx.fillRect(0, H - 420, bw, 420)
    rule(64, H - 176)
    title(ctx, s.title, 64, H - 108, 58, { light: 200, bold: 800, color: N.ink, maxWidth: bw - 120 })
    if (s.text) body(ctx, s.text, 66, H - 88, bw - 130, 60, { size: 22, color: '#d8d8d8' })
    return canvas
  }
  if (s.layout === 'side') {
    const g = 6, x0 = 720, cw = 600, ch = (H - g) / 2
    title(ctx, s.title, 360, 420, 56, { align: 'center', light: 200, bold: 800, color: N.ink, maxWidth: 560 })
    rule(360 - 45, 452)
    body(ctx, s.text, 110, 500, 500, 420, { size: 25, align: 'center', color: N.text })
    pic(0, x0, 0, cw, ch)
    pic(1, x0, ch + g, cw, ch)
    pic(2, x0 + cw + g, 0, W - x0 - cw - g, H)
    return canvas
  }
  return canvas
}

/* ---------- Editorial: paper, serif titles, a magazine grid with fine rules ---------- */

const ED = { bg: '#f4f1ea', ink: '#1b1b1b', text: '#3d3a35', muted: '#857f75', empty: '#e3ddd1', rule: '#1b1b1b' }

function drawEditorial(canvas, ctx, s, a, img, subtitle, company) {
  const E = ED
  const pic = (i, x, y, w, h) => picture(ctx, img(i), x, y, w, h, { empty: E.empty })
  const hair = (x, y, w) => { ctx.fillStyle = E.rule; ctx.fillRect(x, y, w, 1.5) }
  const serifTitle = (t, x, y, size, maxWidth, align = 'left') => title(ctx, t, x, y, size, { family: SERIF, light: 300, bold: 700, boldStyle: 'italic', color: E.ink, upper: false, maxWidth, align })
  // a running head, as on a magazine page: the company on the left, the project on the right
  const head = () => {
    spaced(ctx, company || 'THE MAD LIONS', 120, 92, { size: 17, color: E.muted, weight: 600, spacing: 5 })
    spaced(ctx, subtitle, W - 120, 92, { size: 17, color: E.muted, weight: 600, spacing: 5, align: 'right' })
    hair(120, 116, W - 240)
  }
  ctx.fillStyle = E.bg
  ctx.fillRect(0, 0, W, H)

  if (s.layout === 'end') {
    mark(ctx, a.symbol, W / 2, H / 2 - 40, 300, 0.85)
    hair(W / 2 - 120, H / 2 + 160, 240)
    spaced(ctx, company || 'THE MAD LIONS', W / 2, H / 2 + 214, { size: 22, color: E.ink, weight: 600, spacing: 10, align: 'center' })
    return canvas
  }
  if (s.layout === 'cover') {
    hair(120, 150, W - 240)
    spaced(ctx, s.text || subtitle, 120, 470, { size: 24, color: E.muted, weight: 600, spacing: 8 })
    serifTitle(s.title || 'Mood*board*', 116, 680, 190, W - 240)
    hair(120, 880, W - 240)
    spaced(ctx, company || 'THE MAD LIONS', 120, 930, { size: 20, color: E.ink, weight: 600, spacing: 8 })
    mark(ctx, a.symbol, W - 190, 915, 90, 0.9)
    return canvas
  }
  head()
  if (s.layout === 'overview') {
    serifTitle(s.title, 120, 330, 104, 700)
    ctx.fillStyle = E.rule
    ctx.fillRect(900, 230, 1.5, 720)
    body(ctx, s.text, 980, 236, 820, 720, { size: 32, color: E.text, family: SERIF, weight: 300, lh: 1.6 })
    return canvas
  }
  if (s.layout === 'box') {
    serifTitle(s.title, 120, 270, 88, W - 240)
    // the text set as a page of an essay rather than inside a box
    body(ctx, s.text, 120, 340, W - 240, 620, { size: 30, color: E.text, family: SERIF, weight: 300, lh: 1.6 })
    return canvas
  }
  if (s.layout === 'grid') {
    serifTitle(s.title, 120, 236, 68, 1100)
    if (s.text) body(ctx, s.text, 1260, 186, 540, 70, { size: 20, color: E.muted })
    const y0 = 290, h = 670, bw = 900, g = 20, cw = (W - 240 - bw - g * 2) / 2, ch = (h - g) / 2
    pic(0, 120, y0, bw, h)
    pic(1, 120 + bw + g, y0, cw, ch)
    pic(2, 120 + bw + g * 2 + cw, y0, cw, ch)
    pic(3, 120 + bw + g, y0 + ch + g, cw, ch)
    pic(4, 120 + bw + g * 2 + cw, y0 + ch + g, cw, ch)
    return canvas
  }
  if (s.layout === 'side') {
    serifTitle(s.title, 120, 330, 78, 600)
    hair(120, 368, 120)
    body(ctx, s.text, 120, 410, 600, 540, { size: 27, color: E.text, family: SERIF, weight: 300, lh: 1.6 })
    const x0 = 800, g = 20, cw = 500, ch = (780 - g) / 2
    pic(0, x0, 180, cw, ch)
    pic(1, x0, 180 + ch + g, cw, ch)
    pic(2, x0 + cw + g, 180, W - 120 - x0 - cw - g, 780)
    return canvas
  }
  return canvas
}

/* ---------- Poster: the project colour, huge titles, rounded pictures ---------- */

function drawPoster(canvas, ctx, s, a, img, subtitle, accent) {
  const bg = /^#?[0-9a-f]{6}$/i.test(String(accent || '').trim()) ? (accent.startsWith('#') ? accent : `#${accent}`) : '#C8503F'
  const ink = inkOn(bg)
  const soft = ink === '#ffffff' ? 'rgba(255,255,255,0.82)' : 'rgba(20,20,20,0.78)'
  const empty = ink === '#ffffff' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'
  const lion = tint(a.symbol, ink)
  const letters = tint(a.letters, ink)
  const R = 28
  const pic = (i, x, y, w, h) => picture(ctx, img(i), x, y, w, h, { radius: R, empty })
  const big = (t, x, y, size, maxWidth, align = 'left') => title(ctx, t, x, y, size, { light: 300, bold: 900, color: ink, maxWidth, align })
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  if (s.layout === 'end') {
    mark(ctx, lion, W / 2, H / 2, 820, 0.1)
    if (letters) { const w = 440; ctx.drawImage(letters, W / 2 - w / 2, H / 2 - (w * letters.height) / letters.width / 2, w, (w * letters.height) / letters.width) }
    return canvas
  }
  if (s.layout === 'cover') {
    mark(ctx, lion, W - 280, H / 2, 600, 0.14)
    big(s.title || 'MOOD*BOARD*', 120, H / 2 + 60, 190, W - 240)
    spaced(ctx, s.text || subtitle, 126, H / 2 + 150, { size: 30, color: soft, weight: 600, spacing: 6 })
    return canvas
  }
  if (s.layout === 'overview') {
    big(s.title, 120, 290, 120, W - 240)
    body(ctx, s.text, 124, 360, 1180, 620, { size: 36, color: soft, weight: 400 })
    mark(ctx, lion, W - 300, H - 280, 360, 0.12)
    return canvas
  }
  if (s.layout === 'box') {
    big(s.title, 120, 200, 96, W - 240)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(120, 276, W - 240, 684, 36) : ctx.rect(120, 276, W - 240, 684)
    ctx.fill()
    body(ctx, s.text, 190, 336, W - 380, 564, { size: 32, color: '#2a2a2a', weight: 400 })
    return canvas
  }
  if (s.layout === 'grid') {
    big(s.title, 120, 180, 96, 1100)
    if (s.text) body(ctx, s.text, 1260, 112, 540, 90, { size: 22, color: soft })
    const g = 24, top = 256, h = (H - top - 96 - g) / 2, w3 = (W - 240 - g * 2) / 3, w2 = (W - 240 - g) / 2
    pic(0, 120, top, w3, h)
    pic(1, 120 + w3 + g, top, w3, h)
    pic(2, 120 + (w3 + g) * 2, top, w3, h)
    pic(3, 120, top + h + g, w2, h)
    pic(4, 120 + w2 + g, top + h + g, w2, h)
    return canvas
  }
  if (s.layout === 'side') {
    big(s.title, 120, 330, 88, 560)
    body(ctx, s.text, 124, 380, 560, 560, { size: 28, color: soft, weight: 400 })
    const g = 24, x0 = 760, cw = 520, ch = (H - 240 - g) / 2
    pic(0, x0, 120, cw, ch)
    pic(1, x0, 120 + ch + g, cw, ch)
    pic(2, x0 + cw + g, 120, W - 120 - x0 - cw - g, H - 240)
    return canvas
  }
  return canvas
}

/* ---------- the PDF ---------- */

/* One slide as a JPEG at `width` pixels, for the PDF and for the online link. 1600 wide is
   sharp on any screen and a page of a PDF, at about half the bytes of the full 1920 canvas. */
export async function slideJpeg(s, opts, { width = 1600, quality = 0.8, pictures } = {}) {
  const full = drawSlide(document.createElement('canvas'), s, { ...opts, pictures })
  const c = document.createElement('canvas')
  c.width = width
  c.height = Math.round((width * H) / W)
  c.getContext('2d').drawImage(full, 0, 0, c.width, c.height)
  return { bytes: await canvasToJpegBytes(c, quality), width: c.width, height: c.height }
}

export async function deckPdfBlob(slides, subtitle, { theme = 'mb', accent = '', company = '' } = {}) {
  await loadDeckFonts(theme)
  const a = await loadDeckAssets()
  const pictures = await loadSlidePhotos(slides.flatMap((s) => s.photos || []))
  const pages = []
  for (const s of slides) pages.push(await slideJpeg(s, { assets: a, subtitle, theme, accent, company }, { pictures }))
  // 16:9 page, 960×540 points (13.33×7.5 in, the size Keynote and PowerPoint export at)
  return new Blob([buildPdf(pages, { width: 960, height: 540 })], { type: 'application/pdf' })
}
