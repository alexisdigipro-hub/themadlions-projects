import { useEffect, useRef } from 'react'
import { cleanRich, fontStack } from '../lib/richText.js'
import { FONTS, ensureFontLoaded } from '../lib/fonts.js'

/* Text with a little formatting (Alex, 11 Oct). One toolbar serves every text box of a form ("one bar
   of text tools for all the forms"): RichToolbar works on whichever RichText box was last clicked
   into, on the selected words or on what is typed next. RichText is the box itself: `html` is read
   when it is mounted (give it a key that changes when another day or section opens), onChange gets
   the cleaned html as it is typed or formatted. */

let lastBox = null // the RichText box the toolbar works on

export default function RichText({ html, onChange, placeholder = '', single = false }) {
  const box = useRef(null)
  const change = useRef(onChange)
  change.current = onChange
  useEffect(() => {
    if (box.current) box.current.innerHTML = cleanRich(html)
    return () => { if (lastBox === box.current) lastBox = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const emit = () => { if (box.current) change.current(cleanRich(box.current.innerHTML)) }
  return (
    <div
      ref={box}
      className={`rt-box input${single ? ' single' : ''}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={!single}
      data-placeholder={placeholder}
      onFocus={() => { lastBox = box.current }}
      onInput={emit}
      onBlur={emit}
      // a one-line box (the line under the call) takes no new lines
      onKeyDown={single ? (e) => { if (e.key === 'Enter') e.preventDefault() } : undefined}
    />
  )
}

const icon = (d) => <svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg>

export function RichToolbar() {
  // the box the selection is in, else the one used last
  const target = () => {
    const sel = window.getSelection()
    const at = sel?.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)
    return at?.closest?.('.rt-box') || lastBox
  }
  const run = (cmd, value) => {
    const box = target()
    if (!box) return
    if (!box.contains(document.activeElement) && document.activeElement !== box) box.focus()
    try { document.execCommand('styleWithCSS', false, false) } catch {}
    document.execCommand(cmd, false, value)
    box.dispatchEvent(new Event('input', { bubbles: true })) // the box saves what changed
  }
  // the selected words, or the whole box when nothing in it is selected
  const pick = (box) => {
    const sel = window.getSelection()
    // focusing a box that already has the caret can drop the selection in Safari, so only when it has not
    if (!box.contains(sel.anchorNode)) box.focus()
    if (!sel.rangeCount || sel.isCollapsed || !box.contains(sel.anchorNode)) {
      const all = document.createRange()
      all.selectNodeContents(box)
      sel.removeAllRanges()
      sel.addRange(all)
    }
    return sel
  }
  /* Styles exactly the selected letters (Alex, 11 Oct: "the text I select"), without leaning on the
     browser's own font commands, which differ between Safari and Chrome: every piece of text inside
     the selection is cut out of its line and wrapped in a span (or, when a span already holds just
     that piece, the span itself is restyled), then the same letters are selected again so the next
     press goes on from there. */
  const styleSelection = (box, sel, apply) => {
    const r = sel.getRangeAt(0)
    const pieces = []
    const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT)
    while (walk.nextNode()) {
      const n = walk.currentNode
      if (!n.textContent || !r.intersectsNode(n)) continue
      const from = n === r.startContainer ? r.startOffset : 0
      const to = n === r.endContainer ? r.endOffset : n.length
      if (from < to) pieces.push([n, from, to])
    }
    const done = []
    for (const [n, from, to] of pieces) {
      let t = n
      if (to < t.length) t.splitText(to)
      if (from > 0) t = t.splitText(from)
      const p = t.parentElement
      if (p && p !== box && p.tagName === 'SPAN' && p.childNodes.length === 1) { apply(p, true); done.push(p); continue }
      const span = document.createElement('span')
      t.replaceWith(span)
      span.append(t)
      apply(span, false)
      done.push(span)
    }
    if (done.length) {
      const again = document.createRange()
      again.setStartBefore(done[0])
      again.setEndAfter(done[done.length - 1])
      sel.removeAllRanges()
      sel.addRange(again)
    }
    box.dispatchEvent(new Event('input', { bubbles: true }))
  }
  // Smaller / bigger by 15% each press, as far as you like: the size is a share of the text around
  const size = (factor) => {
    const box = target()
    if (!box) return
    styleSelection(box, pick(box), (el, had) => {
      const now = had ? parseFloat(el.style.fontSize) || 1 : 1
      el.style.fontSize = `${Math.round(Math.max(0.05, Math.min(20, now * factor)) * 1000) / 1000}em`
    })
  }
  // a typeface from the app's own list (Settings > Display), fetched from Google Fonts when picked
  const face = (id) => {
    const f = FONTS.find((x) => x.id === id)
    const box = target()
    if (!f || !box) return
    ensureFontLoaded(f.id)
    styleSelection(box, pick(box), (el) => { el.style.fontFamily = fontStack(f) })
  }
  // a toolbar button must not take the selection away from the text
  const hold = (e) => e.preventDefault()
  const btn = (label, onClick, body) => <button type="button" onMouseDown={hold} onClick={onClick} title={label} aria-label={label}>{body}</button>
  return (
    <div className="rt-bar" role="toolbar" aria-label="Text tools">
      <span className="rt-bar-h">Text</span>
      {btn('Smaller text', () => size(0.85), <><span className="rt-a small">A</span>−</>)}
      {btn('Bigger text', () => size(1.15), <><span className="rt-a">A</span>+</>)}
      <select className="rt-font" value="" onMouseDown={(e) => { if (!target()) e.preventDefault() }} onChange={(e) => face(e.target.value)} aria-label="Font" title="Font">
        <option value="">Font</option>
        {FONTS.map((f) => <option key={f.id} value={f.id} style={{ fontFamily: fontStack(f) }}>{f.label}</option>)}
      </select>
      <i className="rt-sep" />
      {btn('Bold', () => run('bold'), <b>B</b>)}
      {btn('Italic', () => run('italic'), <i>I</i>)}
      {btn('Underline', () => run('underline'), <u>U</u>)}
      {btn('List', () => run('insertUnorderedList'), icon(<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />))}
      <i className="rt-sep" />
      {btn('Align left', () => run('justifyLeft'), icon(<path d="M4 6h16M4 10h10M4 14h16M4 18h10" />))}
      {btn('Centre', () => run('justifyCenter'), icon(<path d="M4 6h16M7 10h10M4 14h16M7 18h10" />))}
      {btn('Align right', () => run('justifyRight'), icon(<path d="M4 6h16M10 10h10M4 14h16M10 18h10" />))}
      <i className="rt-sep" />
      {btn('Plain text again', () => run('removeFormat'), icon(<><path d="M5 6h11M10 6l-3 13" /><path d="m15 14 5 5M20 14l-5 5" /></>))}
    </div>
  )
}
