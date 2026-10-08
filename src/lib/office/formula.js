/* Spreadsheet formulas for the Office page's sheets (Alex, 8 Oct): the everyday part of Excel's
   language. =A1+B2*3, ranges (A1:C4), other sheets (Budget!B2, 'Day 1'!C3), text in "quotes",
   & to join, comparisons, and the common functions below. Errors read like Excel's: #DIV/0!,
   #NAME?, #VALUE!, #REF!, and #CIRC! for a formula that depends on itself. */

export const colName = (i) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26) } return s }
export const colIndex = (s) => [...s.toUpperCase()].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1
export const addr = (c, r) => `${colName(c)}${r + 1}`
export function parseAddr(a) {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(a)
  return m ? { c: colIndex(m[1]), r: Number(m[2]) - 1 } : null
}

const isErr = (v) => typeof v === 'string' && /^#[A-Z/0-9]+[!?]?$/.test(v) && ERRORS.has(v)
const ERRORS = new Set(['#DIV/0!', '#NAME?', '#VALUE!', '#REF!', '#CIRC!', '#N/A', '#NUM!'])

/* ---------- tokens ---------- */
function tokenize(src) {
  const out = []
  let i = 0
  const sheetRef = /^(?:'((?:[^']|'')+)'|([A-Za-z_][\w.]*))!/
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) { i++; continue }
    const rest = src.slice(i)
    let m
    if ((m = /^\d+(\.\d+)?([eE][+-]?\d+)?|^\.\d+/.exec(rest))) { out.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue }
    if (ch === '"') {
      let j = i + 1, s = ''
      while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue } break } s += src[j++] }
      if (j >= src.length) throw new Error('#VALUE!')
      out.push({ t: 'str', v: s }); i = j + 1; continue
    }
    // a reference, a range, maybe on another sheet
    if ((m = sheetRef.exec(rest))) {
      const sheet = (m[1] ? m[1].replace(/''/g, "'") : m[2])
      const after = rest.slice(m[0].length)
      const r = /^\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?/.exec(after)
      if (!r) throw new Error('#REF!')
      out.push({ t: 'ref', sheet, v: r[0].replace(/\$/g, '') }); i += m[0].length + r[0].length; continue
    }
    if ((m = /^\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?(?![\w(])/.exec(rest))) { out.push({ t: 'ref', v: m[0].replace(/\$/g, '') }); i += m[0].length; continue }
    if ((m = /^[A-Za-z_][\w.]*(?=\s*\()/.exec(rest))) { out.push({ t: 'fn', v: m[0].toUpperCase() }); i += m[0].length; continue }
    if ((m = /^(TRUE|FALSE)\b/i.exec(rest))) { out.push({ t: 'bool', v: m[0].toUpperCase() === 'TRUE' }); i += m[0].length; continue }
    if ((m = /^(<=|>=|<>|[-+*/^&=<>%(),;:])/.exec(rest))) { out.push({ t: 'op', v: m[0] === ';' ? ',' : m[0] }); i += m[0].length; continue }
    if ((m = /^[A-Za-z_]\w*/.exec(rest))) { out.push({ t: 'name', v: m[0] }); i += m[0].length; continue }
    throw new Error('#NAME?')
  }
  return out
}

