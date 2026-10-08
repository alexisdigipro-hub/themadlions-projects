/* .docx in and out for the Office page's documents (Alex, 8 Oct), no library. The editor works in
   HTML; this turns it into a Word file and a Word file back into it. Kept: headings, bold,
   italic, underline, strike-through, text colour, alignment, bullet and numbered lists (nested),
   checklists (as ☐ / ☑), tables, pictures and line breaks. Fonts, page layout, comments, tracked
   changes and the like are left to Word. */
import { readZip, writeZip, xmlEsc, zipText } from './zip.js'

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships'
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture'
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
const EMU = 9525 // per CSS pixel
const PAGE_PX = 600 // the widest a picture goes on an A4 page with normal margins

/* ---------- HTML -> .docx ---------- */
const hex = (c) => {
  if (!c) return ''
  const m = /^#([0-9a-f]{6})$/i.exec(c) || /^#([0-9a-f]{3})$/i.exec(c)
  if (m) return (m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1]).toUpperCase()
  const r = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c)
  return r ? [r[1], r[2], r[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase() : ''
}

export async function htmlToDocx(html) {
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html')
  const media = [] // [{ name, bytes, ext }]
  const nums = [] // ordered lists each get their own numbering, so each starts at 1
  let picId = 1

  const runProps = (st) => {
    let p = ''
    if (st.b) p += '<w:b/>'
    if (st.i) p += '<w:i/>'
    if (st.s) p += '<w:strike/>'
    if (st.color) p += `<w:color w:val="${st.color}"/>`
    if (st.u) p += '<w:u w:val="single"/>'
    return p ? `<w:rPr>${p}</w:rPr>` : ''
  }
  const styleFrom = (el, st) => {
    const n = { ...st }
    const tag = el.tagName
    if (tag === 'B' || tag === 'STRONG') n.b = true
    if (tag === 'I' || tag === 'EM') n.i = true
    if (tag === 'U' || tag === 'INS') n.u = true
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') n.s = true
    if (tag === 'A') { n.u = true; n.color = n.color || '1155CC' }
    if (tag === 'FONT' && el.getAttribute('color')) n.color = hex(el.getAttribute('color')) || n.color
    const s = el.style
    if (s) {
      if (s.fontWeight === 'bold' || Number(s.fontWeight) >= 600) n.b = true
      if (s.fontWeight === 'normal' || (Number(s.fontWeight) && Number(s.fontWeight) < 600)) n.b = false
      if (s.fontStyle === 'italic') n.i = true
      if ((s.textDecoration || s.textDecorationLine || '').includes('underline')) n.u = true
      if ((s.textDecoration || s.textDecorationLine || '').includes('line-through')) n.s = true
      if (s.color) n.color = hex(s.color) || n.color
    }
    return n
  }
  async function picture(img) {
    const src = img.getAttribute('src') || ''
    const m = /^data:image\/(png|jpe?g|gif);base64,(.+)$/i.exec(src)
    if (!m) return ''
    const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase()
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))
    let w = Number(img.getAttribute('width')) || img.naturalWidth || 0
    let h = Number(img.getAttribute('height')) || img.naturalHeight || 0
    if (!w || !h) {
      try { const bmp = await createImageBitmap(new Blob([bytes])); w = bmp.width; h = bmp.height; bmp.close?.() } catch { w = 400; h = 300 }
    }
    if (w > PAGE_PX) { h = Math.round((h * PAGE_PX) / w); w = PAGE_PX }
    const id = picId++
    const name = `image${id}.${ext}`
    media.push({ name, bytes, ext })
    const cx = w * EMU
    const cy = h * EMU
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Picture ${id}"/><a:graphic xmlns:a="${A}"><a:graphicData uri="${PIC}"><pic:pic xmlns:pic="${PIC}"><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  }
  // the runs of one paragraph from its inline content
  async function runs(node, st) {
    let out = ''
    for (const c of node.childNodes) {
      if (c.nodeType === 3) {
        const t = c.nodeValue.replace(/\s+/g, ' ')
        if (t) out += `<w:r>${runProps(st)}<w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`
      } else if (c.nodeType === 1) {
        if (c.tagName === 'BR') out += '<w:r><w:br/></w:r>'
        else if (c.tagName === 'IMG') out += await picture(c)
        else if (c.tagName === 'INPUT' && c.type === 'checkbox') out += `<w:r><w:t xml:space="preserve">${c.checked ? '☑' : '☐'} </w:t></w:r>`
        else out += await runs(c, styleFrom(c, st))
      }
    }
    return out
  }
  const alignOf = (el) => {
    const a = (el.style?.textAlign || el.getAttribute?.('align') || '').toLowerCase()
    return a === 'center' ? 'center' : a === 'right' || a === 'end' ? 'right' : a === 'justify' ? 'both' : ''
  }
  const para = (inner, { style = '', jc = '', num = null } = {}) => {
    let pPr = ''
    if (style) pPr += `<w:pStyle w:val="${style}"/>`
    if (num) pPr += `<w:numPr><w:ilvl w:val="${num.lvl}"/><w:numId w:val="${num.id}"/></w:numPr>`
    if (jc) pPr += `<w:jc w:val="${jc}"/>`
    return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${inner}</w:p>`
  }
  async function list(el, lvl) {
    const ordered = el.tagName === 'OL'
    const checklist = el.classList.contains('checklist')
    let numId = 1
    if (ordered) { nums.push(nums.length + 2); numId = nums[nums.length - 1] }
    let out = ''
    for (const li of el.children) {
      if (li.tagName !== 'LI') continue
      const inline = doc.createElement('span')
      const nested = []
      for (const c of [...li.childNodes]) {
        if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL')) nested.push(c)
        else inline.appendChild(c.cloneNode(true))
      }
      const mark = checklist ? `<w:r><w:t xml:space="preserve">${li.getAttribute('data-checked') === 'true' ? '☑' : '☐'} </w:t></w:r>` : ''
      out += para(mark + (await runs(inline, styleFrom(li, {}))), { num: checklist ? null : { id: numId, lvl: Math.min(lvl, 8) }, style: checklist ? 'ListParagraph' : '' })
      for (const n of nested) out += await list(n, lvl + 1)
    }
    return out
  }
  async function table(el) {
    let rows = ''
    let cols = 0
    for (const tr of el.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tr')) {
      let cells = ''
      let n = 0
      for (const td of tr.children) {
        if (td.tagName !== 'TD' && td.tagName !== 'TH') continue
        n++
        const inner = await blocks(td, td.tagName === 'TH' ? { b: true } : {})
        cells += `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${inner || '<w:p/>'}</w:tc>`
      }
      cols = Math.max(cols, n)
      rows += `<w:tr>${cells}</w:tr>`
    }
    const grid = Array.from({ length: cols }, () => `<w:gridCol w:w="${Math.floor(9000 / Math.max(1, cols))}"/>`).join('')
    return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows}</w:tbl><w:p/>`
  }
  // a container's children as paragraphs; loose inline content gathers into a paragraph
  async function blocks(node, st = {}) {
    let out = ''
    let pending = doc.createElement('span')
    const flush = async () => {
      if (pending.childNodes.length && (pending.textContent.trim() || pending.querySelector('img,br'))) out += para(await runs(pending, st))
      pending = doc.createElement('span')
    }
    for (const c of [...node.childNodes]) {
      if (c.nodeType !== 1 || !BLOCK.has(c.tagName)) { pending.appendChild(c.cloneNode(true)); continue }
      await flush()
      const t = c.tagName
      if (t === 'UL' || t === 'OL') out += await list(c, 0)
      else if (t === 'TABLE') out += await table(c)
      else if (t === 'HR') out += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFBFBF"/></w:pBdr></w:pPr></w:p>'
      else if (/^H[1-6]$/.test(t)) out += para(await runs(c, styleFrom(c, st)), { style: t === 'H1' ? 'Title' : `Heading${Math.min(3, Number(t[1]) - 1)}`, jc: alignOf(c) })
      else if (t === 'BLOCKQUOTE') out += para(await runs(c, styleFrom(c, { ...st, i: true })), { style: 'Quote', jc: alignOf(c) })
      else if (c.querySelector(':scope > ul, :scope > ol, :scope > table, :scope > p, :scope > div, :scope > h1, :scope > h2, :scope > h3')) out += await blocks(c, styleFrom(c, st))
      else out += para(await runs(c, styleFrom(c, st)), { jc: alignOf(c) })
    }
    await flush()
    return out
  }

  const body = (await blocks(doc.body)) || '<w:p/>'
  const document_ = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="${WP}" xmlns:a="${A}" xmlns:pic="${PIC}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`
  const bulletLvls = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((l) => `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${['•', '◦', '▪'][l % 3]}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (l + 1)}" w:hanging="360"/></w:pPr></w:lvl>`).join('')
  const decimalLvls = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((l) => `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="${['decimal', 'lowerLetter', 'lowerRoman'][l % 3]}"/><w:lvlText w:val="%${l + 1}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (l + 1)}" w:hanging="360"/></w:pPr></w:lvl>`).join('')
  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${bulletLvls}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${decimalLvls}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${nums.map((id) => `<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`
  const heading = (id, name, size, extra = '') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/>${extra}</w:pPr><w:rPr><w:b/><w:sz w:val="${size}"/></w:rPr></w:style>`
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="el-GR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${heading('Title', 'Title', 48)}${heading('Heading1', 'heading 1', 32)}${heading('Heading2', 'heading 2', 26)}${heading('Heading3', 'heading 3', 24)}<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/><w:color w:val="595959"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style><w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/></w:tblBorders><w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG}"><Relationship Id="rIdStyles" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rIdNum" Type="${R}/numbering" Target="numbering.xml"/>${media.map((m, i) => `<Relationship Id="rIdImg${i + 1}" Type="${R}/image" Target="media/${m.name}"/>`).join('')}</Relationships>`
  const exts = [...new Set(media.map((m) => m.ext))]
  const mime = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif' }
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${exts.map((e) => `<Default Extension="${e}" ContentType="${mime[e]}"/>`).join('')}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`
  return writeZip([
    ['[Content_Types].xml', types],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`],
    ['word/document.xml', document_],
    ['word/styles.xml', styles],
    ['word/numbering.xml', numbering],
    ['word/_rels/document.xml.rels', docRels],
    ...media.map((m) => [`word/media/${m.name}`, m.bytes]),
  ])
}
const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'BLOCKQUOTE', 'HR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'PRE'])

