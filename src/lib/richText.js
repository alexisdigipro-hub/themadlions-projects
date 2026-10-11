/* Text with a little formatting (Alex, 11 Oct: "make texts smaller and bigger, give it tools", "and
   alignment"), for the ordino's Note and the production's own sections. Kept as a small html: bold,
   italic, underline, lists, line breaks, text size (a span's font-size in em, or the older <font
   size>), a typeface from the app's own list and a line's text-align, nothing else. The same
   cleaning runs where it is written and on the public link, so a link can never carry anything
   but these. */

import { FONTS } from './fonts.js'

// a typeface from the app's list as the CSS font-family it is written with
export const fontStack = (f) => `${f.family}, ${f.serif ? 'Georgia, serif' : 'system-ui, sans-serif'}`
const FACE_OF = (value) => FONTS.find((f) => String(value || '').replace(/["']/g, '').toLowerCase().startsWith(f.family.replace(/'/g, '').toLowerCase()))
// the faces a piece of html uses, so a page can fetch them before drawing it
export const facesIn = (html) => FONTS.filter((f) => String(html || '').includes(f.family.replace(/'/g, '')))

const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'UL', 'OL', 'LI', 'FONT', 'SPAN'])
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// plain text, as the ordino kept it before, made into the same html
export const textToHtml = (text) => esc(text || '').replace(/\n/g, '<br>')

// only the allowed tags, no attributes but a font size of 1 to 7; anything else keeps its text
export function cleanRich(html) {
  if (!html) return ''
  if (typeof DOMParser === 'undefined') return esc(String(html).replace(/<[^>]*>/g, ''))
  const doc = new DOMParser().parseFromString(`<body>${String(html)}</body>`, 'text/html')
  const walk = (node) => {
    for (const el of [...node.children]) {
      walk(el)
      if (!KEEP.has(el.tagName)) {
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE)$/.test(el.tagName)) { el.remove(); continue }
        el.replaceWith(...el.childNodes)
        continue
      }
      const size = el.tagName === 'FONT' ? el.getAttribute('size') : null
      // any text size, as a share of the text around it (Alex, 11 Oct: "as small as I want")
      const em = el.tagName === 'SPAN' ? /^(\d*\.?\d+)em$/.exec((el.style?.fontSize || '').trim()) : null
      const faceOf = el.tagName === 'SPAN' ? FACE_OF(el.style?.fontFamily) : null
      // alignment (Alex, 11 Oct) on a line: left, centre or right, from a style or an align attribute
      const align = /^(DIV|P|LI)$/.test(el.tagName) ? (el.style?.textAlign || el.getAttribute('align') || '').toLowerCase() : ''
      for (const a of [...el.attributes]) el.removeAttribute(a.name)
      if (size && /^[1-7]$/.test(size)) el.setAttribute('size', size)
      if (/^(left|center|right|justify)$/.test(align)) el.setAttribute('style', `text-align: ${align}`)
      if (el.tagName === 'SPAN') {
        // a span keeps a size in em and a face from the app's list, nothing else
        const n = em ? Math.min(6, Math.max(0.2, Number(em[1]))) : 0
        const css = [n ? `font-size: ${Math.round(n * 1000) / 1000}em` : '', faceOf ? `font-family: ${fontStack(faceOf)}` : ''].filter(Boolean).join('; ')
        if (css) el.setAttribute('style', css)
        else el.replaceWith(...el.childNodes)
      }
    }
  }
  walk(doc.body)
  return doc.body.innerHTML
}

// the html read back as plain text (messages, the plain copy kept next to it)
export function richToText(html) {
  if (!html) return ''
  if (typeof DOMParser === 'undefined') return String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
  const doc = new DOMParser().parseFromString(`<body>${String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|p|li)>/gi, '\n')}</body>`, 'text/html')
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}
