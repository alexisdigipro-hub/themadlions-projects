import { useEffect } from 'react'

/* ← and → on a computer step through a page's tabs (Alex, 27 Oct: Share, Database and Organizer): the tab before or
   after the chosen one is clicked, so it glides and slides as a click does. Not while typing (a field, a text area,
   a select, anything editable), not while a window is open, not with ⌘ / Ctrl / Alt / Shift held. `ref` holds the
   row of tabs (a <nav> whose chosen child carries .active or .on). */
const typing = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
export function useArrowTabs(ref) {
  useEffect(() => {
    const on = (e) => {
      if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.defaultPrevented) return
      if (typing(document.activeElement) || document.querySelector('.modal-backdrop')) return
      if (window.matchMedia?.('(max-width: 820px)').matches) return
      const row = ref.current
      if (!row || !row.isConnected) return
      const items = [...row.children].filter((n) => n.matches('a, button') && !n.disabled)
      const at = items.findIndex((n) => n.classList.contains('active') || n.classList.contains('on'))
      const to = items[at + (e.key === 'ArrowRight' ? 1 : -1)]
      if (at < 0 || !to) return
      e.preventDefault()
      to.click()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [ref])
}
