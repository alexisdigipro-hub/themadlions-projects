import { FONTS, ensureFontLoaded, fontById, fontStackOf } from './fonts.js'
/* How a cost estimation looks (Alex, 19 Oct: "settings for everything: letters, sizes, layout,
   colours, a photo"). Kept with the estimate's data as `look`, so the client's page, the live
   preview and the PDF all read the same thing. An estimate without one gets the company site's
   look, which is what every estimate had before. */

export const LOOK_DEFAULT = {
  bg: '#0b0b0c', text: '#f2f0ec', accent: '#d40000', advance: '#e0a33a', glow: true,
  font: 'sofia', titleWeight: 300, titleCaps: false, titleSize: 100, textSize: 100,
  align: 'center', lines: 'tiles', radius: 14, width: 'normal',
  cover: '', coverHeight: 'medium', coverDim: 55, coverY: 50,
  logo: true, logoImg: '', logoSize: 100, company: true,
  kicker: 'Cost estimation', covers: 'What it covers', subtotals: true,
  excludedTitle: 'Not included in the price',
}

/* Ready-made colour sets; each one only sets the colours, the rest of the look stays as it is. */
export const PRESETS = [
  ['Site', { bg: '#0b0b0c', text: '#f2f0ec', accent: '#d40000', advance: '#e0a33a', glow: true }],
  ['Paper', { bg: '#f6f3ec', text: '#18171a', accent: '#c8102e', advance: '#b7791f', glow: false }],
  ['Midnight', { bg: '#08101f', text: '#eef3ff', accent: '#4c8dff', advance: '#e0a33a', glow: true }],
  ['Cream', { bg: '#efe6d6', text: '#2a2118', accent: '#8a5a2b', advance: '#a8741a', glow: false }],
  ['Forest', { bg: '#0d1611', text: '#e9f0ea', accent: '#3fbf7f', advance: '#e0b04a', glow: true }],
  ['Mono', { bg: '#ffffff', text: '#111111', accent: '#111111', advance: '#7a7a7a', glow: false }],
]

/* The font comes from the Hub's one list of Greek fonts (src/lib/fonts.js, Alex 19 Oct: "all the Greek fonts"),
   so the estimate offers every one of them; the keys it used before keep working. */
const OLD_KEYS = { 'noto-serif': 'notoserif', didot: 'gfsdidot' }
export const fontKey = (k) => OLD_KEYS[k] || k || 'sofia'

export const lookOf = (d) => ({ ...LOOK_DEFAULT, ...(d?.look || {}) })
export const fontFamily = (L) => fontStackOf(fontById(fontKey(L.font)) || FONTS[0])
export const loadFont = (key) => { if (typeof document !== 'undefined') ensureFontLoaded(fontKey(key)) }

const rgb = (hex) => {
  const h = String(hex || '').replace('#', '')
  const x = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0')
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) || 0)
}
export const isLight = (hex) => { const [r, g, b] = rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 }
/* a over b, `k` of a: for the PDF, which cannot use CSS color-mix */
export const mix = (a, b, k) => '#' + rgb(a).map((v, i) => Math.round(v * k + rgb(b)[i] * (1 - k)).toString(16).padStart(2, '0')).join('')

/* The wrapper's class and CSS variables; every colour on the page is worked out from these. */
export function lookProps(L) {
  return {
    className: [
      'est-look', `est-lines-${L.lines}`, `est-w-${L.width}`, L.align === 'left' ? 'est-left' : '',
      isLight(L.bg) ? 'est-light' : '', L.glow ? 'est-glow' : '',
    ].filter(Boolean).join(' '),
    style: {
      '--bg': L.bg, '--text': L.text, '--accent': L.accent, '--amber': L.advance,
      '--est-on-accent': isLight(L.accent) ? '#111' : '#fff',
      '--est-font': fontFamily(L), '--est-tw': L.titleWeight,
      '--est-ts': (Number(L.titleSize) || 100) / 100, '--est-fs': (Number(L.textSize) || 100) / 100,
      '--est-r': `${Number(L.radius) || 0}px`, '--est-logo': (Number(L.logoSize) || 100) / 100,
    },
  }
}

/* A picked photo, made small enough to travel inside the estimate's data. */
export async function shrinkImage(file, max = 1600, type = 'image/jpeg') {
  const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
  const k = Math.min(1, max / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k)
  c.height = Math.round(img.height * k)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL(type, 0.82)
}
