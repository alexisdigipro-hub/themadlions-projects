/* The document editor on the Office page (Alex, 8 Oct): a white A4-like page you type on, with a
   toolbar like Word's everyday one. Paragraph, Title, Heading, Subheading, Quote; bold, italic,
   underline, strike-through, a text colour; alignment; bullets, numbers and a checklist (a tap on
   its box ticks it); a table; a picture from the computer or phone (made smaller first); undo,
   redo and clear formatting. Plain DOM and the browser's own editing, no library. The HTML it
   keeps is what lib/office/docx.js turns into a Word file. */

const COLORS = ['', '#c0392b', '#d35400', '#b7950b', '#1e8449', '#1f618d', '#7d3c98', '#7f8c8d']
// the toolbar's line icons (Alex, 15 Oct: "every function in notes professional")
const svg = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
const ICON = {
  left: svg('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'),
  centre: svg('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'),
  right: svg('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'),
  bullets: svg('<circle cx="5" cy="7" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="17" r="1.2" fill="currentColor"/><path d="M10 7h10M10 12h10M10 17h10"/>'),
  numbers: svg('<path d="M10 7h10M10 12h10M10 17h10"/><path d="M4 5.5 5.5 5v4M4 9h3M4 14.5c.4-.6 2.6-.8 2.6.5 0 1-2.6 1.8-2.6 3h2.8"/>'),
  check: svg('<rect x="3.5" y="4.5" width="6" height="6" rx="1.5"/><path d="m4.8 7.6 1.3 1.3 2.3-2.4M13 7.5h7.5M13 16.5h7.5"/><rect x="3.5" y="13.5" width="6" height="6" rx="1.5"/>'),
  table: svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10M15 9.5v10"/>'),
  picture: svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 2.5-2.5L20 19"/>'),
  undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
  clear: svg('<path d="M6 5h12M12 5l-3 14M5 19h8M16 15l4 4M20 15l-4 4"/>'),
}
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }

/* A picture as a data URL no wider than max px, so a phone photo does not make a 10 MB document. */
async function shrink(file, max = 1400) {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close?.()
  const png = file.type === 'image/png' && c.width * c.height < 600 * 600
  return { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85), w: c.width, h: c.height }
}

