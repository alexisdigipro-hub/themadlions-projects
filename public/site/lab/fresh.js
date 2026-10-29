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

// The Lab's way around (Alex, 29 Oct: "from an app's page you can't get anywhere: put the other apps and the home page"):
// a round button in the top bar opens the menu: The Mad Lions, the Lab, and every app with its icon, this one marked.
;(() => {
  const SITE = /themadlions\.com$/.test(location.hostname) || location.hostname === 'roartransfer.com' ? 'https://themadlions.com/' : new URL('../'.repeat(location.pathname.includes('/lab/') ? 2 : 1), location.href).href
  const isEl = () => document.documentElement.lang === 'el' || /\/el\//.test(location.pathname)
  const APPS = [
    ['roarme', 'RoarMe', 'roarme/', 'The messenger for crews', 'Το chat για συνεργεία'],
    ['roardino', 'Roardino', 'lab/roardino/', 'The call sheet, in one link', 'Το ορντίνο, σε ένα link'],
    ['roarmail', 'RoarMail', 'lab/roarmail/', 'Every mailbox, one inbox', 'Όλα τα mail, ένα inbox'],
    ['roarlist', 'RoarList', 'lab/roarlist/', 'The shot list', 'Η λίστα πλάνων'],
    ['roartransfer', 'RoarTransfer', 'https://roartransfer.com/about/', 'Big files, one link', 'Μεγάλα αρχεία, ένα link'],
    ['roarwriter', 'RoarWriter', 'lab/roarwriter/', 'Screenwriting', 'Γράψιμο σεναρίου'],
    ['roarkit', 'RoarKit', 'lab/roarkit/', 'Sixteen tools', 'Δεκαέξι εργαλεία'],
    ['roarverter', 'Roarverter', 'lab/roarverter/', 'Convert and compress', 'Μετατροπή και συμπίεση'],
  ]
  const here = (APPS.find(([k]) => location.pathname.includes('/' + k + '/') || (k === 'roartransfer' && location.hostname === 'roartransfer.com')) || [])[0]
  const bar = document.querySelector('header.bar, .bar')
  if (!bar) return
  const href = (p) => (/^https?:/.test(p) ? p : SITE + p)
  const btn = document.createElement('button')
  btn.type = 'button'; btn.className = 'f-apps-btn'; btn.setAttribute('aria-label', isEl() ? 'Εφαρμογές' : 'Apps'); btn.setAttribute('aria-expanded', 'false')
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.6"/><rect x="14" y="4" width="6" height="6" rx="1.6"/><rect x="4" y="14" width="6" height="6" rx="1.6"/><rect x="14" y="14" width="6" height="6" rx="1.6"/></svg>'
  const menu = document.createElement('div')
  menu.className = 'f-apps'; menu.hidden = true
  const draw = () => { const el = isEl(); menu.innerHTML = `<div class="f-apps-top"><a href="${SITE}">${el ? 'Αρχική' : 'Home'} · The Mad Lions</a><a href="${SITE}lab/">The Lab</a></div>` +
    '<div class="f-apps-grid">' + APPS.map(([k, n, p, en, gr]) => `<a href="${href(p)}"${k === here ? ' class="on" aria-current="page"' : ''}><img src="${SITE}lab/icons/${k}.png" alt="" width="40" height="40" loading="lazy"><span><b>${n}</b><small>${el ? gr : en}</small></span></a>`).join('') + '</div>' }
  const end = bar.querySelector('.end') || bar
  end.insertBefore(btn, end.firstChild)
  document.body.appendChild(menu)
  const set = (open) => { if (open) draw(); menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.classList.toggle('on', open) }
  btn.addEventListener('click', (e) => { e.stopPropagation(); set(menu.hidden) })
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) set(false) })
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false) })
})()