/* ---------- .docx -> HTML ---------- */
const parseXml = (s) => new DOMParser().parseFromString(s, 'application/xml')
const kids = (el, name) => (el ? [...el.children].filter((c) => c.localName === name) : [])
const kid = (el, name) => kids(el, name)[0] || null
const val = (el) => el?.getAttributeNS(W, 'val') ?? el?.getAttribute('w:val') ?? null
const on = (el) => !!el && !['0', 'false', 'none'].includes(String(val(el) ?? 'true'))
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function docxToHtml(bytes) {
  const files = await readZip(bytes)
  const xml = zipText(files, 'word/document.xml')
  if (!xml) throw new Error('This is not a Word document.')
  const doc = parseXml(xml)
  const rels = Object.fromEntries([...parseXml(zipText(files, 'word/_rels/document.xml.rels') || '<r/>').getElementsByTagNameNS('*', 'Relationship')].map((r) => [r.getAttribute('Id'), r.getAttribute('Target')]))
  // style ids -> what they are (headings are named "heading 1", whatever the id)
  const styleName = {}
  for (const s of parseXml(zipText(files, 'word/styles.xml') || '<s/>').getElementsByTagNameNS(W, 'style')) styleName[s.getAttributeNS(W, 'styleId')] = (val(kid(s, 'name')) || '').toLowerCase()
  // numbering: which lists are bullets
  const num = parseXml(zipText(files, 'word/numbering.xml') || '<n/>')
  const absFmt = {}
  for (const a of num.getElementsByTagNameNS(W, 'abstractNum')) {
    absFmt[a.getAttributeNS(W, 'abstractNumId')] = Object.fromEntries(kids(a, 'lvl').map((l) => [l.getAttributeNS(W, 'ilvl'), val(kid(l, 'numFmt')) || 'bullet']))
  }
  const numAbs = {}
  for (const n of num.getElementsByTagNameNS(W, 'num')) numAbs[n.getAttributeNS(W, 'numId')] = val(kid(n, 'abstractNumId'))
  const ordered = (numId, lvl) => (absFmt[numAbs[numId]]?.[lvl] || 'bullet') !== 'bullet'

  const image = (rid) => {
    const target = rels[rid]
    if (!target) return ''
    const path = target.startsWith('/') ? target.slice(1) : `word/${target.replace(/^\.\//, '')}`
    const bytes_ = files[path]
    if (!bytes_) return ''
    const ext = path.split('.').pop().toLowerCase()
    const type = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext
    if (!['png', 'jpeg', 'gif'].includes(type)) return ''
    let s = ''
    for (let i = 0; i < bytes_.length; i += 0x8000) s += String.fromCharCode(...bytes_.subarray(i, i + 0x8000))
    return `data:image/${type};base64,${btoa(s)}`
  }
  const runHtml = (r) => {
    const rPr = kid(r, 'rPr')
    let inner = ''
    for (const c of r.children) {
      if (c.localName === 't') inner += esc(c.textContent)
      else if (c.localName === 'tab') inner += '&emsp;'
      else if (c.localName === 'br' || c.localName === 'cr') inner += '<br>'
      else if (c.localName === 'drawing' || c.localName === 'pict') {
        const blip = c.getElementsByTagNameNS(A, 'blip')[0] || c.getElementsByTagNameNS('*', 'imagedata')[0]
        const rid = blip?.getAttributeNS(R, 'embed') || blip?.getAttributeNS(R, 'id')
        const ext = c.getElementsByTagNameNS(WP, 'extent')[0]
        const w = ext ? Math.round(Number(ext.getAttribute('cx')) / EMU) : 0
        const src = rid ? image(rid) : ''
        if (src) inner += `<img src="${src}"${w ? ` width="${w}"` : ''} alt="">`
      }
    }
    if (!inner) return ''
    const color = val(kid(rPr, 'color'))
    if (color && color !== 'auto' && /^[0-9A-F]{6}$/i.test(color) && color.toUpperCase() !== '000000') inner = `<span style="color:#${color}">${inner}</span>`
    if (on(kid(rPr, 'strike'))) inner = `<s>${inner}</s>`
    if (kid(rPr, 'u') && val(kid(rPr, 'u')) !== 'none') inner = `<u>${inner}</u>`
    if (on(kid(rPr, 'i'))) inner = `<i>${inner}</i>`
    if (on(kid(rPr, 'b'))) inner = `<b>${inner}</b>`
    return inner
  }
  const inlineOf = (p) => {
    let out = ''
    for (const c of p.children) {
      if (c.localName === 'r') out += runHtml(c)
      else if (c.localName === 'hyperlink' || c.localName === 'smartTag' || c.localName === 'ins' || c.localName === 'sdt') out += [...c.getElementsByTagNameNS(W, 'r')].map(runHtml).join('')
    }
    return out
  }
  const paraTag = (p) => {
    const pPr = kid(p, 'pPr')
    const name = styleName[val(kid(pPr, 'pStyle'))] || (val(kid(pPr, 'pStyle')) || '').toLowerCase()
    if (name === 'title') return 'h1'
    const m = /heading\s*(\d)/.exec(name)
    if (m) return `h${Math.min(4, Number(m[1]) + 1)}`
    if (name === 'quote' || name === 'intense quote') return 'blockquote'
    return 'p'
  }
  const align = (p) => {
    const jc = val(kid(kid(p, 'pPr'), 'jc'))
    return jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : jc === 'both' ? 'justify' : ''
  }

  function bodyHtml(container) {
    let out = ''
    const stack = [] // open lists: [{ tag, lvl }]
    const closeTo = (lvl) => { while (stack.length && stack[stack.length - 1].lvl >= lvl) { out += `</li></${stack.pop().tag}>` } }
    for (const el of container.children) {
      if (el.localName === 'p') {
        const numPr = kid(kid(el, 'pPr'), 'numPr')
        const numId = val(kid(numPr, 'numId'))
        const inner = inlineOf(el)
        if (numPr && numId && numId !== '0') {
          const lvl = Number(val(kid(numPr, 'ilvl')) || 0)
          const tag = ordered(numId, String(lvl)) ? 'ol' : 'ul'
          const top = stack[stack.length - 1]
          if (top && top.lvl === lvl && top.tag === tag) out += `</li><li>${inner}`
          else if (top && top.lvl >= lvl) { closeTo(lvl + 1); const t2 = stack[stack.length - 1]; if (t2 && t2.lvl === lvl && t2.tag === tag) out += `</li><li>${inner}`; else { closeTo(lvl); out += `<${tag}><li>${inner}`; stack.push({ tag, lvl }) } }
          else { out += `<${tag}><li>${inner}`; stack.push({ tag, lvl }) }
          continue
        }
        closeTo(0)
        const tag = paraTag(el)
        const a = align(el)
        out += `<${tag}${a ? ` style="text-align:${a}"` : ''}>${inner || '<br>'}</${tag}>`
      } else if (el.localName === 'tbl') {
        closeTo(0)
        out += '<table><tbody>'
        for (const tr of kids(el, 'tr')) {
          out += '<tr>'
          for (const tc of kids(tr, 'tc')) {
            const span = Number(val(kid(kid(tc, 'tcPr'), 'gridSpan')) || 1)
            out += `<td${span > 1 ? ` colspan="${span}"` : ''}>${kids(tc, 'p').map((p) => inlineOf(p)).filter(Boolean).join('<br>')}</td>`
          }
          out += '</tr>'
        }
        out += '</tbody></table>'
      } else if (el.localName === 'sdt') {
        closeTo(0)
        const content = kid(el, 'sdtContent')
        if (content) out += bodyHtml(content)
      }
    }
    closeTo(0)
    return out
  }
  const body = doc.getElementsByTagNameNS(W, 'body')[0]
  // paragraphs that start with ☐ / ☑ (how a checklist is written to Word) become a checklist again
  return (body ? bodyHtml(body) : '').replace(/(?:<p>[☐☑] [^]*?<\/p>)+/g, (run) => `<ul class="checklist">${[...run.matchAll(/<p>([☐☑]) ([^]*?)<\/p>/g)].map((m) => `<li data-checked="${m[1] === '☑'}">${m[2]}</li>`).join('')}</ul>`)
}