/* ---------- a tree from the tokens (precedence as in Excel) ---------- */
function parse(tokens) {
  let p = 0
  const peek = () => tokens[p]
  const isOp = (v) => tokens[p]?.t === 'op' && tokens[p].v === v
  const take = (v) => { if (!isOp(v)) throw new Error('#VALUE!'); p++ }
  const cmp = () => {
    let a = cat()
    while (['=', '<>', '<', '>', '<=', '>='].some(isOp)) { const op = tokens[p++].v; a = { k: 'bin', op, a, b: cat() } }
    return a
  }
  const cat = () => { let a = add(); while (isOp('&')) { p++; a = { k: 'bin', op: '&', a, b: add() } } return a }
  const add = () => { let a = mul(); while (isOp('+') || isOp('-')) { const op = tokens[p++].v; a = { k: 'bin', op, a, b: mul() } } return a }
  const mul = () => { let a = pow(); while (isOp('*') || isOp('/')) { const op = tokens[p++].v; a = { k: 'bin', op, a, b: pow() } } return a }
  const pow = () => { let a = unary(); while (isOp('^')) { p++; a = { k: 'bin', op: '^', a, b: unary() } } return a }
  const unary = () => {
    if (isOp('-')) { p++; return { k: 'neg', a: unary() } }
    if (isOp('+')) { p++; return unary() }
    return pct()
  }
  const pct = () => { let a = atom(); while (isOp('%')) { p++; a = { k: 'bin', op: '/', a, b: { k: 'lit', v: 100 } } } return a }
  const atom = () => {
    const t = peek()
    if (!t) throw new Error('#VALUE!')
    p++
    if (t.t === 'num' || t.t === 'str' || t.t === 'bool') return { k: 'lit', v: t.v }
    if (t.t === 'ref') return { k: 'ref', sheet: t.sheet, v: t.v }
    if (t.t === 'fn') {
      take('(')
      const args = []
      if (!isOp(')')) { args.push(cmp()); while (isOp(',')) { p++; args.push(cmp()) } }
      take(')')
      return { k: 'fn', name: t.v, args }
    }
    if (t.t === 'op' && t.v === '(') { const e = cmp(); take(')'); return e }
    if (t.t === 'name') throw new Error('#NAME?')
    throw new Error('#VALUE!')
  }
  const tree = cmp()
  if (p < tokens.length) throw new Error('#VALUE!')
  return tree
}

const cache = new Map()
function compile(src) {
  if (cache.has(src)) return cache.get(src)
  let tree
  try { tree = parse(tokenize(src)) } catch (e) { tree = { k: 'err', v: ERRORS.has(e.message) ? e.message : '#VALUE!' } }
  if (cache.size > 2000) cache.clear()
  cache.set(src, tree)
  return tree
}

/* ---------- values ---------- */
const num = (v) => {
  if (isErr(v)) throw new Error(v)
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v === '' || v == null) return 0
  const n = Number(String(v).replace(',', '.'))
  if (Number.isFinite(n)) return n
  throw new Error('#VALUE!')
}
const text = (v) => {
  if (isErr(v)) throw new Error(v)
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return formatNumber(v)
  return v == null ? '' : String(v)
}
const truthy = (v) => (typeof v === 'string' && !isErr(v) && !/^(true|false)$/i.test(v) && Number.isNaN(Number(v)) ? (() => { throw new Error('#VALUE!') })() : typeof v === 'string' && /^false$/i.test(v) ? false : !!num(v))
const flat = (args) => args.flatMap((a) => (a && a.range ? a.values : [a]))
/* The numbers of a call, as Excel counts them: in a range only real numbers, typed straight into
   the call anything that reads as a number. An error anywhere is the answer. */
const nums = (args) => args.flatMap((a) => {
  if (a && a.range) {
    const e = a.values.find(isErr)
    if (e) throw new Error(e)
    return a.values.filter((v) => typeof v === 'number')
  }
  return [num(a)]
})

