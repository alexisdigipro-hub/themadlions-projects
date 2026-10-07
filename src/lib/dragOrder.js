import { useRef, useState } from 'react'

/* Dragging rows up and down a list by a handle, with the list reordering under the finger as it
   moves rather than arrows or a drop line.

   Pointer events, not HTML5 drag and drop: that one has no useful touch support, cannot be
   styled, and drops the row somewhere else entirely if the page scrolls mid-drag. This works the
   same with a mouse, a trackpad and a finger.

   useDragOrder(ids, onDrop) gives back:
     order    the ids as they should be drawn right now, which during a drag is the preview
     dragId   the id being carried, for styling
     bind(id) the props for that row's handle
     rowRef(id) the ref for the row itself, which is what the pointer is measured against
   onDrop is called with the new id order, once, only when it actually changed. */
export function useDragOrder(ids, onDrop) {
  const [drag, setDrag] = useState(null) // { id, to }
  const rows = useRef({})

  const base = ids
  const from = drag ? base.indexOf(drag.id) : -1
  const order = drag && from >= 0 ? move(base, from, drag.to) : base

  const start = (id) => (e) => {
    if (e.button > 0) return // right click, or a mouse button that is not the first
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ id, to: base.indexOf(id) })
  }

  // Where the pointer sits in the list as it is drawn now: the first row whose middle it is
  // above. Past the last middle it belongs at the end.
  const over = (y) => {
    let to = order.length - 1
    for (let i = 0; i < order.length; i++) {
      const el = rows.current[order[i]]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (y < r.top + r.height / 2) { to = i; break }
    }
    return to
  }

  const onPointerMove = (e) => {
    if (!drag) return
    const to = over(e.clientY)
    setDrag((d) => (d && d.to !== to ? { ...d, to } : d))
  }

  const finish = () => {
    setDrag(null)
    if (!drag) return
    const next = move(base, base.indexOf(drag.id), drag.to)
    if (next.some((id, i) => id !== base[i])) onDrop(next)
  }

  return {
    order,
    dragId: drag?.id || '',
    rowRef: (id) => (el) => { if (el) rows.current[id] = el; else delete rows.current[id] },
    bind: (id) => ({
      onPointerDown: start(id),
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: () => setDrag(null),
      // or the browser scrolls the page instead of letting the row be dragged on a phone
      style: { touchAction: 'none' },
    }),
  }
}

export function move(list, from, to) {
  if (from < 0 || to < 0 || from === to) return list
  const out = list.slice()
  out.splice(to, 0, out.splice(from, 1)[0])
  return out
}