export function mountDoc(root, html, { onChange, readOnly = false } = {}) {
  root.replaceChildren()
  root.classList.add('xd')
  const bar = el('div', 'xd-bar')
  const page = el('div', 'xd-page')
  page.contentEditable = readOnly ? 'false' : 'true'
  page.spellcheck = true
  page.innerHTML = html || '<p><br></p>'
  try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch {} // new lines as <p>, not <div>
  const wrap = el('div', 'xd-scroll')
  wrap.appendChild(page)
  root.append(bar, wrap)

  let timer = null
  const changed = () => { clearTimeout(timer); timer = setTimeout(() => onChange?.(page.innerHTML), 300) }
  /* Where the cursor was, kept as it moves (Alex, 15 Oct: bullets and text "went elsewhere" on the
     iPhone): a tap on a toolbar button or the ¶ menu takes the focus off the page, and page.focus()
     alone puts the cursor back at the very start, so a list landed on the first line. Every command
     first puts the cursor back where it was. */
  let saved = null
  const keep = () => { const s = window.getSelection(); if (s && s.rangeCount && page.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange() }
  const restore = () => {
    page.focus()
    if (!saved || !page.contains(saved.startContainer)) return
    const s = window.getSelection()
    s.removeAllRanges()
    s.addRange(saved)
  }
  const exec = (cmd, value = null) => { restore(); document.execCommand(cmd, false, value); tidy(); keep(); changed(); refresh() }
  /* A list started on a title, a heading or a quote: the browser puts the list inside it (<h1><ul>…),
     and the text scatters. The line becomes a plain paragraph first, then the list. */
  const listCmd = (cmd) => {
    restore()
    const b = currentBlock()
    // the cursor is where the line now is: going through exec would put back the spot kept inside the
    // old heading, which the browser has just replaced
    if (b && /^(H[1-6]|BLOCKQUOTE)$/.test(b.tagName)) document.execCommand('formatBlock', false, '<p>')
    document.execCommand(cmd, false, null); tidy(); keep(); changed(); refresh()
  }
  /* The browser's list command can put a list inside a paragraph (<p><ul>…), which a paragraph
     cannot hold: such a paragraph is taken apart into its blocks, loose text in paragraphs of its own. */
  const BLOCKS = /^(UL|OL|TABLE|P|DIV|H[1-6]|BLOCKQUOTE)$/
  function tidy() {
    for (const p of [...page.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote')]) {
      if (![...p.children].some((c) => BLOCKS.test(c.tagName))) continue
      const parts = []
      let loose = null
      for (const c of [...p.childNodes]) {
        if (c.nodeType === 1 && BLOCKS.test(c.tagName)) { loose = null; parts.push(c) }
        else if (c.nodeType === 3 && !c.nodeValue.trim() && !loose) continue
        else { if (!loose) { loose = el(p.tagName === 'BLOCKQUOTE' ? 'p' : p.tagName.toLowerCase()); parts.push(loose) } loose.appendChild(c) }
      }
      p.replaceWith(...parts)
    }
  }
  const btn = (label, title, fn, cls = '') => {
    const b = el('button', `xs-btn ${cls}`, label.startsWith('<svg') ? null : label)
    if (label.startsWith('<svg')) b.innerHTML = label
    b.setAttribute('aria-label', title)
    b.type = 'button'
    b.title = title
    b.addEventListener('mousedown', (e) => e.preventDefault()) // keep the text selected
    b.addEventListener('click', fn)
    bar.appendChild(b)
    return b
  }
  const sep = () => bar.appendChild(el('span', 'xs-sep'))

  const block = el('select', 'xs-fmt xd-block')
  for (const [v, l] of [['p', 'Paragraph'], ['h1', 'Title'], ['h2', 'Heading'], ['h3', 'Subheading'], ['blockquote', 'Quote']]) { const o = el('option', '', l); o.value = v; block.appendChild(o) }
  block.title = 'Paragraph style'
  block.addEventListener('change', () => exec('formatBlock', `<${block.value}>`))
  // the menu takes the focus when it opens: the cursor is kept right before that
  block.addEventListener('pointerdown', keep)
  block.addEventListener('focus', () => { if (!saved) keep() })
  // a ¶ the menu lies over, see-through, for a phone's round buttons (Alex, 15 Oct: "Paragraph" was cut);
  // elsewhere the wrapper takes no room (display: contents) and the ¶ is not shown
  const blockWrap = el('span', 'xd-block-wrap')
  blockWrap.appendChild(el('span', 'xd-block-ico', '¶'))
  blockWrap.appendChild(block)
  bar.appendChild(blockWrap)
  sep()
  const bB = btn('B', 'Bold (Ctrl/Cmd+B)', () => exec('bold'), 'xs-b')
  const bI = btn('I', 'Italic (Ctrl/Cmd+I)', () => exec('italic'), 'xs-i')
  const bU = btn('U', 'Underline (Ctrl/Cmd+U)', () => exec('underline'), 'xd-u')
  const bS = btn('S', 'Strike-through', () => exec('strikeThrough'), 'xd-s')
  const colors = el('span', 'xs-fills')
  for (const c of COLORS) {
    const s = el('button', 'xs-fill xd-color')
    s.type = 'button'
    s.title = c ? 'Text colour' : 'Default colour'
    s.style.background = c || 'transparent'
    if (!c) s.textContent = 'A'
    s.addEventListener('mousedown', (e) => e.preventDefault())
    s.addEventListener('click', () => exec('foreColor', c || getComputedStyle(page).color))
    colors.appendChild(s)
  }
  bar.appendChild(colors)
  sep()
  const bL = btn(ICON.left, 'Align left', () => exec('justifyLeft'))
  const bC = btn(ICON.centre, 'Centre', () => exec('justifyCenter'))
  const bR = btn(ICON.right, 'Align right', () => exec('justifyRight'))
  sep()
  const bUl = btn(ICON.bullets, 'Bullets', () => listCmd('insertUnorderedList'))
  const bOl = btn(ICON.numbers, 'Numbers', () => listCmd('insertOrderedList'))
  // the checklist and the table are built by hand: the browser's list command would merge a new
  // list into a list just above it
  btn(ICON.check, 'Checklist', () => {
    restore()
    const inList = closest('ul')
    if (inList?.classList.contains('checklist')) {
      // off again: the items become paragraphs
      const ps = [...inList.children].map((li) => { const p = el('p'); p.innerHTML = li.innerHTML || '<br>'; return p })
      inList.replaceWith(...ps)
      caretIn(ps[0])
    } else {
      const blockEl = currentBlock()
      const ul = el('ul', 'checklist')
      const li = el('li')
      li.dataset.checked = 'false'
      li.innerHTML = blockEl && (blockEl.tagName === 'P' || blockEl.tagName === 'DIV') ? (blockEl.innerHTML || '<br>') : '<br>'
      ul.appendChild(li)
      if (blockEl && (blockEl.tagName === 'P' || blockEl.tagName === 'DIV')) blockEl.replaceWith(ul)
      else placeAfter(blockEl, ul)
      caretIn(li, true)
    }
    changed(); refresh()
  })
  btn(ICON.table, 'Table', () => {
    const size = prompt('Table size: columns x rows', '3 x 3')
    restore()
    const m = /(\d+)\s*[x×*]\s*(\d+)/i.exec(size || '')
    if (!m) return
    const cols = Math.max(1, Math.min(12, Number(m[1])))
    const rows = Math.max(1, Math.min(60, Number(m[2])))
    const t = el('table')
    const tb = el('tbody')
    for (let r = 0; r < rows; r++) { const tr = el('tr'); for (let c = 0; c < cols; c++) { const td = el('td'); td.innerHTML = '<br>'; tr.appendChild(td) } tb.appendChild(tr) }
    t.appendChild(tb)
    const after = el('p')
    after.innerHTML = '<br>'
    const blockEl = currentBlock()
    if (blockEl && (blockEl.tagName === 'P' || blockEl.tagName === 'DIV') && !blockEl.textContent.trim() && !blockEl.querySelector('img')) blockEl.replaceWith(t)
    else placeAfter(blockEl, t)
    t.after(after)
    caretIn(t.querySelector('td'))
    changed()
  })
  const picker = el('input')
  picker.type = 'file'
  picker.accept = 'image/*'
  picker.hidden = true
  picker.addEventListener('change', async () => {
    const f = picker.files?.[0]
    picker.value = ''
    if (!f) return
    try {
      const { src, w } = await shrink(f)
      exec('insertHTML', `<img src="${src}" width="${Math.min(w, 600)}" alt="">`)
    } catch { alert('Could not read that picture.') }
  })
  root.appendChild(picker)
  btn(ICON.picture, 'Picture', () => { keep(); picker.click() })
  sep()
  const bUndo = btn(ICON.undo, 'Undo (Ctrl/Cmd+Z)', () => exec('undo'))
  const bRedo = btn(ICON.redo, 'Redo', () => exec('redo'))
  btn(ICON.clear, 'Clear formatting', () => { exec('removeFormat'); exec('formatBlock', '<p>') })
  if (readOnly) bar.querySelectorAll('button, select').forEach((b) => { b.disabled = true })

  // the page's own child that holds the cursor
  function currentBlock() {
    let n = window.getSelection()?.anchorNode
    if (!n || !page.contains(n)) return null
    while (n && n.parentNode !== page) n = n.parentNode
    return n && n.nodeType === 1 ? n : null
  }
  function placeAfter(ref, node) { if (ref) ref.after(node); else page.appendChild(node) }
  function caretIn(node, atEnd = false) {
    if (!node) return
    const r = document.createRange()
    r.selectNodeContents(node)
    r.collapse(!atEnd)
    const s = window.getSelection()
    s.removeAllRanges()
    s.addRange(r)
    page.focus()
  }
  function closest(tag) {
    const s = window.getSelection()
    let n = s && s.anchorNode
    while (n && n !== page) { if (n.nodeType === 1 && n.tagName.toLowerCase() === tag) return n; n = n.parentNode }
    return null
  }
  // the toolbar follows the cursor: B lights up inside bold text, the style list shows the block
  function refresh() {
    if (!page.contains(window.getSelection()?.anchorNode)) return
    const q = (c) => { try { return document.queryCommandState(c) } catch { return false } }
    bB.classList.toggle('on', q('bold'))
    bI.classList.toggle('on', q('italic'))
    bU.classList.toggle('on', q('underline'))
    bS.classList.toggle('on', q('strikeThrough'))
    bL.classList.toggle('on', q('justifyLeft'))
    bC.classList.toggle('on', q('justifyCenter'))
    bR.classList.toggle('on', q('justifyRight'))
    bUl.classList.toggle('on', q('insertUnorderedList'))
    bOl.classList.toggle('on', q('insertOrderedList'))
    const blk = ['h1', 'h2', 'h3', 'blockquote'].find((t) => closest(t)) || 'p'
    block.value = blk
  }
  const onSel = () => { keep(); refresh() }
  document.addEventListener('selectionchange', onSel)
  page.addEventListener('input', () => {
    tidy()
    // Enter in a ticked item copies its tick to the new, empty one: a new item starts unticked
    page.querySelectorAll('ul.checklist > li').forEach((li) => { if (!li.dataset.checked || (li.dataset.checked === 'true' && !li.textContent.trim())) li.dataset.checked = 'false' })
    changed()
  })
  page.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === 's') e.preventDefault() // the page saves; the browser must not
    // Enter at the end of a title or heading starts a plain paragraph under it (Safari kept the title's
    // size for the next line, so the text under a note's title came out as a second title)
    if (e.key === 'Enter' && !e.shiftKey && !mod) {
      const b = currentBlock(), s = window.getSelection()
      if (b && /^H[1-6]$/.test(b.tagName) && s?.isCollapsed) {
        const r = document.createRange(); r.selectNodeContents(b); r.setStart(s.anchorNode, s.anchorOffset)
        if (!r.toString().length) { e.preventDefault(); const p = el('p'); p.innerHTML = '<br>'; b.after(p); caretIn(p); keep(); changed() }
      }
    }
  })
  // a checklist's box: a click in the space left of the text ticks it
  page.addEventListener('click', (e) => {
    const li = e.target.closest?.('ul.checklist > li')
    if (!li || readOnly) return
    // the round box and a little round it (it was 4px wide, too small for a finger)
    const left = li.getBoundingClientRect().left
    if (e.clientX < left + 26) { li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true'; changed() }
  })
  // pasting from the web or Word: keep the text and its simple marks, drop their fonts and sizes
  page.addEventListener('paste', (e) => {
    const htmlIn = e.clipboardData?.getData('text/html')
    if (!htmlIn) return
    e.preventDefault()
    const d = new DOMParser().parseFromString(htmlIn, 'text/html')
    d.querySelectorAll('script,style,meta,link,title,xml,o\\:p').forEach((x) => x.remove())
    d.body.querySelectorAll('*').forEach((x) => {
      const keepColor = x.style?.color
      for (const a of [...x.attributes]) if (!['href', 'src', 'colspan', 'rowspan', 'width'].includes(a.name)) x.removeAttribute(a.name)
      if (keepColor && x.tagName === 'SPAN') x.style.color = keepColor
    })
    document.execCommand('insertHTML', false, d.body.innerHTML)
    changed()
  })

  return {
    getHtml: () => page.innerHTML,
    focus: () => page.focus(),
    destroy: () => { clearTimeout(timer); document.removeEventListener('selectionchange', onSel); root.replaceChildren(); root.classList.remove('xd') },
  }
}