const FN = {
  SUM: (a) => nums(a).reduce((s, v) => s + v, 0),
  AVERAGE: (a) => { const n = nums(a); if (!n.length) throw new Error('#DIV/0!'); return n.reduce((s, v) => s + v, 0) / n.length },
  MIN: (a) => { const n = nums(a); return n.length ? Math.min(...n) : 0 },
  MAX: (a) => { const n = nums(a); return n.length ? Math.max(...n) : 0 },
  COUNT: (a) => nums(a).length,
  COUNTA: (a) => flat(a).filter((v) => v !== '' && v != null).length,
  PRODUCT: (a) => nums(a).reduce((s, v) => s * v, 1),
  ROUND: ([v, d]) => { const k = 10 ** num(d ?? 0); return Math.round(num(v) * k) / k },
  ROUNDUP: ([v, d]) => { const k = 10 ** num(d ?? 0); const x = num(v); return (x < 0 ? -Math.ceil(-x * k) : Math.ceil(x * k)) / k },
  ROUNDDOWN: ([v, d]) => { const k = 10 ** num(d ?? 0); return Math.trunc(num(v) * k) / k },
  INT: ([v]) => Math.floor(num(v)),
  ABS: ([v]) => Math.abs(num(v)),
  MOD: ([a, b]) => { const d = num(b); if (!d) throw new Error('#DIV/0!'); const r = num(a) % d; return r && Math.sign(r) !== Math.sign(d) ? r + d : r },
  IF: ([c, a, b]) => (truthy(c) ? (a === undefined ? true : a) : (b === undefined ? false : b)),
  IFERROR: ([v, alt]) => (isErr(v) ? alt : v),
  AND: (a) => flat(a).every((v) => truthy(v)),
  OR: (a) => flat(a).some((v) => truthy(v)),
  NOT: ([v]) => !truthy(v),
  CONCAT: (a) => flat(a).map(text).join(''),
  CONCATENATE: (a) => flat(a).map(text).join(''),
  LEN: ([v]) => text(v).length,
  UPPER: ([v]) => text(v).toUpperCase(),
  LOWER: ([v]) => text(v).toLowerCase(),
  TRIM: ([v]) => text(v).trim().replace(/\s+/g, ' '),
  TODAY: () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000) },
  SUMIF: ([range, crit, sumRange]) => {
    const test = criterion(crit)
    const keys = range?.range ? range.values : [range]
    const vals = sumRange?.range ? sumRange.values : keys
    return keys.reduce((s, k, i) => (test(k) && typeof vals[i] === 'number' ? s + vals[i] : s), 0)
  },
  COUNTIF: ([range, crit]) => { const test = criterion(crit); return (range?.range ? range.values : [range]).filter(test).length },
}
export const FUNCTIONS = Object.keys(FN)

function criterion(c) {
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(typeof c === 'string' ? c : String(c))
  const op = m[1] || '='
  const raw = m[2]
  const n = Number(raw)
  const isNum = raw !== '' && Number.isFinite(n)
  return (v) => {
    if (isNum && typeof v === 'number') return op === '=' ? v === n : op === '<>' ? v !== n : op === '<' ? v < n : op === '>' ? v > n : op === '<=' ? v <= n : v >= n
    const a = String(v ?? '').toLowerCase()
    const b = raw.toLowerCase()
    return op === '<>' ? a !== b : op === '=' ? a === b : false
  }
}

