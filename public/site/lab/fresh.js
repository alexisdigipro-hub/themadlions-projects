// The Lab's fresh layer (lab/fresh.css): the reading line, the light that follows the pointer on the cards, the icon
// leaning a little toward the pointer. Nothing else; pages work the same without it.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const bar = document.createElement('div'); bar.className = 'f-progress'; document.body.appendChild(bar)
  let queued = false
  const read = () => { queued = false; const h = document.documentElement.scrollHeight - innerHeight; bar.style.setProperty('--f-read', h > 0 ? Math.min(1, scrollY / h).toFixed(4) : 0) }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(read) } }, { passive: true }); read()
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest?.('.f-card')
    if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`) }
    if (still) return
    document.querySelectorAll('.f-icon').forEach((ic) => {
      const r = ic.getBoundingClientRect(), dx = (e.clientX - (r.left + r.width / 2)) / innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / innerHeight
      ic.style.transform = `rotateY(${(dx * 16).toFixed(2)}deg) rotateX(${(-dy * 16).toFixed(2)}deg)`
    })
  }, { passive: true })
})()
