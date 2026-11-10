// The films play by themselves in their tiles (Alex, 10 Nov 2026: "the work should play by itself").
// A tile that carries data-pv="yt:<id>" (or vm:<id>, pc:<code>) plays a silent piece of its film: on a computer while the
// pointer rests on it, on a phone or a tablet while it sits in the middle of the screen. One film at a time; the still
// stays until the film really plays, then the two cross-fade; a click opens the film with sound as before.
// Nothing plays for a visitor who asked for less motion or less data, with Motion off in Studio > Look, on a slow
// connection, in a hidden tab or while a window (the player) is open. data-pvs is the second to start from.
// YouTube and Vimeo tell the page when the film plays (their players' own messages); should YouTube stay silent the
// tile shows the player a moment after it loaded, as the opening video of the home page does.
(() => {
  const conn = navigator.connection || {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches
  const CROP = 1.3 // the players are drawn a little larger than the tile, so their own title and logo stay out of view
  const HOVER_WAIT = 220, CENTRE_WAIT = 450, GIVE_UP = 9000, PHONE_PLAYS = 14000
  const css = document.createElement('style')
  css.textContent = '.pv{position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .45s ease;background:#000}'
    + '.pv.on{opacity:1}'
    + '.pv iframe{position:absolute;left:50%;top:50%;border:0;transform-origin:50% 50%}'
    + '.pv video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}'
    + '.tile.pv-on .play{opacity:0!important;transform:scale(.85)!important}'
  document.head.appendChild(css)

  let live = null // the film playing now: { tile, box, frame, kind, timers... }
  const failed = new WeakSet() // tiles whose film would not play: left alone for the rest of the visit
  const quiet = () => document.hidden || document.body.style.overflow === 'hidden' || document.documentElement.dataset.motion === 'off'
  const say = (frame, msg) => { try { frame.contentWindow.postMessage(JSON.stringify(msg), '*') } catch (e) {} }

  function stop() {
    const l = live
    if (!l) return
    live = null
    l.timers.forEach(clearTimeout); clearInterval(l.knock)
    l.tile.classList.remove('pv-on'); l.box.classList.remove('on')
    setTimeout(() => l.box.remove(), l.shown ? 480 : 0)
  }
  function show(l) {
    if (live !== l || l.shown) return
    l.shown = true
    l.box.classList.add('on'); l.tile.classList.add('pv-on')
    if (!canHover) l.timers.push(setTimeout(() => { if (live === l) { rested = l.tile; stop() } }, PHONE_PLAYS))
  }
  function fail(l) { if (live === l) { failed.add(l.tile); stop() } }

  function start(tile) {
    if (live && live.tile === tile) return
    stop()
    if (quiet() || failed.has(tile) || !tile.isConnected) return
    const at = (tile.dataset.pv || '').indexOf(':'), kind = tile.dataset.pv.slice(0, at), id = tile.dataset.pv.slice(at + 1)
    if (at < 1 || !id) return
    const from = Math.max(0, Number(tile.dataset.pvs) || 0)
    const box = document.createElement('span'); box.className = 'pv'; box.setAttribute('aria-hidden', 'true')
    const l = live = { tile, box, kind, from, timers: [], shown: false, heard: false }
    l.timers.push(setTimeout(() => { if (!l.shown) fail(l) }, GIVE_UP))
    if (kind === 'pc') {
      // a film kept in pCloud: its own file, asked for without a Referer (pCloud refuses other sites')
      const v = document.createElement('video'), us = id.startsWith('us:')
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('muted', ''); v.disablePictureInPicture = true
      v.addEventListener('loadedmetadata', () => { if (v.duration > 20) v.currentTime = Math.min(from || v.duration * 0.25, v.duration - 10) }, { once: true })
      v.addEventListener('playing', () => l.timers.push(setTimeout(() => show(l), 120)), { once: true })
      v.addEventListener('error', () => fail(l))
      box.appendChild(v)
      fetch(`https://${us ? 'api' : 'eapi'}.pcloud.com/getpublinkdownload?code=${encodeURIComponent(us ? id.slice(3) : id)}`, { referrerPolicy: 'no-referrer' }).then((r) => r.json())
        .then((j) => { if (live !== l) return; if (j.result !== 0 || !j.hosts || !j.hosts.length) return fail(l); v.src = `https://${j.hosts[0]}${j.path}`; v.play().catch(() => fail(l)) })
        .catch(() => fail(l))
    } else if (kind === 'yt' || kind === 'vm') {
      // the film is 16:9 and covers the tile whatever the tile's shape; the player is laid out about 960 px wide and
      // scaled down to the tile, so its own writing is small and falls outside the edges
      const r = tile.getBoundingClientRect(), w = Math.max(r.width, r.height * 16 / 9), k = Math.min(3, Math.max(1, 960 / w))
      const f = l.frame = document.createElement('iframe')
      f.title = ''; f.tabIndex = -1; f.allow = 'autoplay; encrypted-media'; f.referrerPolicy = 'strict-origin-when-cross-origin'
      f.style.width = `${Math.round(w * k)}px`; f.style.height = `${Math.round(w * k * 9 / 16)}px`
      f.style.transform = `translate(-50%, -50%) scale(${(CROP / k).toFixed(4)})`
      const safe = encodeURIComponent(id)
      f.src = kind === 'yt'
        ? `https://www.youtube-nocookie.com/embed/${safe}?autoplay=1&mute=1&start=${Math.round(from)}&loop=1&playlist=${safe}&controls=0&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&fs=0&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`
        : `https://player.vimeo.com/video/${safe}?background=1&autoplay=1&muted=1&loop=1&dnt=1&api=1#t=${Math.round(from)}s`
      f.addEventListener('load', () => {
        if (live !== l) return
        // ask the player to tell us what it does, until it answers
        const knock = () => {
          if (kind === 'yt') {
            say(f, { event: 'listening', id: 1, channel: 'widget' })
            say(f, { event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 1, channel: 'widget' })
            say(f, { event: 'command', func: 'addEventListener', args: ['onError'], id: 1, channel: 'widget' })
          } else { say(f, { method: 'addEventListener', value: 'timeupdate' }); say(f, { method: 'addEventListener', value: 'error' }) }
        }
        knock(); let n = 0
        l.knock = setInterval(() => { if (l.heard || ++n > 10) clearInterval(l.knock); else knock() }, 300)
        // YouTube that says nothing at all: show it a moment after it loaded (the home page's opening video does the same)
        if (kind === 'yt') l.timers.push(setTimeout(() => { if (!l.heard) show(l) }, 2600))
      }, { once: true })
      box.appendChild(f)
    } else { live = null; return }
    tile.appendChild(box)
  }

  // what the players say: YouTube { event: 'infoDelivery' | 'onStateChange' | 'onError', info }, Vimeo { event: 'timeupdate', data: { seconds } }
  addEventListener('message', (e) => {
    const l = live
    if (!l || !l.frame || e.source !== l.frame.contentWindow) return
    let d = e.data
    if (typeof d === 'string') { try { d = JSON.parse(d) } catch (x) { return } }
    if (!d || typeof d !== 'object') return
    l.heard = true
    if (l.kind === 'vm') {
      if (d.event === 'error') fail(l)
      else if (d.event === 'timeupdate' && d.data && d.data.seconds > 0.3) show(l)
      return
    }
    if (d.event === 'onError') return fail(l)
    const info = d.info && typeof d.info === 'object' ? d.info : {}
    // a film shorter than where we meant to start: go a quarter of the way in instead
    if (info.duration > 0 && !l.sized) {
      l.sized = true
      if (l.from > info.duration - 8) { l.jump = true; say(l.frame, { event: 'command', func: 'seekTo', args: [Math.max(0, Math.round(info.duration * 0.25)), true], id: 1, channel: 'widget' }) }
    }
    const state = d.event === 'onStateChange' ? d.info : info.playerState
    if (state === 3 && l.jump) l.jump = false
    else if (state === 1 && !l.jump && !l.due) { l.due = true; l.timers.push(setTimeout(() => show(l), 260)) }
  })

  const tileOf = (el) => el && el.closest ? el.closest('[data-pv]') : null
  // a click opens the film itself: the piece steps aside
  document.addEventListener('click', (e) => { if (tileOf(e.target)) { clearTimeout(wait); stop() } }, true)
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop() })

  let wait = 0, rested = null
  if (canHover) {
    // a computer: the tile the pointer rests on
    let over = null
    document.addEventListener('mouseover', (e) => {
      const t = tileOf(e.target)
      if (t === over) return
      over = t; clearTimeout(wait)
      if (!t) return stop()
      wait = setTimeout(() => { if (over === t) start(t) }, HOVER_WAIT)
    })
    document.addEventListener('mouseleave', () => { over = null; clearTimeout(wait); stop() })
  } else {
    // a phone or a tablet: the tile in the middle of the screen, once the page has stopped moving for a moment
    let pick = null, queued = false
    const look = () => {
      queued = false
      const vh = innerHeight, mid = vh * 0.46
      let best = null, bestD = 1e9, row = []
      if (!quiet()) document.querySelectorAll('[data-pv]').forEach((t) => {
        const r = t.getBoundingClientRect()
        if (!r.width || r.bottom < 0 || r.top > vh) return
        const c = r.top + r.height / 2, d = Math.abs(c - mid)
        if (c < vh * 0.22 || c > vh * 0.72) return
        if (d < bestD - 4) { best = t; bestD = d; row = [t] } else if (Math.abs(d - bestD) <= 4) row.push(t)
      })
      // tiles side by side are as near the middle as each other: the rows take turns, left then right
      if (row.length > 1) best = row[Math.round(best.offsetTop / Math.max(1, best.offsetHeight)) % row.length]
      if (best === pick) return
      pick = best; clearTimeout(wait)
      if (best !== rested) rested = null
      if (live && live.tile !== best) stop()
      if (best && best !== rested) wait = setTimeout(() => { if (pick === best) start(best) }, CENTRE_WAIT)
    }
    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(look) } }
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask)
    setTimeout(ask, 1200)
  }
})()