/* ---------- evaluation over a workbook ---------- */
/* book: { sheets: [{ name, cells: { A1: { v, f } } }] }. Returns an evaluator with value(sheet, a1). */
export function makeEvaluator(book) {
  const memo = new Map()
  const busy = new Set()
  const sheetBy = (name) => book.sheets.find((s) => s.name.toLowerCase() === String(name).toLowerCase())
  function value(sheet, a1) {
    const key = `${sheet.name}!${a1}`
    if (memo.has(key)) return memo.get(key)
    const cell = sheet.cells[a1]
    if (!cell) return ''
    if (cell.f == null) return cell.v ?? ''
    if (busy.has(key)) return '#CIRC!'
    busy.add(key)
    let out
    try { out = run(compile(cell.f), sheet) } catch (e) { out = ERRORS.has(e.message) ? e.message : '#VALUE!' }
    busy.delete(key)
    if (out && out.range) out = out.values[0] ?? ''
    if (typeof out === 'number' && !Number.isFinite(out)) out = '#NUM!'
    memo.set(key, out)
    return out
  }
  function rangeOf(sheet, ref) {
    const [a, b] = ref.split(':')
    const s = parseAddr(a)
    const e = b ? parseAddr(b) : s
    if (!s || !e) throw new Error('#REF!')
    const values = []
    for (let r = Math.min(s.r, e.r); r <= Math.max(s.r, e.r); r++) for (let c = Math.min(s.c, e.c); c <= Math.max(s.c, e.c); c++) values.push(value(sheet, addr(c, r)))
    return { range: true, values }
  }
  function run(n, sheet) {
    switch (n.k) {
      case 'lit': return n.v
      case 'err': throw new Error(n.v)
      case 'ref': {
        const target = n.sheet ? sheetBy(n.sheet) : sheet
        if (!target) throw new Error('#REF!')
        if (n.v.includes(':')) return rangeOf(target, n.v)
        const v = value(target, n.v.toUpperCase())
        if (isErr(v)) throw new Error(v)
        return v
      }
      case 'neg': return -num(run(n.a, sheet))
      case 'bin': {
        const a = run(n.a, sheet)
        const b = run(n.b, sheet)
        const A = a && a.range ? a.values[0] : a
        const B = b && b.range ? b.values[0] : b
        switch (n.op) {
          case '+': return num(A) + num(B)
          case '-': return num(A) - num(B)
          case '*': return num(A) * num(B)
          case '/': { const d = num(B); if (d === 0) throw new Error('#DIV/0!'); return num(A) / d }
          case '^': return num(A) ** num(B)
          case '&': return text(A) + text(B)
          default: {
            const both = typeof A === 'number' && typeof B === 'number'
            const x = both ? A : String(A ?? '').toLowerCase()
            const y = both ? B : String(B ?? '').toLowerCase()
            return n.op === '=' ? x === y : n.op === '<>' ? x !== y : n.op === '<' ? x < y : n.op === '>' ? x > y : n.op === '<=' ? x <= y : x >= y
          }
        }
      }
      case 'fn': {
        const f = FN[n.name]
        if (!f) throw new Error('#NAME?')
        // IF and IFERROR look at their branches lazily, so an error on the branch not taken is ignored
        if (n.name === 'IF') { const c = run(n.args[0], sheet); return truthy(c && c.range ? c.values[0] : c) ? (n.args[1] ? run(n.args[1], sheet) : true) : (n.args[2] ? run(n.args[2], sheet) : false) }
        if (n.name === 'IFERROR') { try { const v = run(n.args[0], sheet); return v } catch (e) { if (ERRORS.has(e.message)) return run(n.args[1], sheet); throw e } }
        return f(n.args.map((a) => run(a, sheet)))
      }
      default: throw new Error('#VALUE!')
    }
  }
  return { value: (sheetName, a1) => { const s = sheetBy(sheetName); return s ? value(s, a1) : '#REF!' } }
}

/* How a value shows in a cell: numbers without float noise, TRUE / FALSE, dates for date cells. */
export function formatNumber(n) {
  if (Number.isInteger(n)) return String(n)
  const s = Number(n.toPrecision(12)).toString()
  return s.includes('e') ? n.toPrecision(6) : s
}
export function serialToDate(n) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n * 86400000))
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}
export function display(v, fmt) {
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return fmt === 'date' ? serialToDate(v) : fmt === 'eur' ? `€${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : fmt === 'pct' ? `${formatNumber(Math.round(v * 10000) / 100)}%` : formatNumber(v)
  return v == null ? '' : String(v)
}
/* What a person typed into a cell: a formula, a number, or text. */
export function readInput(raw) {
  const s = String(raw ?? '')
  if (s.startsWith('=') && s.length > 1) return { f: s.slice(1) }
  if (s.trim() === '') return null
  const t = s.trim()
  if (/^-?\d+([.,]\d+)?$/.test(t)) return { v: Number(t.replace(',', '.')) }
  if (/^-?\d+([.,]\d+)?%$/.test(t)) return { v: Number(t.slice(0, -1).replace(',', '.')) / 100, fmt: 'pct' }
  if (/^(true|false)$/i.test(t)) return { v: /^true$/i.test(t) }
  return { v: s }
}
