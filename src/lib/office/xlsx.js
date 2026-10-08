/* .xlsx in and out for the Office page's spreadsheets (Alex, 8 Oct), no library: the workbook as
   { sheets: [{ name, cells: { A1: { v, f, fmt, b, i, al, bg } }, cols: { 0: px } }] }. Kept: values,
   formulas (with the computed value, so Excel and Numbers show them at once), bold, italic,
   alignment, a fill colour, dates, € and % formats, column widths, several sheets. Excel's shared
   formulas are spread back to every cell. Charts, merged cells and the rest are not read. */
import { readZip, writeZip, xmlEsc, zipText } from './zip.js'
import { addr, colIndex, colName, makeEvaluator, parseAddr } from './formula.js'

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships'
export const MAX_ROWS = 2000
export const MAX_COLS = 100

export const emptyBook = () => ({ sheets: [{ name: 'Sheet1', cells: {}, cols: {} }] })

/* ---------- writing ---------- */
const FMT_ID = { date: 14, pct: 10, eur: 164 }
const argb = (hex) => `FF${String(hex || '').replace('#', '').toUpperCase().padStart(6, '0').slice(0, 6)}`
const safeSheetName = (n, i) => (String(n || '').replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || `Sheet${i + 1}`)

export async function toXlsx(book) {
  const ev = makeEvaluator(book)
  // styles: every distinct look among the cells becomes one cellXfs entry
  const fonts = ['<font><sz val="11"/><name val="Calibri"/></font>']
  const fontKey = new Map([['00', 0]])
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
  const fillKey = new Map()
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']
  const xfKey = new Map([['', 0]])
  const styleOf = (c) => {
    const key = `${c.b ? 1 : 0}${c.i ? 1 : 0}|${c.al || ''}|${c.bg || ''}|${c.fmt || ''}`
    if (key === '00|||') return 0
    if (xfKey.has(key)) return xfKey.get(key)
    const fk = `${c.b ? 1 : 0}${c.i ? 1 : 0}`
    if (!fontKey.has(fk)) { fontKey.set(fk, fonts.length); fonts.push(`<font>${c.b ? '<b/>' : ''}${c.i ? '<i/>' : ''}<sz val="11"/><name val="Calibri"/></font>`) }
    let fillId = 0
    if (c.bg) {
      if (!fillKey.has(c.bg)) { fillKey.set(c.bg, fills.length); fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${argb(c.bg)}"/><bgColor indexed="64"/></patternFill></fill>`) }
      fillId = fillKey.get(c.bg)
    }
    const numFmtId = FMT_ID[c.fmt] || 0
    const align = c.al ? `<alignment horizontal="${c.al}"/>` : ''
    const xf = `<xf numFmtId="${numFmtId}" fontId="${fontKey.get(fk)}" fillId="${fillId}" borderId="0" xfId="0"${numFmtId ? ' applyNumberFormat="1"' : ''}${fk !== '00' ? ' applyFont="1"' : ''}${fillId ? ' applyFill="1"' : ''}${align ? ' applyAlignment="1">' + align + '</xf>' : '/>'}`
    xfKey.set(key, xfs.length)
    xfs.push(xf)
    return xfs.length - 1
  }

  const sheetXml = book.sheets.map((sheet) => {
    const rows = new Map()
    for (const [a1, cell] of Object.entries(sheet.cells || {})) {
      const p = parseAddr(a1)
      if (!p || !cell) continue
      if (cell.f == null && (cell.v === '' || cell.v == null) && !cell.bg) continue
      if (!rows.has(p.r)) rows.set(p.r, [])
      rows.get(p.r).push([p.c, a1, cell])
    }
    const rowXml = [...rows.keys()].sort((a, b) => a - b).map((r) => {
      const cells = rows.get(r).sort((a, b) => a[0] - b[0]).map(([, a1, cell]) => {
        const s = styleOf(cell)
        const sa = s ? ` s="${s}"` : ''
        if (cell.f != null) {
          const v = ev.value(sheet.name, a1)
          const f = `<f>${xmlEsc(cell.f)}</f>`
          if (typeof v === 'number') return `<c r="${a1}"${sa}>${f}<v>${v}</v></c>`
          if (typeof v === 'boolean') return `<c r="${a1}"${sa} t="b">${f}<v>${v ? 1 : 0}</v></c>`
          if (typeof v === 'string' && v.startsWith('#')) return `<c r="${a1}"${sa} t="e">${f}<v>${xmlEsc(v)}</v></c>`
          return `<c r="${a1}"${sa} t="str">${f}<v>${xmlEsc(v)}</v></c>`
        }
        const v = cell.v
        if (typeof v === 'number') return `<c r="${a1}"${sa}><v>${v}</v></c>`
        if (typeof v === 'boolean') return `<c r="${a1}"${sa} t="b"><v>${v ? 1 : 0}</v></c>`
        if (v === '' || v == null) return `<c r="${a1}"${sa}/>`
        return `<c r="${a1}"${sa} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`
      }).join('')
      return `<row r="${r + 1}">${cells}</row>`
    }).join('')
    const widths = Object.entries(sheet.cols || {}).filter(([, w]) => w).sort((a, b) => a[0] - b[0])
    const cols = widths.length ? `<cols>${widths.map(([c, w]) => `<col min="${Number(c) + 1}" max="${Number(c) + 1}" width="${Math.max(2, Math.round(((w - 5) / 7) * 100) / 100)}" customWidth="1"/>`).join('')}</cols>` : ''
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rowXml}</sheetData></worksheet>`
  })
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS_MAIN}"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;€&quot;#,##0.00"/></numFmts><fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  const names = book.sheets.map((s, i) => safeSheetName(s.name, i))
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><bookViews><workbookView/></bookViews><sheets>${names.map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_PKG}">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${names.length + 1}" Type="${NS_REL}/styles" Target="styles.xml"/></Relationships>`
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_PKG}"><Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  return writeZip([
    ['[Content_Types].xml', types],
    ['_rels/.rels', rootRels],
    ['xl/workbook.xml', workbook],
    ['xl/_rels/workbook.xml.rels', wbRels],
    ['xl/styles.xml', styles],
    ...sheetXml.map((x, i) => [`xl/worksheets/sheet${i + 1}.xml`, x]),
  ])
}

