import { useEffect, useRef } from 'react'
import { cleanRich } from '../lib/richText.js'

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

const SIZES = [2, 3, 4, 5, 6] // <font size>: smaller, normal, bigger, big, biggest
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
  const size = (dir) => {
    const box = target()
    if (!box) return
    if (document.activeElement !== box) box.focus()
    const now = Number(document.queryCommandValue('fontSize')) || 3
    const i = SIZES.indexOf(now)
    run('fontSize', String(SIZES[Math.max(0, Math.min(SIZES.length - 1, (i < 0 ? 1 : i) + dir))]))
  }
  // a toolbar button must not take the selection away from the text
  const hold = (e) => e.preventDefault()
  const btn = (label, onClick, body) => <button type="button" onMouseDown={hold} onClick={onClick} title={label} aria-label={label}>{body}</button>
  return (
    <div className="rt-bar" role="toolbar" aria-label="Text tools">
      <span className="rt-bar-h">Text</span>
      {btn('Smaller text', () => size(-1), <><span className="rt-a small">A</span>−</>)}
      {btn('Bigger text', () => size(1), <><span className="rt-a">A</span>+</>)}
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
