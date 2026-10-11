/* Text with a little formatting (Alex, 11 Oct: "make texts smaller and bigger, give it tools", "and
   alignment"), for the ordino's Note and the production's own sections. Kept as a small html: bold,
   italic, underline, lists, line breaks, <font size> for bigger or smaller text and a line's
   text-align, nothing else. The same
   cleaning runs where it is written and on the public link, so a link can never carry anything
   but these. */

const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'UL', 'OL', 'LI', 'FONT'])
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
      // alignment (Alex, 11 Oct) on a line: left, centre or right, from a style or an align attribute
      const align = /^(DIV|P|LI)$/.test(el.tagName) ? (el.style?.textAlign || el.getAttribute('align') || '').toLowerCase() : ''
      for (const a of [...el.attributes]) el.removeAttribute(a.name)
      if (size && /^[1-7]$/.test(size)) el.setAttribute('size', size)
      if (/^(left|center|right|justify)$/.test(align)) el.setAttribute('style', `text-align: ${align}`)
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
