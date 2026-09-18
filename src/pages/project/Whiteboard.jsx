import { useEffect, useRef, useState } from 'react'
import { Button, Empty } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'

/* A brainstorm board: sticky notes, labelled areas and arrows between notes.
   It lives inside the project document like everything else, which is fine precisely because
   there is no freehand drawing and no images here: a note is a little text and four numbers.
   If images ever land on this board it has to move to a table of its own, or every save of
   every other tab in the project gets slower. */

const COLORS = ['#F2C94C', '#F2994A', '#EB5757', '#BB6BD9', '#6C9BD1', '#5B9E7A', '#9AA0A6']
const NOTE_W = 180, NOTE_H = 140, AREA_W = 460, AREA_H = 320
const MIN_ZOOM = 0.3, MAX_ZOOM = 2.5

const emptyNote = (x, y, color) => ({ id: uid(), kind: 'note', x, y, w: NOTE_W, h: NOTE_H, text: '', color })
const emptyArea = (x, y) => ({ id: uid(), kind: 'area', x, y, w: AREA_W, h: AREA_H, text: 'Group', color: '#9AA0A6' })

/* Where an arrow should meet a box: the point on its edge facing the other box, so the line
   stops at the note instead of disappearing under it. */
function edgePoint(box, towardX, towardY) {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2
  const dx = towardX - cx, dy = towardY - cy
  if (!dx && !dy) return { x: cx, y: cy }
  const scale = Math.min(Math.abs(dx) ? box.w / 2 / Math.abs(dx) : Infinity, Math.abs(dy) ? box.h / 2 / Math.abs(dy) : Infinity)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

export default function Whiteboard() {
  const { project, edit, canEdit } = useProject()
  const editable = canEdit('files')
  const wrapRef = useRef(null)
  const drag = useRef(null)
  const items = project.board?.items || []
  const [view, setView] = useState({ x: 0, y: 0, z: 1 })
  const [sel, setSel] = useState('')
  const [editing, setEditing] = useState('')
  const [linkFrom, setLinkFrom] = useState('')
  const [color, setColor] = useState(COLORS[0])

  const notes = items.filter((i) => i.kind === 'note')
  const areas = items.filter((i) => i.kind === 'area')
  const arrows = items.filter((i) => i.kind === 'arrow')
  const byId = Object.fromEntries(items.map((i) => [i.id, i]))
  const selected = byId[sel]

  const setItems = (fn) => edit((p) => {
    p.board = p.board || { items: [] }
    p.board.items = fn(p.board.items || [])
  })

  // Screen pixels to board coordinates, so a new note lands where the person is looking.
  const toBoard = (clientX, clientY) => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    return { x: (clientX - r.left - view.x) / view.z, y: (clientY - r.top - view.y) / view.z }
  }
  const centerOfView = () => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    return toBoard(r.left + r.width / 2, r.top + r.height / 2)
  }

  const addNote = () => {
    const c = centerOfView()
    const n = emptyNote(Math.round(c.x - NOTE_W / 2), Math.round(c.y - NOTE_H / 2), color)
    setItems((list) => [...list, n])
    setSel(n.id)
    setEditing(n.id)
  }
  const addArea = () => {
    const c = centerOfView()
    const a = emptyArea(Math.round(c.x - AREA_W / 2), Math.round(c.y - AREA_H / 2))
    setItems((list) => [a, ...list]) // areas sit behind the notes
    setSel(a.id)
  }
  const remove = (id) => {
    setItems((list) => list.filter((i) => i.id !== id && i.from !== id && i.to !== id))
    setSel('')
    setEditing('')
  }
  const setText = (id, text) => setItems((list) => list.map((i) => (i.id === id ? { ...i, text } : i)))
  const setColorOf = (id, c) => setItems((list) => list.map((i) => (i.id === id ? { ...i, color: c } : i)))

  const clickItem = (item) => {
    if (editable && linkFrom) {
      if (item.kind === 'arrow') return
      // 'pick' means the Arrow button was pressed with nothing selected: this click chooses the start.
      if (linkFrom === 'pick') { setLinkFrom(item.id); setSel(item.id); return }
      if (linkFrom !== item.id && !arrows.some((a) => a.from === linkFrom && a.to === item.id)) {
        setItems((list) => [...list, { id: uid(), kind: 'arrow', from: linkFrom, to: item.id, color: '#9AA0A6' }])
      }
      // Leave the note the arrow landed on selected, so pressing Arrow again chains onward from
      // there instead of starting over from the note you came from.
      setSel(item.id)
      setLinkFrom('')
      return
    }
    setSel(item.id)
  }

  // One pointer handler for dragging an item and for panning the board, so it works with a
  // mouse and with a finger without two code paths.
  const onPointerDown = (e, item) => {
    if (editing) return
    if (item && linkFrom) return
    if (item && !editable) { setSel(item.id); return }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = item
      ? { kind: 'item', id: item.id, startX: e.clientX, startY: e.clientY, ox: item.x, oy: item.y, moved: false }
      : { kind: 'pan', startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y, moved: false }
    if (item) setSel(item.id)
    else { setSel(''); setLinkFrom('') }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return
    d.moved = true
    if (d.kind === 'pan') setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }))
    else setItems((list) => list.map((i) => (i.id === d.id ? { ...i, x: Math.round(d.ox + dx / view.z), y: Math.round(d.oy + dy / view.z) } : i)))
  }
  const onPointerUp = () => { drag.current = null }

  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return // plain scroll still scrolls the page
    e.preventDefault()
    setView((v) => ({ ...v, z: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.z * (e.deltaY < 0 ? 1.1 : 0.9))) }))
  }
  const zoomBy = (f) => setView((v) => ({ ...v, z: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.z * f)) }))
  const fit = () => {
    const boxes = items.filter((i) => i.kind !== 'arrow')
    const r = wrapRef.current?.getBoundingClientRect()
    if (!boxes.length || !r) return setView({ x: 0, y: 0, z: 1 })
    const minX = Math.min(...boxes.map((b) => b.x)), minY = Math.min(...boxes.map((b) => b.y))
    const maxX = Math.max(...boxes.map((b) => b.x + b.w)), maxY = Math.max(...boxes.map((b) => b.y + b.h))
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((r.width - 60) / (maxX - minX || 1), (r.height - 60) / (maxY - minY || 1))))
    setView({ z, x: r.width / 2 - ((minX + maxX) / 2) * z, y: r.height / 2 - ((minY + maxY) / 2) * z })
  }

  useEffect(() => {
    const onKey = (e) => {
      if (editing) return
      if (e.key === 'Escape') { setSel(''); setLinkFrom('') }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel && editable) { e.preventDefault(); remove(sel) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, editing, editable])

  if (!editable && !items.length) {
    return <Empty title="Nothing on the board yet">The board is empty and you have view-only access to this project's files.</Empty>
  }

  return (
    <div className="wb">
      <div className="toolbar no-print wb-bar">
        {editable && <Button variant="primary" onClick={addNote}>Add note</Button>}
        {editable && <Button variant="ghost" onClick={addArea}>Add group</Button>}
        {editable && (
          <Button variant={linkFrom ? 'primary' : 'ghost'} onClick={() => { setLinkFrom(linkFrom ? '' : (selected && selected.kind !== 'arrow' ? sel : 'pick')); setEditing('') }}>
            {linkFrom ? 'Pick the second note' : 'Arrow'}
          </Button>
        )}
        {editable && (
          <span className="wb-swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`wb-swatch ${(selected ? selected.color : color) === c ? 'on' : ''}`}
                style={{ background: c }}
                title={selected ? 'Recolour the selected item' : 'Colour for new notes'}
                onClick={() => (selected ? setColorOf(selected.id, c) : setColor(c))}
              />
            ))}
          </span>
        )}
        <div className="toolbar-actions">
          {selected && editable && <Button variant="ghost" onClick={() => remove(selected.id)}>Delete</Button>}
          <Button variant="ghost" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">−</Button>
          <span className="wb-zoom">{Math.round(view.z * 100)}%</span>
          <Button variant="ghost" onClick={() => zoomBy(1.2)} aria-label="Zoom in">+</Button>
          <Button variant="ghost" onClick={fit}>Fit</Button>
        </div>
      </div>

      {linkFrom === 'pick' && <p className="muted small wb-hint">Click the note the arrow starts from, then the one it points to.</p>}
      {linkFrom && linkFrom !== 'pick' && <p className="muted small wb-hint">Now click the note the arrow points to. Escape cancels.</p>}
      {!items.length && <p className="muted small wb-hint">Empty board. Add a note and drag it around. Drag the background to move, ctrl and scroll to zoom.</p>}

      <div
        className={`wb-canvas ${linkFrom ? 'linking' : ''}`}
        ref={wrapRef}
        onPointerDown={(e) => onPointerDown(e, null)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div className="wb-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          <svg className="wb-arrows" aria-hidden="true">
            <defs>
              <marker id="wb-head" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                <path d="M0,0 L9,4.5 L0,9 z" fill="#9AA0A6" />
              </marker>
            </defs>
            {arrows.map((a) => {
              const f = byId[a.from], t = byId[a.to]
              if (!f || !t) return null
              const p1 = edgePoint(f, t.x + t.w / 2, t.y + t.h / 2)
              const p2 = edgePoint(t, f.x + f.w / 2, f.y + f.h / 2)
              return (
                <g key={a.id} className={sel === a.id ? 'on' : ''} onPointerDown={(e) => { e.stopPropagation(); setSel(a.id) }}>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth="14" />
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={a.color} strokeWidth="2" markerEnd="url(#wb-head)" />
                </g>
              )
            })}
          </svg>

          {areas.map((a) => (
            <div
              key={a.id}
              className={`wb-area ${sel === a.id ? 'on' : ''} ${linkFrom ? 'linkable' : ''}`}
              style={{ left: a.x, top: a.y, width: a.w, height: a.h, borderColor: a.color }}
              onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, a) }}
              onClick={(e) => { e.stopPropagation(); clickItem(a) }}
              onDoubleClick={() => editable && setEditing(a.id)}
            >
              {editing === a.id ? (
                <input className="wb-area-input" autoFocus value={a.text} onChange={(e) => setText(a.id, e.target.value)} onBlur={() => setEditing('')} onKeyDown={(e) => e.key === 'Enter' && setEditing('')} />
              ) : (
                <span className="wb-area-title" style={{ color: a.color }}>{a.text || 'Group'}</span>
              )}
            </div>
          ))}

          {notes.map((n) => (
            <div
              key={n.id}
              className={`wb-note ${sel === n.id ? 'on' : ''} ${linkFrom ? 'linkable' : ''}`}
              style={{ left: n.x, top: n.y, width: n.w, height: n.h, background: n.color }}
              onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, n) }}
              onClick={(e) => { e.stopPropagation(); clickItem(n) }}
              onDoubleClick={() => editable && setEditing(n.id)}
            >
              {editing === n.id ? (
                <textarea
                  className="wb-note-input"
                  autoFocus
                  value={n.text}
                  onChange={(e) => setText(n.id, e.target.value)}
                  onBlur={() => setEditing('')}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="wb-note-text">{n.text || <span className="wb-note-empty">{editable ? 'Double click to write' : ''}</span>}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