/* ---------- reading ---------- */
const parseXml = (s) => new DOMParser().parseFromString(s, 'application/xml')
const kids = (el, name) => (el ? [...el.children].filter((c) => c.localName === name) : [])
const kid = (el, name) => kids(el, name)[0] || null
const all = (el, name) => (el ? [...el.getElementsByTagNameNS('*', name)] : [])
const relTarget = (base, target) => {
  if (target.startsWith('/')) return target.slice(1)
  const parts = base.split('/').slice(0, -1)
  for (const seg of target.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg) }
  return parts.join('/')
}
const BUILTIN_DATES = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])

/* Moves a formula's relative references by (dr, dc): Excel's shared formulas write the formula
   once and expect every other cell to shift it, as a copied formula would. */
export function shiftFormula(f, dr, dc) {
  return f.split(/("(?:[^"]|"")*")/).map((part, i) => (i % 2 ? part : part.replace(/(^|[^A-Za-z0-9_.])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(])/g, (m, pre, dcol, col, drow, row) => {
    const c = dcol ? col : colName(Math.max(0, colIndex(col) + dc))
    const r = drow ? row : String(Math.max(1, Number(row) + dr))
    return `${pre}${dcol}${c}${drow}${r}`
  }))).join('')
}

export async function fromXlsx(bytes) {
  const files = await readZip(bytes)
  const wbPath = 'xl/workbook.xml'
  const wb = parseXml(zipText(files, wbPath))
  if (!wb.documentElement || wb.documentElement.localName !== 'workbook') throw new Error('This is not an Excel workbook.')
  const rels = parseXml(zipText(files, 'xl/_rels/workbook.xml.rels'))
  const relMap = Object.fromEntries(all(rels, 'Relationship').map((r) => [r.getAttribute('Id'), relTarget(wbPath, r.getAttribute('Target'))]))
  // shared strings
  const sst = all(parseXml(zipText(files, 'xl/sharedStrings.xml') || '<sst/>'), 'si').map((si) => all(si, 't').filter((t) => t.parentNode.localName !== 'rPh').map((t) => t.textContent).join(''))
  // styles: what each style number means for a cell
  const st = parseXml(zipText(files, 'xl/styles.xml') || '<styleSheet/>')
  const numFmts = Object.fromEntries(all(st, 'numFmt').map((n) => [Number(n.getAttribute('numFmtId')), n.getAttribute('formatCode') || '']))
  const fonts = kids(kid(st.documentElement, 'fonts'), 'font').map((f) => ({ b: !!kid(f, 'b') && kid(f, 'b').getAttribute('val') !== '0', i: !!kid(f, 'i') && kid(f, 'i').getAttribute('val') !== '0' }))
  const fills = kids(kid(st.documentElement, 'fills'), 'fill').map((f) => {
    const p = kid(f, 'patternFill')
    const rgb = p && p.getAttribute('patternType') === 'solid' ? kid(p, 'fgColor')?.getAttribute('rgb') : ''
    return rgb && rgb.length >= 6 ? `#${rgb.slice(-6).toLowerCase()}` : ''
  })
  const xfs = kids(kid(st.documentElement, 'cellXfs'), 'xf').map((x) => {
    const id = Number(x.getAttribute('numFmtId') || 0)
    const code = (numFmts[id] || '').toLowerCase().replace(/"[^"]*"|\[[^\]]*\]/g, (m) => (m.includes('€') ? '€' : ''))
    const fmt = BUILTIN_DATES.has(id) || (/[dmy]/.test(code) && !/^general$/.test(code)) ? 'date' : id === 9 || id === 10 || code.includes('%') ? 'pct' : code.includes('€') || (numFmts[id] || '').includes('€') ? 'eur' : ''
    const font = fonts[Number(x.getAttribute('fontId') || 0)] || {}
    const al = kid(x, 'alignment')?.getAttribute('horizontal') || ''
    return { fmt, b: font.b, i: font.i, bg: fills[Number(x.getAttribute('fillId') || 0)] || '', al: ['left', 'center', 'right'].includes(al) ? al : '' }
  })

  const sheets = []
  for (const s of all(wb, 'sheet')) {
    const rid = s.getAttributeNS(NS_REL, 'id') || s.getAttribute('r:id')
    const path = relMap[rid]
    if (!path || !files[path]) continue
    const doc = parseXml(zipText(files, path))
    const cells = {}
    const shared = {}
    for (const c of all(doc, 'c')) {
      const a1 = c.getAttribute('r')
      const p = a1 && parseAddr(a1)
      if (!p || p.r >= MAX_ROWS || p.c >= MAX_COLS) continue
      const t = c.getAttribute('t') || 'n'
      const vEl = kid(c, 'v')
      const fEl = kid(c, 'f')
      const style = xfs[Number(c.getAttribute('s') || 0)] || {}
      const cell = {}
      if (style.b) cell.b = true
      if (style.i) cell.i = true
      if (style.al) cell.al = style.al
      if (style.bg) cell.bg = style.bg
      if (style.fmt) cell.fmt = style.fmt
      if (fEl) {
        let f = fEl.textContent
        if (fEl.getAttribute('t') === 'shared') {
          const si = fEl.getAttribute('si')
          if (f) shared[si] = { f, r: p.r, c: p.c }
          else if (shared[si]) f = shiftFormula(shared[si].f, p.r - shared[si].r, p.c - shared[si].c)
        }
        if (f) cell.f = f.replace(/_xlfn\.|_xlws\./g, '')
      }
      if (cell.f == null) {
        const raw = vEl ? vEl.textContent : ''
        if (t === 's') cell.v = sst[Number(raw)] ?? ''
        else if (t === 'inlineStr') cell.v = all(c, 't').map((x) => x.textContent).join('')
        else if (t === 'str') cell.v = raw
        else if (t === 'b') cell.v = raw === '1'
        else if (t === 'e') cell.v = raw
        else if (raw !== '') cell.v = Number(raw)
        else if (!cell.bg) continue
      }
      cells[a1] = cell
    }
    const cols = {}
    for (const col of all(doc, 'col')) {
      const w = Number(col.getAttribute('width'))
      if (!w) continue
      for (let i = Number(col.getAttribute('min')) - 1; i <= Math.min(Number(col.getAttribute('max')) - 1, MAX_COLS - 1); i++) cols[i] = Math.round(w * 7 + 5)
    }
    sheets.push({ name: s.getAttribute('name') || `Sheet${sheets.length + 1}`, cells, cols })
  }
  if (!sheets.length) sheets.push(emptyBook().sheets[0])
  return { sheets }
}

/* How far the sheet reaches: the last used row and column, for drawing the grid. */
export function extent(sheet) {
  let r = 0, c = 0
  for (const a1 of Object.keys(sheet.cells || {})) { const p = parseAddr(a1); if (p) { r = Math.max(r, p.r); c = Math.max(c, p.c) } }
  return { rows: r + 1, cols: c + 1 }
}
export { addr }
