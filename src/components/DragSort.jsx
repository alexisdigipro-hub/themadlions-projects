import { useEffect, useRef, useState } from 'react'

/* Drag to put things in order (Alex, 10 Oct: "wherever we move things with the arrows, make it
   draggable"). One way everywhere: grab the ⋮⋮ grip of a row with the mouse or a finger, drag it
   up or down (or sideways in a row of chips) and let go; a line shows where it will land. The grip
   owns the touch (touch-action: none), so the page does not scroll while a row is carried.

   const sort = useDragSort((from, to, group) => …)  then on each row:
     <tr {...sort.row(group, i)} className={`… ${sort.cls(group, i)}`}> <Grip {...sort.grip(group, i)} /> …
   A row can say data-sort-axis="x" for chips laid out side by side. */
export const moveItem = (list, from, to) => {
  const a = [...list]
  const [x] = a.splice(from, 1)
  a.splice(to, 0, x)
  return a
}

export function useDragSort(onMove) {
  const [drag, setDrag] = useState(null) // { group, from, over, after }
  const live = useRef(null)
  live.current = drag
  const done = useRef(onMove)
  done.current = onMove

  useEffect(() => {
    if (!drag) return undefined
    const group = String(drag.group)
    const hit = (x, y) => {
      for (const el of document.elementsFromPoint(x, y)) {
        const row = el.closest?.('[data-sort-index]')
        if (!row || row.dataset.sortGroup !== group) continue
        const r = row.getBoundingClientRect()
        const across = row.dataset.sortAxis === 'x'
        return { over: Number(row.dataset.sortIndex), after: across ? x > r.left + r.width / 2 : y > r.top + r.height / 2 }
      }
      return null
    }
    const move = (e) => {
      const h = hit(e.clientX, e.clientY)
      if (h) setDrag((d) => (d && (d.over !== h.over || d.after !== h.after) ? { ...d, ...h } : d))
    }
    const up = () => {
      const d = live.current
      setDrag(null)
      if (!d || d.over == null) return
      let to = d.over + (d.after ? 1 : 0)
      if (to > d.from) to -= 1
      if (to !== d.from) done.current(d.from, to, d.group)
    }
    const cancel = () => setDrag(null)
    const hold = (e) => e.preventDefault() // the page must not scroll under a carried row
    document.documentElement.classList.add('sorting')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    document.addEventListener('touchmove', hold, { passive: false })
    return () => {
      document.documentElement.classList.remove('sorting')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      document.removeEventListener('touchmove', hold)
    }
  }, [!!drag]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    dragging: !!drag,
    grip: (group, i) => ({
      onPointerDown: (e) => {
        if (e.button > 0) return
        e.preventDefault()
        e.stopPropagation()
        setDrag({ group, from: i, over: null, after: false })
      },
      onClick: (e) => e.stopPropagation(),
    }),
    row: (group, i, axis) => ({ 'data-sort-group': String(group), 'data-sort-index': i, ...(axis === 'x' ? { 'data-sort-axis': 'x' } : {}) }),
    cls: (group, i) => {
      if (!drag || String(drag.group) !== String(group)) return ''
      if (drag.from === i) return 'sort-dragging'
      if (drag.over === i) return drag.after ? 'sort-after' : 'sort-before'
      return ''
    },
  }
}

export function Grip(props) {
  return <span className="sort-grip" role="button" aria-label="Drag to reorder" title="Drag to reorder" {...props}>⋮⋮</span>
}
