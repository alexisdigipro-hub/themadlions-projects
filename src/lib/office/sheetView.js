/* The spreadsheet on the Office page (Alex, 8 Oct): plain DOM, no React and no library, so it
   stays quick with a few thousand cells. A formula bar, the grid with sticky column letters and row
   numbers, sheet tabs, and the everyday Excel moves: type to replace, Enter / Tab / arrows,
   double click or F2 to edit, Shift to select a range, drag to select, Delete to clear, copy and
   paste with Excel or Numbers (tab separated), Ctrl/Cmd+Z to undo, B / I, alignment, a fill
   colour, € / % / date formats, wider or narrower columns by dragging their edge. While typing a
   formula, a click on another cell puts its address in. */
import { addr, colName, display, makeEvaluator, parseAddr, readInput } from './formula.js'
import { MAX_COLS, MAX_ROWS, extent } from './xlsx.js'

const FILLS = ['', '#fff2cc', '#fde2e1', '#e2f0d9', '#ddebf7', '#ede4f5', '#f2f2f2']
const DEFAULT_W = 100
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }
const clone = (x) => JSON.parse(JSON.stringify(x))

export function mountSheet(root, book, { onChange, readOnly = false } = {}) {
  let wb = clone(book)
  let si = 0 // the sheet on show
  let sel = { r: 0, c: 0, r2: 0, c2: 0 }
  let editing = null // { r, c, input }
  const undo = []
  const redo = []
  const sheet = () => wb.sheets[si]
  const changed = () => { onChange?.(wb); }
  const remember = () => { undo.push(JSON.stringify(wb)); if (undo.length > 60) undo.shift(); redo.length = 0 }

  root.replaceChildren()
  root.classList.add('xs')
  // toolbar
  const bar = el('div', 'xs-bar')
  const btn = (label, title, fn, cls = '') => { const b = el('button', `xs-btn ${cls}`, label); b.type = 'button'; b.title = title; b.addEventListener('mousedown', (e) => e.preventDefault()); b.addEventListener('click', fn); bar.appendChild(b); return b }
  const bB = btn('B', 'Bold (Ctrl/Cmd+B)', () => style('b'), 'xs-b')
  const bI = btn('I', 'Italic (Ctrl/Cmd+I)', () => style('i'), 'xs-i')
  bar.appendChild(el('span', 'xs-sep'))
  const bL = btn('⟸', 'Align left', () => style('al', 'left'))
  const bC = btn('⟺', 'Align centre', () => style('al', 'center'))
  const bR = btn('⟹', 'Align right', () => style('al', 'right'))
  bar.appendChild(el('span', 'xs-sep'))
  const fills = el('span', 'xs-fills')
  for (const f of FILLS) {
    const s = el('button', 'xs-fill')
    s.type = 'button'
    s.title = f ? 'Fill colour' : 'No fill'
    s.style.background = f || 'transparent'
    if (!f) s.textContent = '⌀'
    s.addEventListener('mousedown', (e) => e.preventDefault())
    s.addEventListener('click', () => style('bg', f))
    fills.appendChild(s)
  }
  bar.appendChild(fills)
  bar.appendChild(el('span', 'xs-sep'))
  const fmtSel = el('select', 'xs-fmt')
  for (const [v, l] of [['', 'General'], ['eur', '€ 1,234.00'], ['pct', '12%'], ['date', 'Date']]) { const o = el('option', '', l); o.value = v; fmtSel.appendChild(o) }
  fmtSel.title = 'Number format'
  fmtSel.addEventListener('change', () => style('fmt', fmtSel.value))
  bar.appendChild(fmtSel)
  const bSum = btn('Σ', 'Sum of the cells above (or to the left)', autoSum)
  bar.appendChild(el('span', 'xs-sep'))
  const bUndo = btn('↶', 'Undo (Ctrl/Cmd+Z)', () => doUndo())
  const bRedo = btn('↷', 'Redo', () => doRedo())
  if (readOnly) bar.querySelectorAll('button, select').forEach((b) => { b.disabled = true })
  root.appendChild(bar)

  // formula bar
  const fx = el('div', 'xs-fx')
  const nameBox = el('span', 'xs-name')
  const fxLabel = el('span', 'xs-fx-label', 'ƒx')
  const fxInput = el('input', 'xs-fx-input')
  fxInput.readOnly = readOnly
  fxInput.spellcheck = false
  fxInput.setAttribute('autocomplete', 'off')
  fx.append(nameBox, fxLabel, fxInput)
  root.appendChild(fx)

  // grid
  const scroll = el('div', 'xs-scroll')
  scroll.tabIndex = 0
  const table = el('table', 'xs-grid')
  scroll.appendChild(table)
  root.appendChild(scroll)

  // sheet tabs
  const tabs = el('div', 'xs-tabs')
  root.appendChild(tabs)

  let rows = 0
  let cols = 0
  let cellEls = [] // [r][c] -> td

  function size() {
    const e = extent(sheet())
    rows = Math.min(MAX_ROWS, Math.max(60, e.rows + 20, sel.r2 + 10, sel.r + 10))
    cols = Math.min(MAX_COLS, Math.max(16, e.cols + 4, sel.c2 + 3, sel.c + 3))
  }
  function build() {
    size()
    table.replaceChildren()
    const cg = el('colgroup')
    const c0 = el('col'); c0.style.width = '44px'; cg.appendChild(c0)
    let total = 44
    for (let c = 0; c < cols; c++) { const w = sheet().cols?.[c] || DEFAULT_W; total += w; const col = el('col'); col.style.width = `${w}px`; cg.appendChild(col) }
    table.style.width = `${total}px` // a fixed table only keeps its column widths with its own width set
    table.appendChild(cg)
    const thead = el('thead')
    const hr = el('tr')
    hr.appendChild(el('th', 'xs-corner'))
    for (let c = 0; c < cols; c++) {
      const th = el('th', 'xs-colh', colName(c))
      th.dataset.c = c
      const grip = el('span', 'xs-grip')
      grip.dataset.c = c
      th.appendChild(grip)
      hr.appendChild(th)
    }
    thead.appendChild(hr)
    table.appendChild(thead)
    const tbody = el('tbody')
    cellEls = []
    for (let r = 0; r < rows; r++) {
      const tr = el('tr')
      const th = el('th', 'xs-rowh', String(r + 1))
      th.dataset.r = r
      tr.appendChild(th)
      const line = []
      for (let c = 0; c < cols; c++) {
        const td = el('td')
        td.dataset.r = r
        td.dataset.c = c
        tr.appendChild(td)
        line.push(td)
      }
      cellEls.push(line)
      tbody.appendChild(tr)
    }
    table.appendChild(tbody)
    paint()
    drawTabs()
  }
  // values and looks of every cell
  function paint() {
    const ev = makeEvaluator(wb)
    const s = sheet()
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const td = cellEls[r][c]
        const a1 = addr(c, r)
        const cell = s.cells[a1]
        if (!cell) { if (td.textContent || td.className) { td.textContent = ''; td.className = ''; td.removeAttribute('style') } continue }
        const v = cell.f != null ? ev.value(s.name, a1) : cell.v
        td.textContent = display(v, cell.fmt)
        const isNum = typeof v === 'number'
        td.className = `${cell.b ? 'b ' : ''}${cell.i ? 'i ' : ''}${typeof v === 'string' && v.startsWith('#') && cell.f != null ? 'err ' : ''}${cell.al ? `al-${cell.al}` : isNum ? 'al-right' : ''}`.trim()
        td.style.background = cell.bg || ''
      }
    }
    markSelection()
  }
  function markSelection() {
    table.querySelectorAll('.sel, .act').forEach((x) => x.classList.remove('sel', 'act'))
    table.querySelectorAll('.hsel').forEach((x) => x.classList.remove('hsel'))
    const [r1, r2] = [Math.min(sel.r, sel.r2), Math.max(sel.r, sel.r2)]
    const [c1, c2] = [Math.min(sel.c, sel.c2), Math.max(sel.c, sel.c2)]
    for (let r = r1; r <= r2 && r < rows; r++) for (let c = c1; c <= c2 && c < cols; c++) cellEls[r][c].classList.add('sel')
    cellEls[sel.r]?.[sel.c]?.classList.add('act')
    for (let c = c1; c <= c2; c++) table.querySelector(`th.xs-colh[data-c="${c}"]`)?.classList.add('hsel')
    for (let r = r1; r <= r2; r++) table.querySelector(`th.xs-rowh[data-r="${r}"]`)?.classList.add('hsel')
    const a1 = addr(sel.c, sel.r)
    nameBox.textContent = r1 === r2 && c1 === c2 ? a1 : `${addr(c1, r1)}:${addr(c2, r2)}`
    const cell = sheet().cells[a1]
    if (document.activeElement !== fxInput) fxInput.value = cell ? (cell.f != null ? `=${cell.f}` : cell.v === true ? 'TRUE' : cell.v === false ? 'FALSE' : String(cell.v ?? '')) : ''
    const cur = cell || {}
    bB.classList.toggle('on', !!cur.b)
    bI.classList.toggle('on', !!cur.i)
    bL.classList.toggle('on', cur.al === 'left')
    bC.classList.toggle('on', cur.al === 'center')
    bR.classList.toggle('on', cur.al === 'right')
    fmtSel.value = cur.fmt || ''
    bUndo.disabled = readOnly || !undo.length
    bRedo.disabled = readOnly || !redo.length
  }
  function drawTabs() {
    tabs.replaceChildren()
    wb.sheets.forEach((s, i) => {
      const t = el('button', `xs-tab${i === si ? ' on' : ''}`, s.name)
      t.type = 'button'
      t.title = readOnly ? s.name : 'Double click to rename'
      t.addEventListener('click', () => { if (i !== si) { commitEdit(); si = i; sel = { r: 0, c: 0, r2: 0, c2: 0 }; build() } })
      if (!readOnly) t.addEventListener('dblclick', () => {
        const name = prompt('Sheet name', s.name)?.trim()
        if (!name || wb.sheets.some((x, j) => j !== i && x.name.toLowerCase() === name.toLowerCase())) return
        remember(); s.name = name.slice(0, 31); drawTabs(); changed()
      })
      tabs.appendChild(t)
    })
    if (readOnly) return
    const add = el('button', 'xs-tab xs-tab-add', '+')
    add.type = 'button'
    add.title = 'New sheet'
    add.addEventListener('click', () => {
      remember()
      let n = wb.sheets.length + 1
      while (wb.sheets.some((x) => x.name === `Sheet${n}`)) n++
      wb.sheets.push({ name: `Sheet${n}`, cells: {}, cols: {} })
      si = wb.sheets.length - 1
      sel = { r: 0, c: 0, r2: 0, c2: 0 }
      build(); changed()
    })
    tabs.appendChild(add)
    if (wb.sheets.length > 1) {
      const del = el('button', 'xs-tab xs-tab-del', 'Delete sheet')
      del.type = 'button'
      del.addEventListener('click', () => {
        if (!confirm(`Delete the sheet "${sheet().name}"?`)) return
        remember(); wb.sheets.splice(si, 1); si = Math.max(0, si - 1); build(); changed()
      })
      tabs.appendChild(del)
    }
  }

  // ---------- changing cells ----------
  function setRaw(r, c, raw) {
    const a1 = addr(c, r)
    const old = sheet().cells[a1] || {}
    const parsed = readInput(raw)
    const look = { b: old.b, i: old.i, al: old.al, bg: old.bg, fmt: parsed?.fmt || old.fmt }
    Object.keys(look).forEach((k) => look[k] === undefined && delete look[k])
    if (!parsed && !look.bg && !look.b && !look.i && !look.al) delete sheet().cells[a1]
    else sheet().cells[a1] = { ...look, ...(parsed ? { ...(parsed.f != null ? { f: parsed.f } : { v: parsed.v }) } : { v: '' }) }
  }
  function rangeCells(fn) {
    for (let r = Math.min(sel.r, sel.r2); r <= Math.max(sel.r, sel.r2); r++) for (let c = Math.min(sel.c, sel.c2); c <= Math.max(sel.c, sel.c2); c++) fn(r, c, addr(c, r))
  }
  function style(key, value) {
    if (readOnly) return
    commitEdit()
    remember()
    const cur = sheet().cells[addr(sel.c, sel.r)] || {}
    const next = key === 'b' || key === 'i' ? !cur[key] : key === 'al' && cur.al === value ? '' : value
    rangeCells((r, c, a1) => {
      const cell = sheet().cells[a1] || { v: '' }
      if (next) cell[key] = next; else delete cell[key]
      sheet().cells[a1] = cell
    })
    paint(); changed()
  }
  function clearRange() {
    if (readOnly) return
    remember()
    rangeCells((r, c, a1) => {
      const cell = sheet().cells[a1]
      if (!cell) return
      const keep = { b: cell.b, i: cell.i, al: cell.al, bg: cell.bg, fmt: cell.fmt }
      Object.keys(keep).forEach((k) => !keep[k] && delete keep[k])
      if (Object.keys(keep).length) sheet().cells[a1] = { ...keep, v: '' }
      else delete sheet().cells[a1]
    })
    paint(); changed()
  }
  function autoSum() {
    if (readOnly) return
    commitEdit()
    const { r, c } = sel
    let top = r - 1
    while (top >= 0 && typeof cellValue(top, c) === 'number') top--
    if (top < r - 1) { remember(); setRaw(r, c, `=SUM(${addr(c, top + 1)}:${addr(c, r - 1)})`); paint(); changed(); return }
    let left = c - 1
    while (left >= 0 && typeof cellValue(r, left) === 'number') left--
    if (left < c - 1) { remember(); setRaw(r, c, `=SUM(${addr(left + 1, r)}:${addr(c - 1, r)})`); paint(); changed() }
  }
  function cellValue(r, c) {
    const a1 = addr(c, r)
    const cell = sheet().cells[a1]
    if (!cell) return ''
    return cell.f != null ? makeEvaluator(wb).value(sheet().name, a1) : cell.v
  }
  function doUndo() { if (!undo.length) return; commitEdit(); redo.push(JSON.stringify(wb)); wb = JSON.parse(undo.pop()); si = Math.min(si, wb.sheets.length - 1); build(); changed() }
  function doRedo() { if (!redo.length) return; undo.push(JSON.stringify(wb)); wb = JSON.parse(redo.pop()); si = Math.min(si, wb.sheets.length - 1); build(); changed() }

  // ---------- editing a cell in place ----------
  function startEdit(initial) {
    if (readOnly) return
    const td = cellEls[sel.r]?.[sel.c]
    if (!td) return
    const cell = sheet().cells[addr(sel.c, sel.r)]
    const input = el('input', 'xs-edit')
    input.spellcheck = false
    input.setAttribute('autocomplete', 'off')
    input.value = initial != null ? initial : cell ? (cell.f != null ? `=${cell.f}` : String(cell.v ?? '')) : ''
    const rect = td.getBoundingClientRect()
    const box = scroll.getBoundingClientRect()
    input.style.left = `${rect.left - box.left + scroll.scrollLeft}px`
    input.style.top = `${rect.top - box.top + scroll.scrollTop}px`
    input.style.minWidth = `${rect.width}px`
    input.style.height = `${rect.height}px`
    scroll.appendChild(input)
    editing = { r: sel.r, c: sel.c, input }
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
    input.addEventListener('input', () => { fxInput.value = input.value })
    input.addEventListener('keydown', (e) => {
      e.stopPropagation() // the grid's own keys must not act on this key too
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(); move(e.shiftKey ? -1 : 1, 0) }
      else if (e.key === 'Tab') { e.preventDefault(); commitEdit(); move(0, e.shiftKey ? -1 : 1) }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
    })
    input.addEventListener('blur', () => setTimeout(() => { if (editing?.input === input && document.activeElement !== fxInput) commitEdit() }, 0))
  }
  function commitEdit() {
    if (!editing) return
    const { r, c, input } = editing
    editing = null
    input.remove()
    const before = sheet().cells[addr(c, r)]
    const now = input.value
    const was = before ? (before.f != null ? `=${before.f}` : String(before.v ?? '')) : ''
    if (now !== was) { remember(); setRaw(r, c, now); size(); if (r >= rows - 5 || c >= cols - 2) build(); else paint(); changed() }
    scroll.focus({ preventScroll: true })
  }
  function cancelEdit() {
    if (!editing) return
    editing.input.remove()
    editing = null
    markSelection()
    scroll.focus({ preventScroll: true })
  }
  const editingFormula = () => { const v = editing ? editing.input.value : document.activeElement === fxInput ? fxInput.value : ''; return v.startsWith('=') ? (editing ? editing.input : fxInput) : null }

  function move(dr, dc, extend = false) {
    const r = Math.max(0, Math.min(MAX_ROWS - 1, (extend ? sel.r2 : sel.r) + dr))
    const c = Math.max(0, Math.min(MAX_COLS - 1, (extend ? sel.c2 : sel.c) + dc))
    if (extend) { sel.r2 = r; sel.c2 = c } else sel = { r, c, r2: r, c2: c }
    if (r >= rows - 3 || c >= cols - 1) build(); else markSelection()
    cellEls[extend ? sel.r2 : sel.r]?.[extend ? sel.c2 : sel.c]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  // ---------- events ----------
  let dragging = false
  table.addEventListener('mousedown', (e) => {
    const td = e.target.closest('td')
    const grip = e.target.closest('.xs-grip')
    if (grip && !readOnly) { resizeCol(e, Number(grip.dataset.c)); return }
    if (!td) {
      const ch = e.target.closest('th.xs-colh')
      const rh = e.target.closest('th.xs-rowh')
      if (ch) { commitEdit(); const c = Number(ch.dataset.c); sel = { r: 0, c, r2: rows - 1, c2: c }; markSelection() }
      if (rh) { commitEdit(); const r = Number(rh.dataset.r); sel = { r, c: 0, r2: r, c2: cols - 1 }; markSelection() }
      return
    }
    const r = Number(td.dataset.r)
    const c = Number(td.dataset.c)
    const f = editingFormula()
    if (f) {
      // a click while typing a formula: put the clicked cell's address into it
      e.preventDefault()
      const ref = addr(c, r)
      f.value += /[=(,+\-*/^&<>:]$/.test(f.value) ? ref : `+${ref}`
      if (f === fxInput) fxInput.focus(); else editing.input.focus()
      if (editing) fxInput.value = editing.input.value
      return
    }
    commitEdit()
    if (e.shiftKey) { sel.r2 = r; sel.c2 = c } else sel = { r, c, r2: r, c2: c }
    dragging = true
    markSelection()
    scroll.focus({ preventScroll: true })
  })
  table.addEventListener('mouseover', (e) => {
    if (!dragging) return
    const td = e.target.closest('td')
    if (!td) return
    sel.r2 = Number(td.dataset.r)
    sel.c2 = Number(td.dataset.c)
    markSelection()
  })
  const stopDrag = () => { dragging = false }
  window.addEventListener('mouseup', stopDrag)
  table.addEventListener('dblclick', (e) => { if (e.target.closest('td')) startEdit() })

  function resizeCol(e, c) {
    e.preventDefault()
    const start = e.clientX
    const startW = sheet().cols?.[c] || DEFAULT_W
    const colEl = table.querySelectorAll('col')[c + 1]
    const startTable = table.offsetWidth
    const moveFn = (ev) => { const w = Math.max(30, Math.min(600, startW + ev.clientX - start)); colEl.style.width = `${w}px`; table.style.width = `${startTable + w - startW}px` }
    const up = (ev) => {
      window.removeEventListener('mousemove', moveFn)
      window.removeEventListener('mouseup', up)
      const w = Math.max(30, Math.min(600, startW + ev.clientX - start))
      if (w !== startW) { remember(); sheet().cols = { ...(sheet().cols || {}), [c]: w }; changed() }
    }
    window.addEventListener('mousemove', moveFn)
    window.addEventListener('mouseup', up)
  }

  scroll.addEventListener('keydown', (e) => {
    if (editing) return
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return }
    if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); style('b'); return }
    if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); style('i'); return }
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); sel = { r: 0, c: 0, r2: rows - 1, c2: cols - 1 }; markSelection(); return }
    if (mod) return // copy / paste come as their own events
    const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (arrows[e.key]) { e.preventDefault(); move(...arrows[e.key], e.shiftKey); return }
    if (e.key === 'Enter') { e.preventDefault(); move(e.shiftKey ? -1 : 1, 0); return }
    if (e.key === 'Tab') { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); return }
    if (e.key === 'F2') { e.preventDefault(); startEdit(); return }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); clearRange(); return }
    if (e.key.length === 1 && !e.altKey) { e.preventDefault(); startEdit(e.key) }
  })
  scroll.addEventListener('copy', (e) => {
    if (editing) return
    e.preventDefault()
    const ev = makeEvaluator(wb)
    const lines = []
    for (let r = Math.min(sel.r, sel.r2); r <= Math.max(sel.r, sel.r2); r++) {
      const line = []
      for (let c = Math.min(sel.c, sel.c2); c <= Math.max(sel.c, sel.c2); c++) {
        const a1 = addr(c, r)
        const cell = sheet().cells[a1]
        line.push(cell ? display(cell.f != null ? ev.value(sheet().name, a1) : cell.v, cell.fmt) : '')
      }
      lines.push(line.join('\t'))
    }
    e.clipboardData.setData('text/plain', lines.join('\n'))
  })
  scroll.addEventListener('paste', (e) => {
    if (editing || readOnly) return
    const text = e.clipboardData.getData('text/plain')
    if (!text) return
    e.preventDefault()
    remember()
    const lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n')
    lines.forEach((line, i) => line.split('\t').forEach((v, j) => {
      const r = sel.r + i
      const c = sel.c + j
      if (r < MAX_ROWS && c < MAX_COLS) setRaw(r, c, v)
    }))
    sel.r2 = Math.min(MAX_ROWS - 1, sel.r + lines.length - 1)
    sel.c2 = Math.min(MAX_COLS - 1, sel.c + Math.max(...lines.map((l) => l.split('\t').length)) - 1)
    build(); changed()
  })
  // the formula bar edits the active cell
  fxInput.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      remember(); setRaw(sel.r, sel.c, fxInput.value); paint(); changed()
      scroll.focus({ preventScroll: true }); move(1, 0)
    } else if (e.key === 'Escape') { e.preventDefault(); markSelection(); scroll.focus({ preventScroll: true }) }
  })
  fxInput.addEventListener('focus', () => { if (editing) { const v = editing.input.value; cancelEdit(); fxInput.value = v } })

  build()
  return {
    getBook: () => { commitEdit(); return clone(wb) },
    destroy: () => { window.removeEventListener('mouseup', stopDrag); root.replaceChildren(); root.classList.remove('xs') },
  }
}
export { parseAddr }
