// RoarCast (Alex, 1 Nov 2026; RoarJingle for its first day, renamed 2 Nov): jingle player and show planner in the browser.
// Banks of 5 columns x 60 pads (300 a bank), up to 8 sounds at once, second touch (stop, fade, restart, pause, again),
// fade in/out, start modes (overlap, column, solo, crossfade), loops with in/out points (a tap plays the outro), trims,
// ducking, five column faders + master + mic + voice tracks, the microphone with talk-over, voice tracks recorded into
// the show, the show arranger (target length, items, segue), the played log (CSV), recording the whole show to a file,
// keys and MIDI. Everything is kept in this browser: state and sounds in IndexedDB; backup and restore as one file.

const COLS = 5, ROWS = 60
const COLORS = ['#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#40c8e0', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f', '#8e8e93']
const VT_COLOR = '#bf5af2', TALK_COLOR = '#40c8e0'
const TALK_KINDS = ['Presentation', 'Interview', 'News', 'Ad break', 'Call-in', 'Other']

const $ = (s, el = document) => el.querySelector(s)
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
function h(tag, a, ...kids) {
  const el = document.createElement(tag)
  if (a) for (const k in a) {
    const v = a[k]
    if (v == null || v === false) continue
    if (k === 'class') el.className = v
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v)
    else if (k === 'html') el.innerHTML = v
    else if (k === 'value') el.value = v
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const c of kids.flat(3)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)))
  return el
}
const P = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'
const ICONS = {
  play: '<path d="M7 5v14l11-7z"/>', pause: '<path d="M8 5v14M16 5v14"/>', skip: '<path d="M5 5l9 7-9 7zM18 5v14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  rec: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', fade: '<path d="M3 6c6 0 10 12 18 12"/><path d="M3 18h18" opacity=".4"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M14 4v16"/>', folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', sliders: '<path d="M6 4v16M12 4v16M18 4v16"/><rect x="4" y="13" width="4" height="3" rx="1"/><rect x="10" y="7" width="4" height="3" rx="1"/><rect x="16" y="11" width="4" height="3" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', square: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', key: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
}
const ic = n => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = `<g ${P}>${ICONS[n]}</g>`; return s }
const fmt = s => { if (!isFinite(s)) return '∞'; const neg = s < 0; s = Math.abs(s); const m = Math.floor(s / 60), x = Math.floor(s % 60); return (neg ? '-' : '') + m + ':' + String(x).padStart(2, '0') }
const fmtL = s => { const neg = s < 0; s = Math.abs(Math.round(s)); const hh = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (neg ? '-' : '') + (hh ? hh + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0') }
const fmt1 = s => (Math.round(s * 10) / 10).toFixed(1) + 's'
const clockOf = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200) }
function download(blob, name) { const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000) }
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}` }

/* ================= storage: IndexedDB (state + sound files) ================= */
let dbp
function db() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('roarjingle', 1) // the name it was born with (RoarJingle until 2 Nov), kept so nothing saved is lost
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('files') }
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
  })
}
async function idb(store, mode, fn) {
  const d = await db()
  return new Promise((res, rej) => { const tx = d.transaction(store, mode); const r = fn(tx.objectStore(store)); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error) })
}
const dbGet = (s, k) => idb(s, 'readonly', o => o.get(k))
const dbPut = (s, k, v) => idb(s, 'readwrite', o => o.put(v, k))
const dbDel = (s, k) => idb(s, 'readwrite', o => o.delete(k))
const dbKeys = s => idb(s, 'readonly', o => o.getAllKeys())

/* ================= state ================= */
const DEF_COLS = [['Jingles', '#ff453a'], ['Beds', '#0a84ff'], ['FX', '#ffd60a'], ['Voice', '#bf5af2'], ['Music', '#30d158']]
const newBank = name => ({ id: uid(), name, cols: DEF_COLS.map(([n, c]) => ({ name: n, color: c })), pads: {} })
const newPad = () => ({ id: uid(), name: '', color: '', file: null, dur: 0, vol: 1, second: S.set.second, fadeIn: 0, fadeOut: 0, mode: 'overlap',
  loop: false, loopIn: 0, loopOut: 0, trimIn: 0, trimOut: 0, duck: false, key: '', midi: null })
let S = {
  v: 1, banks: [newBankSafe('Bank 1')], bank: 0,
  show: { title: 'My show', target: 3600, items: [], cur: -1, started: 0, itemAt: 0, segue: true },
  log: [], mix: { faders: Array.from({ length: COLS }, () => ({ on: false, v: 1 })), master: 1, mic: 1, vt: 1 },
  set: { maxVoices: 8, duck: 0.25, duckTime: 0.4, xfade: 2, fadeAll: 3, second: 'stop', echo: true, monitor: false, talkDuck: true, midiGo: null },
}
function newBankSafe(name) { return { id: uid(), name, cols: DEF_COLS.map(([n, c]) => ({ name: n, color: c })), pads: {} } }
const bank = () => S.banks[S.bank]
let saveT
function save() { clearTimeout(saveT); saveT = setTimeout(() => dbPut('kv', 'state', S).catch(e => toast('Could not save: ' + e.message)), 300) }
function migrate(s) {
  const d = structuredClone(S)
  const out = { ...d, ...s, show: { ...d.show, ...(s.show || {}) }, mix: { ...d.mix, ...(s.mix || {}) }, set: { ...d.set, ...(s.set || {}) } }
  if (!Array.isArray(out.banks) || !out.banks.length) out.banks = [newBank('Bank 1')]
  out.bank = clamp(out.bank | 0, 0, out.banks.length - 1)
  while (out.mix.faders.length < COLS) out.mix.faders.push({ on: false, v: 1 })
  for (const b of out.banks) for (const k in b.pads) b.pads[k] = { ...newPadFrom(out.set), ...b.pads[k] }
  return out
}
function newPadFrom(set) { const p = newPad.call(null); p.second = set.second; return p }
function padAt(c, r, b = bank()) { return b.pads[c + ':' + r] }
function padById(id) {
  for (const b of S.banks) for (const k in b.pads) if (b.pads[k].id === id) { const [c, r] = k.split(':').map(Number); return { pad: b.pads[k], bank: b, c, r } }
  return null
}
const padColor = (p, b, c) => p.color || b.cols[c]?.color || '#8e8e93'

/* ================= audio engine ================= */
let ctx, master, masterAn, recDest, colGain = [], vtBus, micSrc, micG, micOut, micAn, micStream, vtDest
const voices = []
const bufs = new Map(), peaks = new Map()
function ensureCtx() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume(); return ctx }
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' })
  master = ctx.createGain(); masterAn = ctx.createAnalyser(); masterAn.fftSize = 1024
  recDest = ctx.createMediaStreamDestination()
  master.connect(masterAn); masterAn.connect(ctx.destination); master.connect(recDest)
  colGain = Array.from({ length: COLS }, () => { const g = ctx.createGain(); g.connect(master); return g })
  vtBus = ctx.createGain(); vtBus.connect(master)
  applyMix()
  return ctx
}
function applyMix() {
  if (!ctx) return
  const t = ctx.currentTime
  S.mix.faders.forEach((f, i) => colGain[i]?.gain.setTargetAtTime(f.on ? f.v : 1, t, 0.03))
  master.gain.setTargetAtTime(S.mix.master, t, 0.03)
  vtBus.gain.setTargetAtTime(S.mix.vt, t, 0.03)
  if (micG) micG.gain.setTargetAtTime(talking ? S.mix.mic : 0, t, 0.05)
}
async function getBuf(file) {
  if (bufs.has(file)) return bufs.get(file)
  const blob = await dbGet('files', file)
  if (!blob) throw new Error('The sound is missing')
  const ab = await blob.arrayBuffer()
  const buf = await new Promise((res, rej) => { const p = ensureCtx().decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej) })
  bufs.set(file, buf)
  return buf
}
function peaksOf(file, buf, n = 700) {
  if (peaks.has(file)) return peaks.get(file)
  const ch = buf.getChannelData(0), step = Math.max(1, Math.floor(ch.length / n)), out = new Float32Array(n)
  for (let i = 0; i < n; i++) { let m = 0; const s = i * step; for (let j = 0; j < step; j += 4) { const v = Math.abs(ch[s + j] || 0); if (v > m) m = v } out[i] = m }
  peaks.set(file, out); return out
}

const live = () => voices.filter(v => !v.ending)
function vPos(v) {
  if (v.paused) return v.pos
  let p = v.off + (ctx.currentTime - v.t0)
  if (v.loop && v.lout > v.lin && p > v.lout) p = v.lin + ((p - v.lin) % (v.lout - v.lin))
  return p
}
const vLeft = v => v.loop ? Infinity : v.end - vPos(v)
const isDucker = v => v.pad.duck || v.vt

function launch(v, off, fi) {
  const now = ctx.currentTime
  const src = ctx.createBufferSource(); src.buffer = v.buf
  if (v.loop) { src.loop = true; src.loopStart = v.lin; src.loopEnd = v.lout }
  src.connect(v.g)
  v.src = src; v.off = off; v.t0 = now; v.paused = false
  const g = v.g.gain
  g.cancelScheduledValues(now)
  if (fi > 0) { g.setValueAtTime(0, now); g.linearRampToValueAtTime(v.vol, now + fi) } else g.setValueAtTime(v.vol, now)
  src.start(now, off)
  if (!v.loop) scheduleEnd(v, now, off, fi)
  src.onended = () => { if (v.src === src && !v.paused) drop(v) }
}
function scheduleEnd(v, now, off, fi = 0) {
  const tEnd = now + Math.max(0.02, v.end - off)
  try { v.src.stop(tEnd) } catch (e) {}
  if (v.fo > 0) { const fs = Math.max(now + fi, tEnd - v.fo); v.g.gain.setValueAtTime(v.vol, fs); v.g.gain.linearRampToValueAtTime(0, tEnd) }
}
async function startPad(pad, opts = {}) {
  if (!pad?.file) return
  ensureCtx()
  let buf
  try { buf = await getBuf(pad.file) } catch (e) { toast(`${pad.name || 'Pad'}: ${e.message}`); return }
  const loc = opts.vt ? null : padById(pad.id)
  const col = opts.vt ? -1 : loc ? loc.c : 0
  const end = pad.trimOut > 0 ? Math.min(pad.trimOut, buf.duration) : buf.duration
  const loop = !!(pad.loop && pad.loopOut > pad.loopIn && pad.loopOut <= buf.duration)
  // start modes
  const others = live().filter(v => !v.vt || opts.vt)
  let fi = pad.fadeIn
  if (pad.mode === 'solo') others.forEach(v => fadeVoice(v, 0.15))
  else if (pad.mode === 'column') others.filter(v => v.col === col).forEach(v => fadeVoice(v, 0.15))
  else if (pad.mode === 'cross') { others.forEach(v => fadeVoice(v, S.set.xfade)); if (!fi) fi = S.set.xfade }
  // at most N at once: the oldest fades out
  const still = live()
  if (still.length >= S.set.maxVoices) still.slice(0, still.length - S.set.maxVoices + 1).forEach(v => fadeVoice(v, 0.3))
  const v = { id: uid(), pad, col, buf, end, vol: pad.vol ?? 1, fo: pad.fadeOut || 0, loop, lin: pad.loopIn, lout: pad.loopOut, vt: !!opts.vt,
    item: opts.item || null, started: Date.now(), color: opts.color || (loc ? padColor(pad, loc.bank, loc.c) : VT_COLOR) }
  v.g = ctx.createGain(); v.d = ctx.createGain()
  v.g.connect(v.d); v.d.connect(opts.vt ? vtBus : colGain[col] || master)
  v.d.gain.value = (!isDucker(v) && duckActive()) ? S.set.duck : 1
  launch(v, opts.off ?? (pad.trimIn || 0), fi)
  voices.push(v)
  v.logRow = logPlay(pad.name || 'Untitled', opts.vt ? 'Voice track' : (loc ? loc.bank.name + ' · ' + loc.bank.cols[loc.c].name : 'Jingle'))
  updateDuck(); paintPlaying()
  return v
}
function drop(v) {
  const i = voices.indexOf(v); if (i < 0) return
  voices.splice(i, 1)
  try { v.src.disconnect(); v.g.disconnect(); v.d.disconnect() } catch (e) {}
  if (v.logRow) { v.logRow.played = Math.round((Date.now() - v.started) / 1000); save(); if (tab === 'log') renderPanel() }
  updateDuck(); paintPlaying()
  // segue: a jingle or voice track of the show ended by itself, the next item follows
  if (v.item && !v.killed && S.show.segue && S.show.started && S.show.items[S.show.cur]?.id === v.item) setTimeout(() => showGo(), 30)
}
function fadeVoice(v, secs) {
  if (v.paused) { v.killed = true; drop(v); return }
  if (v.ending) return
  v.ending = true; v.killed = true
  const now = ctx.currentTime, g = v.g.gain
  const cur = g.value
  g.cancelScheduledValues(now); g.setValueAtTime(cur, now); g.linearRampToValueAtTime(0, now + secs)
  try { v.src.stop(now + secs + 0.03) } catch (e) {}
  updateDuck()
}
const stopVoice = v => fadeVoice(v, 0.03)
function pauseVoice(v) { if (v.paused || v.ending) return; v.pos = vPos(v); v.paused = true; try { v.src.stop() } catch (e) {} updateDuck(); paintPlaying() }
function resumeVoice(v) { if (!v.paused) return; ensureCtx(); launch(v, v.pos, 0.02); updateDuck(); paintPlaying() }
function releaseLoop(v) {
  const now = ctx.currentTime, p = vPos(v)
  v.loop = false; v.src.loop = false; v.off = p; v.t0 = now
  scheduleEnd(v, now, p)
}
function tapPad(pad) {
  ensureCtx()
  const mine = voices.filter(v => v.pad === pad && !v.ending)
  const v = mine[mine.length - 1]
  if (!v) return startPad(pad)
  if (v.paused) return resumeVoice(v)
  if (v.loop) { releaseLoop(v); toast('Loop released: the end plays out'); return }
  switch (pad.second) {
    case 'fade': return fadeVoice(v, pad.fadeOut || S.set.fadeAll)
    case 'restart': stopVoice(v); return startPad(pad)
    case 'pause': return pauseVoice(v)
    case 'again': return startPad(pad)
    default: return stopVoice(v)
  }
}
function duckActive() { return voices.some(v => isDucker(v) && !v.ending && !v.paused) || (talking && S.set.talkDuck) }
function updateDuck() {
  if (!ctx) return
  const on = duckActive(), now = ctx.currentTime
  for (const v of voices) if (!isDucker(v)) v.d.gain.setTargetAtTime(on ? S.set.duck : 1, now, S.set.duckTime / 3)
}
const fadeAll = (secs = S.set.fadeAll) => { [...voices].forEach(v => fadeVoice(v, secs)) }
const stopAll = () => { [...voices].forEach(v => stopVoice(v)) }
function pauseAll() {
  const playing = voices.filter(v => !v.paused && !v.ending)
  if (playing.length) playing.forEach(pauseVoice)
  else voices.filter(v => v.paused).forEach(resumeVoice)
}

/* ================= microphone, talk-over, recording ================= */
let talking = false, micErr = ''
async function micOn() {
  if (micStream) return true
  ensureCtx()
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: S.set.echo, noiseSuppression: S.set.echo, autoGainControl: false } })
  } catch (e) { micErr = e.message; toast('The microphone is not allowed: ' + (e.name === 'NotAllowedError' ? 'allow it in the browser' : e.message)); return false }
  micSrc = ctx.createMediaStreamSource(micStream)
  micG = ctx.createGain(); micG.gain.value = 0
  micOut = ctx.createGain(); micAn = ctx.createAnalyser(); micAn.fftSize = 1024
  vtDest = ctx.createMediaStreamDestination()
  micSrc.connect(micAn); micSrc.connect(vtDest); micSrc.connect(micG); micG.connect(micOut)
  micOut.connect(recDest)
  if (S.set.monitor) micOut.connect(ctx.destination)
  return true
}
function setMonitor() { if (!micOut) return; try { micOut.disconnect(ctx.destination) } catch (e) {} if (S.set.monitor) micOut.connect(ctx.destination) }
async function toggleTalk() {
  if (!talking && !(await micOn())) return
  talking = !talking
  applyMix(); updateDuck(); renderTop()
  if (talking) logPlay('Mic open', 'Talk')
}
function pickMime() {
  if (!window.MediaRecorder) return null
  for (const m of ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']) if (MediaRecorder.isTypeSupported?.(m)) return m
  return ''
}
const extOf = m => m.includes('mp4') ? 'm4a' : m.includes('ogg') ? 'ogg' : 'webm'
let rec = null
function toggleRec() {
  ensureCtx()
  if (rec) { rec.mr.stop(); return }
  const mime = pickMime()
  if (mime == null) return toast('This browser cannot record')
  const mr = new MediaRecorder(recDest.stream, mime ? { mimeType: mime, audioBitsPerSecond: 192000 } : undefined)
  const chunks = []
  mr.ondataavailable = e => e.data.size && chunks.push(e.data)
  mr.onstop = () => {
    const type = mr.mimeType || mime || 'audio/webm'
    const blob = new Blob(chunks, { type })
    download(blob, `${S.show.title || 'RoarCast'} ${stamp()}.${extOf(type)}`)
    rec = null; renderTop(); toast('Recording saved to your downloads')
  }
  mr.start(1000)
  rec = { mr, at: Date.now() }
  renderTop(); toast('Recording the show: everything you play and say')
}

/* voice tracks: the microphone alone, recorded into the show */
let vtRec = null
async function recordVoiceTrack(beforeIndex) {
  if (vtRec) { vtRec.mr.stop(); return }
  if (!(await micOn())) return
  const mime = pickMime()
  if (mime == null) return toast('This browser cannot record')
  const mr = new MediaRecorder(vtDest.stream, mime ? { mimeType: mime } : undefined)
  const chunks = []
  mr.ondataavailable = e => e.data.size && chunks.push(e.data)
  mr.onstop = async () => {
    const blob = new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' })
    vtRec = null
    const file = uid()
    await dbPut('files', file, blob)
    let dur = 0
    try { dur = (await getBuf(file)).duration } catch (e) {}
    const n = S.show.items.filter(i => i.kind === 'voice').length + 1
    const item = { id: uid(), kind: 'voice', title: 'Voice track ' + n, file, dur, note: '' }
    const at = beforeIndex == null ? S.show.items.length : beforeIndex
    S.show.items.splice(at, 0, item)
    save(); renderPanel(); toast('Voice track added to the show')
  }
  mr.start(500)
  vtRec = { mr, at: Date.now() }
  renderPanel()
}

/* ================= log ================= */
function logPlay(name, where) {
  const row = { t: Date.now(), name, where, played: null }
  S.log.push(row); if (S.log.length > 2000) S.log.splice(0, S.log.length - 2000)
  save(); if (tab === 'log') renderPanel()
  return row
}
function csv(rows) { return rows.map(r => r.map(x => { x = String(x ?? ''); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x }).join(',')).join('\n') }

/* ================= show ================= */
const itemDur = it => it.kind === 'pad' ? (padById(it.pad) ? padLen(padById(it.pad).pad) : 0) : it.dur || 0
const padLen = p => Math.max(0, (p.trimOut > 0 ? p.trimOut : p.dur) - (p.trimIn || 0))
const itemColor = it => it.kind === 'voice' ? VT_COLOR : it.kind === 'talk' ? TALK_COLOR : (() => { const l = padById(it.pad); return l ? padColor(l.pad, l.bank, l.c) : '#8e8e93' })()
const itemTitle = it => it.kind === 'pad' ? (padById(it.pad)?.pad.name || 'Missing jingle') : it.title
const itemSub = it => it.kind === 'pad' ? 'Jingle' + (it.note ? ' · ' + it.note : '') : it.kind === 'voice' ? 'Voice track' + (it.note ? ' · ' + it.note : '') : (it.type || 'Talk') + (it.note ? ' · ' + it.note : '')
const totalPlanned = () => S.show.items.reduce((a, it) => a + itemDur(it), 0)
async function fireItem(it) {
  if (!it) return
  if (it.kind === 'pad') { const l = padById(it.pad); if (l) await startPad(l.pad, { item: it.id }) }
  else if (it.kind === 'voice') await startPad({ id: 'vt:' + it.id, name: it.title, file: it.file, vol: 1, duck: true, fadeIn: 0, fadeOut: 0, mode: 'overlap', trimIn: 0, trimOut: 0 }, { vt: true, item: it.id, color: VT_COLOR })
  else logPlay(it.title, it.type || 'Talk')
}
function showGo() {
  ensureCtx()
  const sh = S.show
  if (!sh.items.length) { toast('Add items to the show first'); setTab('show'); return }
  // the item on air hands over: its sound fades out
  const cur = sh.items[sh.cur]
  if (cur) voices.filter(v => v.item === cur.id).forEach(v => fadeVoice(v, 0.8))
  if (!sh.started) { sh.started = Date.now(); sh.cur = -1 }
  sh.cur++
  if (sh.cur >= sh.items.length) { sh.cur = sh.items.length; toast('End of the show'); save(); renderPanel(); renderTop(); return }
  sh.itemAt = Date.now()
  fireItem(sh.items[sh.cur])
  save(); renderPanel(); renderTop()
}
function showSkip() {
  const sh = S.show
  if (!sh.items.length) return
  const cur = sh.items[sh.cur]
  if (cur) voices.filter(v => v.item === cur.id).forEach(v => fadeVoice(v, 0.5))
  if (!sh.started) { sh.started = Date.now(); sh.cur = -1 }
  sh.cur = Math.min(sh.items.length, sh.cur + 1)
  sh.itemAt = Date.now()
  toast(sh.items[sh.cur] ? 'On air now: ' + itemTitle(sh.items[sh.cur]) + ' (no sound started)' : 'End of the show')
  save(); renderPanel(); renderTop()
}
function showReset() { Object.assign(S.show, { cur: -1, started: 0, itemAt: 0 }); save(); renderPanel(); renderTop() }

/* ================= sound files in ================= */
async function addFile(f) {
  const id = uid()
  await dbPut('files', id, f)
  let dur = 0
  try { dur = (await getBuf(id)).duration } catch (e) { await dbDel('files', id); throw new Error(`${f.name}: this sound cannot be read here`) }
  return { id, dur }
}
const cleanName = n => n.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim()
async function assignFiles(files, c, r, b = bank()) {
  files = [...files].filter(f => /^audio\/|^video\/(mp4|webm|quicktime)/.test(f.type) || /\.(mp3|m4a|aac|wav|aiff?|ogg|oga|flac|webm|opus|caf)$/i.test(f.name))
  if (!files.length) return toast('Those are not sound files')
  let placed = 0
  for (const f of files) {
    // the first file goes where it was dropped, the rest fill the empty pads below it in the column, then the next columns
    let cc = c, rr = r
    if (placed > 0) { const spot = nextEmpty(b, c, r); if (!spot) break; [cc, rr] = spot }
    try {
      const { id, dur } = await addFile(f)
      const k = cc + ':' + rr
      const old = b.pads[k]
      const p = old ? { ...old } : newPad()
      if (old?.file && !fileUsed(old.file, old)) { dbDel('files', old.file); bufs.delete(old.file); peaks.delete(old.file) }
      Object.assign(p, { file: id, dur, name: old?.name && placed === 0 && old.file ? old.name : cleanName(f.name), trimIn: 0, trimOut: 0, loopIn: 0, loopOut: dur })
      b.pads[k] = p
      placed++
      r = rr; c = cc
    } catch (e) { toast(e.message) }
  }
  save(); renderBoard(); if (tab === 'pad') renderPanel()
  if (placed > 1) toast(placed + ' sounds placed')
}
function nextEmpty(b, c, r) {
  for (let cc = c; cc < COLS; cc++) for (let rr = cc === c ? r + 1 : 0; rr < ROWS; rr++) if (!b.pads[cc + ':' + rr]?.file) return [cc, rr]
  return null
}
function fileUsed(file, except) {
  for (const b of S.banks) for (const k in b.pads) if (b.pads[k] !== except && b.pads[k].file === file) return true
  return S.show.items.some(i => i.file === file)
}
let pickTarget = null
function pickFiles(c, r) { pickTarget = { c, r, b: bank() }; $('#filePick').value = ''; $('#filePick').click() }

/* demo sounds made on the first start, so the board is never empty */
function wav(buf) {
  const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate, dv = new DataView(new ArrayBuffer(44 + len * ch * 2))
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); dv.setUint32(4, 36 + len * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true)
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, len * ch * 2, true)
  const data = Array.from({ length: ch }, (_, i) => buf.getChannelData(i))
  let o = 44
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = clamp(data[c][i], -1, 1); dv.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2 }
  return new Blob([dv], { type: 'audio/wav' })
}
async function synth(dur, build) {
  const oc = new OfflineAudioContext(2, Math.ceil(44100 * dur), 44100)
  const out = oc.createDynamicsCompressor(); out.connect(oc.destination)
  const noise = () => { const b = oc.createBuffer(1, 44100 * dur, 44100), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = oc.createBufferSource(); s.buffer = b; return s }
  const tone = (f, t, len, type = 'sine', vol = 0.3, atk = 0.01) => {
    const o = oc.createOscillator(), g = oc.createGain(); o.type = type; o.frequency.value = f
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0008, t + len)
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.05)
  }
  build({ oc, out, noise, tone })
  return wav(await oc.startRendering())
}
const DEMOS = [
  ['Station ID', 0, 3.6, s => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { s.tone(f, i * 0.16, 1.6, 'triangle', 0.22); s.tone(f * 2, i * 0.16, 0.9, 'sine', 0.06) }); [261.63, 329.63, 392, 523.25].forEach(f => s.tone(f, 0.7, 2.8, 'sawtooth', 0.05, 0.05)); const n = s.noise(), g = s.oc.createGain(), bp = s.oc.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 6000; g.gain.setValueAtTime(0.25, 0.7); g.gain.exponentialRampToValueAtTime(0.001, 1.6); n.connect(bp); bp.connect(g); g.connect(s.out); n.start(0.7) }],
  ['Whoosh', 2, 1.8, s => { const n = s.noise(), f = s.oc.createBiquadFilter(), g = s.oc.createGain(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(250, 0); f.frequency.exponentialRampToValueAtTime(5000, 0.9); f.frequency.exponentialRampToValueAtTime(300, 1.7); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.9, 0.85); g.gain.linearRampToValueAtTime(0, 1.75); n.connect(f); f.connect(g); g.connect(s.out); n.start(0) }],
  ['Drum roll + hit', 2, 2.6, s => { let t = 0, gap = 0.09; while (t < 1.6) { const n = s.noise(), g = s.oc.createGain(), f = s.oc.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; g.gain.setValueAtTime(0.15 + t * 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); n.connect(f); f.connect(g); g.connect(s.out); n.start(t); n.stop(t + 0.1); t += gap; gap = Math.max(0.025, gap * 0.93) } s.tone(70, 1.65, 0.9, 'sine', 0.9, 0.005); const n = s.noise(), g = s.oc.createGain(); g.gain.setValueAtTime(0.5, 1.65); g.gain.exponentialRampToValueAtTime(0.001, 2.5); n.connect(g); g.connect(s.out); n.start(1.65) }],
  ['Ding', 2, 2, s => { s.tone(1318.5, 0, 1.9, 'sine', 0.35, 0.003); s.tone(1975.5, 0, 1.2, 'sine', 0.12, 0.003); s.tone(2637, 0, 0.6, 'sine', 0.05, 0.003) }],
  ['Time pips', 0, 6, s => { for (let i = 0; i < 5; i++) s.tone(1000, i, 0.12, 'sine', 0.35, 0.005); s.tone(1000, 5, 0.6, 'sine', 0.35, 0.005) }],
  ['Applause', 2, 4.5, s => { for (let i = 0; i < 520; i++) { const t = Math.random() * 4 * Math.random() ** 0.3, n = s.noise(), g = s.oc.createGain(), f = s.oc.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 2500; const env = t < 0.5 ? t / 0.5 : t > 3 ? Math.max(0, (4.2 - t) / 1.2) : 1; g.gain.setValueAtTime(0.25 * env, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03); n.connect(f); f.connect(g); g.connect(s.out); n.start(t); n.stop(t + 0.05) } }],
  ['Bed loop', 1, 10, s => { const ch = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]]; ch.forEach((c, i) => c.forEach(f => { const o = s.oc.createOscillator(), g = s.oc.createGain(); o.type = 'triangle'; o.frequency.value = f; const t = i * 2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.3); g.gain.setValueAtTime(0.07, t + 1.8); g.gain.linearRampToValueAtTime(0, t + (i === 3 ? 3.9 : 2.05)); o.connect(g); g.connect(s.out); o.start(t); o.stop(t + 4) })); for (let i = 0; i < 16; i++) s.tone(i % 4 === 0 ? 880 : 1320, i * 0.5, 0.25, 'sine', 0.04, 0.005); s.tone(110, 8, 1.9, 'sine', 0.3, 0.01) }],
  ['Sweeper', 0, 2.4, s => { const o = s.oc.createOscillator(), g = s.oc.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, 0); o.frequency.exponentialRampToValueAtTime(1760, 1.2); const f = s.oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(400, 0); f.frequency.exponentialRampToValueAtTime(8000, 1.2); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.25, 1); g.gain.exponentialRampToValueAtTime(0.001, 2.3); o.connect(f); f.connect(g); g.connect(s.out); o.start(0); o.stop(2.4); [523.25, 783.99, 1046.5].forEach(fq => s.tone(fq, 1.2, 1.1, 'triangle', 0.15)) }],
]
async function makeDemos() {
  const b = S.banks[0]
  const rows = [0, 0, 0, 0, 0]
  for (const [name, c, dur, build] of DEMOS) {
    try {
      const blob = await synth(dur, s => build(s))
      const id = uid(); await dbPut('files', id, blob)
      const p = newPad(); Object.assign(p, { name, file: id, dur, loopIn: 0, loopOut: dur })
      if (name === 'Bed loop') Object.assign(p, { loop: true, loopIn: 0, loopOut: 8, second: 'fade', fadeOut: 2, fadeIn: 0.5 })
      if (name === 'Applause') Object.assign(p, { second: 'fade', fadeOut: 1.5 })
      if (name === 'Time pips') Object.assign(p, { duck: true })
      b.pads[c + ':' + rows[c]++] = p
    } catch (e) { console.warn(e) }
  }
  save()
}

/* ================= UI ================= */
let edit = false, tab = 'show', selPad = null, panelOpen = false, learn = null
const padEls = new Map()

function placeLens(box) {
  let lens = box.querySelector(':scope > .lens'); if (!lens) { lens = h('i', { class: 'lens' }); box.prepend(lens) }
  const on = box.querySelector(':scope > .on')
  if (!on) { lens.style.width = '0'; return }
  lens.style.width = on.offsetWidth + 'px'; lens.style.transform = `translateX(${on.offsetLeft}px)`
  if (box.scrollWidth > box.clientWidth) on.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
}

function renderBanks() {
  const el = $('#banks'); el.textContent = ''
  S.banks.forEach((b, i) => {
    const n = Object.values(b.pads).filter(p => p.file).length
    el.append(h('button', { class: 'bank' + (i === S.bank ? ' on' : ''), title: edit ? 'Double-click to rename' : '', onclick: () => { S.bank = i; save(); renderBanks(); renderBoard() }, ondblclick: () => edit && bankWindow(i) }, b.name, h('span', { class: 'n' }, n)))
  })
  if (edit) el.append(h('button', { class: 'bank', title: 'New bank', onclick: () => { S.banks.push(newBank('Bank ' + (S.banks.length + 1))); S.bank = S.banks.length - 1; save(); renderBanks(); renderBoard() } }, '+ Bank'))
  requestAnimationFrame(() => placeLens(el))
}

function renderTop() {
  const sh = S.show, tr = $('#transport'); tr.textContent = ''
  const next = sh.items[sh.started ? sh.cur + 1 : 0]
  tr.append(
    h('button', { class: 'pill main lbl-txt', title: 'Play the next item of the show (Space)' + (next ? ': ' + itemTitle(next) : ''), onclick: showGo }, ic('play'), h('span', { class: 't' }, sh.started ? 'Next' : 'Start show')),
    h('button', { class: 'pill ib', title: 'Pause or resume everything playing (P)', onclick: pauseAll }, ic('pause')),
    h('button', { class: 'pill ib', title: 'Skip to the next item without playing it', onclick: showSkip }, ic('skip')),
    h('button', { class: 'pill lbl-txt', title: 'Fade out everything (Esc). Shift+Esc stops at once', onclick: () => fadeAll() }, ic('fade'), h('span', { class: 't' }, 'Fade all')),
    h('div', { class: 'clock lbl' }, h('small', null, sh.started ? 'On air' : 'Clock'), h('span', { id: 'clk' }, '')),
  )
  const tr2 = $('#topRight'); tr2.textContent = ''
  tr2.append(
    h('div', { class: 'meters', title: 'Master level' }, h('div', { class: 'meter' }, h('i', { id: 'mL' })), h('div', { class: 'meter' }, h('i', { id: 'mM' }))),
    h('button', { class: 'pill lbl-txt' + (talking ? ' live' : ''), title: 'Microphone on air (M)', onclick: toggleTalk }, ic('mic'), h('span', { class: 't' }, talking ? 'Mic on' : 'Mic')),
    h('button', { class: 'pill lbl-txt' + (rec ? ' live' : ''), title: 'Record the whole show to a file', onclick: toggleRec }, ic('rec'), h('span', { class: 't', id: 'recT' }, rec ? fmtL((Date.now() - rec.at) / 1000) : 'Rec')),
    h('button', { class: 'pill lbl-txt' + (edit ? ' on' : ''), title: 'Edit pads, columns and banks', onclick: () => { edit = !edit; document.body.classList.toggle('edit', edit); selPad = null; renderBanks(); renderBoard(); renderTop(); if (edit) setTab('pad'); else if (tab === 'pad') setTab('show') } }, ic('edit'), h('span', { class: 't' }, edit ? 'Done' : 'Edit')),
    h('button', { class: 'pill ib panel-btn', title: 'Mixer, show and log', onclick: () => openPanel(true) }, ic('panel')),
    h('button', { class: 'pill ib', title: 'Settings', onclick: settingsWindow }, ic('gear')),
  )
  const pb = tr2.querySelector('.panel-btn'); if (!matchMedia('(max-width: 820px)').matches) pb.style.display = 'none'
}

function renderBoard() {
  const b = bank(), el = $('#cols'); el.textContent = ''; padEls.clear()
  el.style.gridTemplateColumns = `repeat(${COLS}, minmax(0, 1fr))`
  b.cols.forEach((col, c) => {
    const f = S.mix.faders[c]
    el.append(h('div', { class: 'colhead' }, h('i', { class: 'dot', style: `background:${col.color}` }), h('span', { class: 'nm' }, col.name),
      edit ? [h('button', { title: 'Fill with sounds', onclick: () => pickFiles(c, firstEmpty(b, c)) }, ic('folder')), h('button', { title: 'Name and colour', onclick: () => colWindow(c) }, ic('edit'))]
        : [h('span', { class: 'fx' }, f.on ? Math.round(f.v * 100) + '%' : ''), h('button', { title: 'Fade this column', onclick: () => voices.filter(v => v.col === c).forEach(v => fadeVoice(v, S.set.fadeAll)) }, ic('fade'))]))
  })
  let last = 0
  for (const k in b.pads) if (b.pads[k].file) last = Math.max(last, +k.split(':')[1])
  const rows = Math.min(ROWS, Math.max(edit ? last + 6 : last + 2, 8))
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) el.append(padEl(b, c, r))
  if (rows < ROWS) el.append(h('div', { style: `grid-column:1/-1;text-align:center;padding:6px` }, h('button', { class: 'pill sm', onclick: () => { showAllRows = !showAllRows; renderBoardAll() } }, `Show all ${ROWS * COLS} pads`)))
  paintPlaying()
}
let showAllRows = false
function renderBoardAll() {
  const b = bank(), el = $('#cols')
  el.lastChild?.remove()
  const have = el.querySelectorAll('.pad').length / COLS
  for (let r = have; r < ROWS; r++) for (let c = 0; c < COLS; c++) el.append(padEl(b, c, r))
  paintPlaying()
}
const firstEmpty = (b, c) => { for (let r = 0; r < ROWS; r++) if (!b.pads[c + ':' + r]?.file) return r; return 0 }

function padEl(b, c, r) {
  const k = c + ':' + r, p = b.pads[k]
  const empty = !p?.file
  const el = h('div', { class: 'pad' + (empty ? ' empty' : '') + (selPad && p && selPad === p.id ? ' sel' : ''), draggable: edit && !empty ? 'true' : null })
  if (!empty) {
    el.style.setProperty('--c', padColor(p, b, c))
    el.append(h('div', { class: 'pn' }, p.name || 'Untitled'),
      h('div', { class: 'pf' }, p.loop ? h('span', { class: 'bd' }, 'LOOP') : null, p.duck ? h('span', { class: 'bd' }, 'DUCK') : null,
        p.mode !== 'overlap' ? h('span', { class: 'bd' }, { solo: 'SOLO', column: 'COL', cross: 'X' }[p.mode]) : null, h('span', { class: 't' }, fmt(padLen(p)))),
      h('i', { class: 'bar' }))
    if (p.key) el.append(h('span', { class: 'key' }, p.key.length > 1 ? p.key : p.key.toUpperCase()))
    padEls.set(p.id, el)
  } else el.append(h('div', { class: 'pn' }, edit ? '+ Add sound' : ''))
  // tap: play (or choose the sound of an empty pad); in Edit: select for the Pad tab
  // a mouse plays on press (no delay); a finger plays on lift unless it scrolled; a long press opens the pad's settings
  const openEditor = () => { selPad = p.id; if (!edit) { edit = true; document.body.classList.add('edit'); renderBanks(); renderTop() } renderBoard(); setTab('pad'); if (isPhone()) openPanel(true) }
  let down = null
  el.addEventListener('pointerdown', e => {
    if (e.button === 2 || edit || empty) return
    if (e.pointerType === 'mouse') { tapPad(p); return }
    down = { x: e.clientX, y: e.clientY, long: setTimeout(() => { down = null; openEditor() }, 650) }
  })
  el.addEventListener('pointermove', e => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) { clearTimeout(down.long); down = null } })
  el.addEventListener('pointercancel', () => { if (down) { clearTimeout(down.long); down = null } })
  el.addEventListener('pointerup', () => { if (down) { clearTimeout(down.long); down = null; tapPad(p) } })
  el.addEventListener('click', () => {
    if (edit) { if (empty) { pickFiles(c, r); return } selPad = p.id; renderBoard(); setTab('pad'); if (isPhone()) openPanel(true); return }
    if (empty) pickFiles(c, r)
  })
  el.addEventListener('contextmenu', e => { e.preventDefault(); if (!empty) openEditor() })
  // drag: a pad onto another swaps them (Edit); files from the computer land on the pad
  el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/rj-pad', k); e.dataTransfer.effectAllowed = 'move' })
  el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('drop'); document.body.classList.remove('dragging') })
  el.addEventListener('dragleave', () => el.classList.remove('drop'))
  el.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation(); el.classList.remove('drop'); document.body.classList.remove('dragging')
    const from = e.dataTransfer.getData('text/rj-pad')
    if (from && from !== k) { const a = b.pads[from], z = b.pads[k]; if (z) b.pads[from] = z; else delete b.pads[from]; b.pads[k] = a; save(); renderBoard(); return }
    if (e.dataTransfer.files.length) assignFiles(e.dataTransfer.files, c, r, b)
  })
  return el
}

function paintPlaying() {
  // pads
  for (const el of padEls.values()) el.classList.remove('play', 'paused', 'ending')
  const strip = $('#playing'); strip.textContent = ''
  if (!voices.length) strip.append(h('span', { class: 'none' }, 'Nothing playing. Tap a pad, press its key, or start the show.'))
  for (const v of voices) {
    const el = padEls.get(v.pad.id)
    if (el) { el.classList.add('play'); if (v.paused) el.classList.add('paused') }
    v.chip = h('div', { class: 'voice', style: `--c:${v.color}` }, h('span', { class: 'vn' }, v.pad.name || 'Untitled'), h('span', { class: 'vt' }, ''),
      h('button', { title: v.paused ? 'Resume' : 'Pause', onclick: () => v.paused ? resumeVoice(v) : pauseVoice(v) }, ic(v.paused ? 'play' : 'pause')),
      h('button', { title: 'Fade out', onclick: () => fadeVoice(v, v.fo || S.set.fadeAll) }, ic('fade')),
      h('button', { title: 'Stop', onclick: () => stopVoice(v) }, ic('x')), h('i', { class: 'vb' }))
    strip.append(v.chip)
  }
  if (voices.length > 1) strip.append(h('span', { class: 'sp' }), h('button', { class: 'pill sm danger', onclick: stopAll }, ic('stop'), 'Stop all'))
}

function tick() {
  requestAnimationFrame(tick)
  const clk = $('#clk')
  if (clk) clk.textContent = S.show.started ? fmtL((Date.now() - S.show.started) / 1000) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  if (rec) { const t = $('#recT'); if (t) t.textContent = fmtL((Date.now() - rec.at) / 1000) }
  if (ctx) {
    meter(masterAn, '#mM')
    const ml = $('#mL'); if (ml) { if (micAn && talking) meter(micAn, '#mL'); else ml.style.height = '0' }
    const seen = new Set()
    for (let i = voices.length - 1; i >= 0; i--) {
      const v = voices[i], pos = vPos(v), len = v.end - (v.pad.trimIn || 0), left = vLeft(v)
      const frac = v.loop ? (pos - v.lin) / Math.max(0.01, v.lout - v.lin) : clamp((pos - (v.pad.trimIn || 0)) / Math.max(0.01, len), 0, 1)
      if (v.chip) { v.chip.querySelector('.vt').textContent = v.loop ? 'loop' : fmt(-left); v.chip.querySelector('.vb').style.width = (frac * 100) + '%' }
      const el = padEls.get(v.pad.id)
      if (el && !seen.has(v.pad.id)) {
        seen.add(v.pad.id)
        el.querySelector('.bar').style.width = (frac * 100) + '%'
        el.querySelector('.t').textContent = v.loop ? 'LOOP' : fmt(-left)
        el.classList.toggle('ending', !v.loop && !v.paused && left < 5 && left > 0)
      }
    }
    for (const [id, el] of padEls) if (!seen.has(id)) { const b = el.querySelector('.bar'); if (b && b.style.width !== '0px' && b.style.width) { b.style.width = '0'; const l = padById(id); if (l) el.querySelector('.t').textContent = fmt(padLen(l.pad)) } }
  }
  if (tab === 'show') tickShow()
  if (tab === 'pad' && wavePh) wavePh()
}
const mbuf = new Float32Array(1024)
function meter(an, sel) {
  const el = $(sel); if (!el) return
  an.getFloatTimeDomainData(mbuf); let m = 0; for (let i = 0; i < mbuf.length; i++) { const a = Math.abs(mbuf[i]); if (a > m) m = a }
  const db = 20 * Math.log10(m || 1e-6), pc = clamp((db + 54) / 54, 0, 1)
  el.style.height = (pc * 100) + '%'
}

/* ---------- panel ---------- */
const TABS = [['show', 'Show'], ['mixer', 'Mixer'], ['log', 'Log'], ['pad', 'Pad']]
function setTab(t) { tab = t; renderTabs(); renderPanel() }
function renderTabs() {
  const el = $('#tabs'); el.textContent = ''
  for (const [k, n] of TABS) el.append(h('button', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => setTab(k) }, n))
  requestAnimationFrame(() => placeLens(el))
  let x = $('#panel > .panel-close'); if (!x) $('#panel').append(h('button', { class: 'pill ib panel-close', onclick: () => openPanel(false) }, ic('x')))
}
const isPhone = () => matchMedia('(max-width: 820px)').matches
function openPanel(on) { panelOpen = on; $('#panel').classList.toggle('open', on); if (on) requestAnimationFrame(() => placeLens($('#tabs'))) }
let wavePh = null
function renderPanel() {
  const el = $('#panelBody'); el.textContent = ''; wavePh = null
  if (tab === 'show') el.append(...showPanel())
  else if (tab === 'mixer') el.append(...mixerPanel())
  else if (tab === 'log') el.append(...logPanel())
  else el.append(...padPanel())
}
const sec = (title, ...kids) => h('div', { class: 'sec' }, title ? h('h4', null, title) : null, ...kids)
const box = (...kids) => h('div', { class: 'box' }, ...kids)
function slider(min, max, step, val, on, show = v => v) {
  const out = h('span', { class: 'val' }, show(val))
  const r = h('input', { type: 'range', min, max, step, value: val })
  const paint = () => r.style.setProperty('--p', ((r.value - min) / (max - min) * 100) + '%')
  paint()
  r.addEventListener('input', () => { paint(); out.textContent = show(+r.value); on(+r.value) })
  return [h('div', { class: 'grow' }, r), out]
}
const toggle = (on, set) => { const t = h('button', { class: 'toggle' + (on ? ' on' : ''), onclick: () => { on = !on; t.classList.toggle('on', on); set(on) } }); return t }
function seg(opts, cur, set) {
  const el = h('div', { class: 'seg' })
  for (const [k, n] of opts) el.append(h('button', { class: k === cur ? 'on' : '', onclick: e => { [...el.children].forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); set(k) } }, n))
  return el
}
const row = (label, ...kids) => h('div', { class: 'row' }, label != null ? h('label', null, label) : null, ...kids)

/* show panel */
let dragItem = null
function showPanel() {
  const sh = S.show, total = totalPlanned(), out = []
  out.push(sec(null, row(null, h('input', { class: 'field grow', value: sh.title, placeholder: 'Show title', oninput: e => { sh.title = e.target.value; save() } })),
    row('Length', h('input', { class: 'field', style: 'width:90px', inputmode: 'numeric', value: Math.round(sh.target / 60), oninput: e => { sh.target = Math.max(1, +e.target.value || 0) * 60; save(); renderSum() } }), h('span', { class: 'lbl', style: 'min-width:0' }, 'minutes'),
      h('span', { class: 'grow' }), h('span', { class: 'lbl', style: 'min-width:0' }, 'Segue'), toggle(sh.segue, v => { sh.segue = v; save() }))))
  // on air
  const cur = sh.items[sh.cur]
  if (sh.started) {
    out.push(h('div', { class: 'onair' }, h('div', { class: 'lab' }, cur ? 'On air · ' + itemSub(cur).split(' · ')[0] : 'Show ended'),
      h('b', null, cur ? itemTitle(cur) : sh.title), h('div', { class: 'big', id: 'oaT' }, '0:00'), h('div', { class: 'nx', id: 'oaN' }, ''),
      h('div', { class: 'wrap' }, h('button', { class: 'pill sm main', onclick: showGo }, ic('play'), 'Next'), h('button', { class: 'pill sm', onclick: showSkip }, ic('skip'), 'Skip'),
        h('button', { class: 'pill sm', onclick: () => { if (confirm('Reset the show? The plan stays, the clock starts again.')) showReset() } }, 'Reset'))))
  }
  const tl = h('div', { class: 'timeline', id: 'tl' })
  const span = Math.max(total, sh.target, 1)
  for (const it of sh.items) tl.append(h('i', { title: itemTitle(it), style: `width:${itemDur(it) / span * 100}%;background:${itemColor(it)}` }))
  tl.append(h('b', { class: 'end', style: `left:calc(${sh.target / span * 100}% - 1px)`, title: 'Target length' }))
  if (sh.started) tl.append(h('b', { class: 'now', id: 'tlNow' }))
  out.push(sec('Rundown', tl, h('div', { class: 'sum', id: 'sum' })))
  // items
  const list = h('div', { class: 'items' })
  let t = 0
  sh.items.forEach((it, i) => {
    const d = itemDur(it)
    const el = h('div', { class: 'item' + (i === sh.cur && sh.started ? ' cur' : '') + (sh.started && i < sh.cur ? ' done' : ''), style: `--c:${itemColor(it)}`, draggable: 'true',
      onclick: e => { if (e.target.closest('.acts')) return; itemWindow(it) } },
      h('span', { class: 'st' }, sh.started ? clockOf(sh.started + t * 1000).slice(0, 5) : fmtL(t)),
      h('div', { class: 'in' }, h('b', null, h('i'), itemTitle(it)), h('span', null, itemSub(it))),
      h('div', { class: 'row', style: 'gap:2px' }, h('span', { class: 'du' }, fmt(d)), h('div', { class: 'acts' },
        h('button', { title: 'Play this now', onclick: () => { sh.started ||= Date.now(); const c0 = sh.items[sh.cur]; if (c0) voices.filter(v => v.item === c0.id).forEach(v => fadeVoice(v, 0.8)); sh.cur = i; sh.itemAt = Date.now(); fireItem(it); save(); renderPanel(); renderTop() } }, ic('play')),
        h('button', { title: 'Up', onclick: () => moveItem(i, i - 1) }, ic('up')), h('button', { title: 'Down', onclick: () => moveItem(i, i + 1) }, ic('down')))))
    el.addEventListener('dragstart', () => { dragItem = i; el.classList.add('dragging') })
    el.addEventListener('dragend', () => el.classList.remove('dragging'))
    el.addEventListener('dragover', e => { if (dragItem == null) return; e.preventDefault(); el.classList.add('over-drop') })
    el.addEventListener('dragleave', () => el.classList.remove('over-drop'))
    el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('over-drop'); if (dragItem != null) moveItem(dragItem, i); dragItem = null })
    list.append(el); t += d
  })
  if (!sh.items.length) list.append(h('div', { class: 'hint' }, 'Plan the show here: talk segments with their planned time, jingles from your pads and voice tracks you record. Start show plays them in order; Next (Space) moves on. With Segue on, when a jingle or voice track ends the next item starts by itself.'))
  out.push(list)
  out.push(h('div', { class: 'wrap' },
    h('button', { class: 'pill sm', onclick: () => itemWindow(null, 'talk') }, ic('plus'), 'Talk'),
    h('button', { class: 'pill sm', onclick: () => jinglePicker() }, ic('music'), 'Jingle'),
    h('button', { class: 'pill sm' + (vtRec ? ' live' : ''), onclick: () => recordVoiceTrack() }, ic('mic'), vtRec ? h('span', { id: 'vtT' }, 'Stop 0:00') : 'Voice track')))
  if (vtRec) out.push(h('div', { class: 'hint' }, 'Recording your voice track. Press Stop when you are done; it goes to the end of the show.'))
  out.push(h('div', { class: 'wrap' },
    h('button', { class: 'pill sm', onclick: exportRundown }, ic('download'), 'Rundown'),
    h('button', { class: 'pill sm', onclick: exportRundownCsv }, ic('download'), 'CSV'),
    sh.items.length ? h('button', { class: 'pill sm danger', onclick: () => { if (confirm('Clear the whole show plan?')) { sh.items = []; showReset() } } }, ic('trash'), 'Clear') : null))
  requestAnimationFrame(renderSum)
  return out
}
function renderSum() {
  const el = $('#sum'); if (!el) return
  const total = totalPlanned(), diff = total - S.show.target
  el.textContent = ''
  el.append(h('span', null, 'Planned ', h('b', null, fmtL(total)), ' of ', fmtL(S.show.target)),
    h('span', { class: diff > 0 ? 'over' : 'under' }, diff > 0 ? fmtL(diff) + ' over' : fmtL(-diff) + ' left'))
}
function tickShow() {
  const sh = S.show; if (!sh.started) return
  if (vtRec) { const t = $('#vtT'); if (t) t.textContent = 'Stop ' + fmt((Date.now() - vtRec.at) / 1000) }
  const it = sh.items[sh.cur], el = $('#oaT'), nx = $('#oaN')
  const el2 = (Date.now() - sh.itemAt) / 1000
  if (el) {
    if (it) { const d = itemDur(it), left = d - el2; el.textContent = d ? fmt(left) : fmt(el2); el.style.color = d && left < 0 ? 'var(--acc-2)' : d && left < 10 ? 'var(--warn)' : '' }
    else el.textContent = fmtL((Date.now() - sh.started) / 1000)
  }
  if (nx) {
    // when the show ends if every item from now on runs as planned
    const done = (Date.now() - sh.started) / 1000
    const curLeft = it ? Math.max(0, itemDur(it) - el2) : 0
    const rest = sh.items.slice(sh.cur + 1).reduce((a, x) => a + itemDur(x), 0)
    const endAt = done + curLeft + rest, diff = endAt - sh.target
    const n = sh.items[sh.cur + 1]
    nx.textContent = (n ? 'Next: ' + itemTitle(n) + ' · ' : '') + 'Ends ' + clockOf(sh.started + endAt * 1000).slice(0, 5) + ' · ' + (diff > 0 ? fmtL(diff) + ' over' : fmtL(-diff) + ' under')
  }
  const now = $('#tlNow')
  if (now) { const span = Math.max(totalPlanned(), sh.target, 1); now.style.left = clamp((Date.now() - sh.started) / 1000 / span * 100, 0, 100) + '%' }
}
function moveItem(a, b) {
  const it = S.show.items; if (b < 0 || b >= it.length || a === b) return
  const curId = it[S.show.cur]?.id
  const [x] = it.splice(a, 1); it.splice(b, 0, x)
  if (curId) S.show.cur = it.findIndex(i => i.id === curId)
  save(); renderPanel()
}
function exportRundown() {
  const sh = S.show; let t = 0
  const lines = [sh.title, 'Planned ' + fmtL(totalPlanned()) + ' of ' + fmtL(sh.target), '']
  sh.items.forEach((it, i) => { lines.push(`${String(i + 1).padStart(2, ' ')}. ${fmtL(t).padStart(7, ' ')}  ${fmt(itemDur(it)).padStart(6, ' ')}  ${itemTitle(it)}  (${itemSub(it)})`); t += itemDur(it) })
  download(new Blob([lines.join('\n') + '\n'], { type: 'text/plain' }), `${sh.title || 'Show'} rundown.txt`)
}
function exportRundownCsv() {
  let t = 0
  const rows = [['#', 'Start', 'Duration', 'Title', 'Kind', 'Note']]
  S.show.items.forEach((it, i) => { rows.push([i + 1, fmtL(t), fmt(itemDur(it)), itemTitle(it), it.kind === 'talk' ? it.type || 'Talk' : it.kind === 'voice' ? 'Voice track' : 'Jingle', it.note || '']); t += itemDur(it) })
  download(new Blob([csv(rows)], { type: 'text/csv' }), `${S.show.title || 'Show'} rundown.csv`)
}

/* mixer panel */
function mixerPanel() {
  const out = []
  const strip = (name, color, on, v, set, setOn, extra) => h('div', { class: 'fader' + (on === false ? ' off' : '') },
    h('div', { class: 'fn', title: name }, color ? h('i', { style: `background:${color}` }) : null, name),
    h('div', { class: 'slot' }, (() => { const r = h('input', { type: 'range', min: 0, max: 1.5, step: 0.01, value: v }); const paint = () => r.style.setProperty('--p', (r.value / 1.5 * 100) + '%'); paint(); r.addEventListener('input', () => { paint(); r.closest('.fader').querySelector('.fv').textContent = Math.round(r.value * 100) + '%'; set(+r.value) }); return r })()),
    h('div', { class: 'fv' }, Math.round(v * 100) + '%'),
    setOn ? h('button', { class: on ? 'on' : '', onclick: e => { setOn(!on); renderPanel() } }, on ? 'Active' : 'Off') : null, extra)
  const b = bank()
  const grid = h('div', { class: 'faders' })
  S.mix.faders.forEach((f, i) => grid.append(strip(b.cols[i].name, b.cols[i].color, f.on, f.v, v => { f.v = v; if (!f.on) { f.on = true; renderBoard() } applyMix(); save() }, on => { f.on = on; applyMix(); save(); renderBoard() },
    h('button', { title: 'Fade this column out', onclick: () => voices.filter(v => v.col === i).forEach(v => fadeVoice(v, S.set.fadeAll)) }, 'Fade'))))
  grid.append(strip('Voice tr.', VT_COLOR, null, S.mix.vt, v => { S.mix.vt = v; applyMix(); save() }))
  grid.append(strip('Mic', '#fff', null, S.mix.mic, v => { S.mix.mic = v; applyMix(); save() }))
  grid.append(strip('Master', 'var(--acc-2)', null, S.mix.master, v => { S.mix.master = v; applyMix(); save() }))
  out.push(sec('Faders', grid, h('div', { class: 'hint' }, 'A column fader is off until you move it or press Off: then it rides that column like a desk fader, for manual fades and volume drops. Fade fades everything playing in that column.')))
  out.push(sec('Ducking', box(
    row('Duck to', ...slider(0, 0.9, 0.01, S.set.duck, v => { S.set.duck = v; save(); updateDuck() }, v => Math.round(v * 100) + '%')),
    row('Speed', ...slider(0.1, 2, 0.05, S.set.duckTime, v => { S.set.duckTime = v; save() }, fmt1)),
    row('Mic ducks', toggle(S.set.talkDuck, v => { S.set.talkDuck = v; save(); updateDuck() }), h('span', { class: 'hint' }, 'Opening the mic lowers the music')),
    h('div', { class: 'hint' }, 'A pad set to Duck (a shout, an effect, a voice-over), a voice track and the open mic lower everything else to this level, and bring it back when they end.'))))
  out.push(sec('Microphone', box(
    row('Mic', h('button', { class: 'pill sm' + (talking ? ' live' : ''), onclick: () => { toggleTalk().then(() => renderPanel()) } }, ic('mic'), talking ? 'On air' : 'Open the mic')),
    row('Hear myself', toggle(S.set.monitor, v => { S.set.monitor = v; save(); setMonitor() }), h('span', { class: 'hint' }, 'Only with headphones')),
    row('Clean voice', toggle(S.set.echo, v => { S.set.echo = v; save(); toast('Applies the next time the page opens the mic') }), h('span', { class: 'hint' }, 'Echo and noise reduction')))))
  return out
}

/* log panel */
function logPanel() {
  const out = [], rows = [...S.log].reverse()
  out.push(h('div', { class: 'wrap' }, h('button', { class: 'pill sm', onclick: exportLog }, ic('download'), 'Export CSV'),
    rows.length ? h('button', { class: 'pill sm danger', onclick: () => { if (confirm('Clear the log?')) { S.log = []; save(); renderPanel() } } }, ic('trash'), 'Clear') : null))
  const l = h('div', { class: 'log' })
  for (const r of rows.slice(0, 400)) l.append(h('div', null, h('span', null, clockOf(r.t)), h('b', { title: r.where }, r.name), h('span', null, r.played != null ? fmt(r.played) : '')))
  if (!rows.length) l.append(h('span', { class: 'hint' }, 'Everything played is listed here with its time, for the show notes and the music report.'))
  out.push(sec('Played', l))
  return out
}
function exportLog() {
  const rows = [['Date', 'Time', 'Title', 'Where', 'Played (s)']]
  for (const r of S.log) { const d = new Date(r.t); rows.push([d.toLocaleDateString(), clockOf(r.t), r.name, r.where, r.played ?? '']) }
  download(new Blob([csv(rows)], { type: 'text/csv' }), `RoarCast log ${stamp()}.csv`)
}

/* pad panel */
function padPanel() {
  const l = selPad && padById(selPad)
  if (!l) return [h('div', { class: 'hint', style: 'padding:8px' }, edit ? 'Tap a pad to change it. Tap an empty pad to add a sound, or drop sound files on the board. Drag a pad onto another to swap them.' : 'Press Edit, then tap a pad to change its name, colour, fades, loop and more. A right-click (or long press) on a pad opens it here too.')]
  const { pad: p, bank: b, c } = l
  const ch = () => { save(); const el = padEls.get(p.id); if (el) { const ne = padEl(b, c, +Object.keys(b.pads).find(k => b.pads[k] === p).split(':')[1]); el.replaceWith(ne); paintPlaying() } }
  const out = []
  out.push(sec(null, row(null, h('input', { class: 'field grow', value: p.name, placeholder: 'Name', oninput: e => { p.name = e.target.value; ch() } }),
    h('button', { class: 'pill ib', title: 'Play', onclick: () => tapPad(p) }, ic('play')))))
  out.push(sec('Colour', h('div', { class: 'swatches' }, h('button', { class: 'sw' + (!p.color ? ' on' : ''), title: 'The column colour', style: `background:conic-gradient(${b.cols[c].color} 0 50%, transparent 0)`, onclick: e => { p.color = ''; ch(); renderPanel() } }),
    COLORS.map(col => h('button', { class: 'sw' + (p.color === col ? ' on' : ''), style: `background:${col}`, onclick: () => { p.color = col; ch(); renderPanel() } })))))
  // waveform with in/out and loop points
  const wave = h('div', { class: 'wave' }), cv = h('canvas')
  wave.append(cv)
  out.push(sec('Sound', wave, h('div', { class: 'row' }, h('span', { class: 'hint grow' }, `${fmt(p.dur)} in all · plays ${fmt(padLen(p))}`), h('button', { class: 'pill sm', onclick: () => { const k = Object.keys(b.pads).find(k => b.pads[k] === p).split(':'); pickFiles(+k[0], +k[1]) } }, ic('folder'), 'Replace')),
    h('div', { class: 'hint' }, 'Drag the green In and Out to trim. With Loop on, the yellow marks are the loop: it repeats until you tap again, then the end plays out.')))
  getBuf(p.file).then(buf => drawWave(wave, cv, p, buf, ch)).catch(e => wave.append(h('div', { class: 'hint', style: 'padding:10px' }, e.message)))
  out.push(sec('Level and fades', box(
    row('Volume', ...slider(0, 1.5, 0.01, p.vol, v => { p.vol = v; voices.filter(x => x.pad === p && !x.ending).forEach(x => x.g.gain.setTargetAtTime(v, ctx.currentTime, 0.03)); x2(); save() }, v => Math.round(v * 100) + '%')),
    row('Fade in', ...slider(0, 10, 0.1, p.fadeIn, v => { p.fadeIn = v; save() }, fmt1)),
    row('Fade out', ...slider(0, 10, 0.1, p.fadeOut, v => { p.fadeOut = v; save() }, fmt1)),
    h('div', { class: 'hint' }, 'Fade out is used at the end of the sound and when a second touch fades it.'))))
  function x2() { voices.filter(x => x.pad === p).forEach(x => x.vol = p.vol) }
  out.push(sec('Start', box(seg([['overlap', 'Overlap'], ['column', 'Column'], ['solo', 'Solo'], ['cross', 'Crossfade']], p.mode, v => { p.mode = v; ch() }),
    h('div', { class: 'hint' }, 'Overlap plays with the others. Column stops the others in its column. Solo stops everything else. Crossfade fades the others out while this one fades in.'))))
  out.push(sec('Second touch', box(seg([['stop', 'Stop'], ['fade', 'Fade'], ['restart', 'Restart'], ['pause', 'Pause'], ['again', 'Again']], p.second, v => { p.second = v; save() }),
    h('div', { class: 'hint' }, 'What a tap does while it plays. Again plays it once more on top.'))))
  out.push(sec('Loop and ducking', box(
    row('Loop', toggle(p.loop, v => { p.loop = v; if (v && !(p.loopOut > p.loopIn)) { p.loopIn = p.trimIn || 0; p.loopOut = p.trimOut || p.dur } ch(); renderPanel() }), h('span', { class: 'hint' }, 'Repeats the yellow part')),
    row('Duck', toggle(p.duck, v => { p.duck = v; ch() }), h('span', { class: 'hint' }, 'Lowers the others while it plays')))))
  out.push(sec('Trigger', box(
    row('Key', h('button', { class: 'pill sm' + (learn?.kind === 'key' ? ' on' : ''), onclick: () => { learn = { kind: 'key', pad: p }; renderPanel(); toast('Press a key for this pad (Backspace clears)') } }, ic('key'), learn?.kind === 'key' ? 'Press a key…' : p.key ? 'Key ' + (p.key.length > 1 ? p.key : p.key.toUpperCase()) : 'Set a key')),
    row('MIDI', h('button', { class: 'pill sm' + (learn?.kind === 'midi' ? ' on' : ''), onclick: () => midiLearn(p) }, ic('sliders'), learn?.kind === 'midi' ? 'Play a note…' : p.midi != null ? 'Note ' + p.midi : 'Learn'),
      p.midi != null ? h('button', { class: 'pill sm', onclick: () => { p.midi = null; save(); renderPanel() } }, 'Clear') : null))))
  out.push(h('div', { class: 'wrap' },
    h('button', { class: 'pill sm', onclick: () => { S.show.items.push({ id: uid(), kind: 'pad', pad: p.id, note: '' }); save(); toast('Added to the show') } }, ic('list'), 'Add to show'),
    h('button', { class: 'pill sm', onclick: () => duplicatePad(l) }, ic('plus'), 'Duplicate'),
    h('button', { class: 'pill sm danger', onclick: () => clearPad(l) }, ic('trash'), 'Clear pad')))
  return out
}
function duplicatePad({ pad, bank: b, c }) {
  const k = Object.keys(b.pads).find(k => b.pads[k] === pad), r = +k.split(':')[1]
  const spot = nextEmpty(b, c, r); if (!spot) return toast('No empty pad left in this bank')
  const np = { ...structuredClone(pad), id: uid(), key: '', midi: null, name: pad.name + ' 2' }
  b.pads[spot.join(':')] = np; selPad = np.id; save(); renderBoard(); renderPanel()
}
function clearPad({ pad, bank: b }) {
  if (!confirm(`Clear "${pad.name || 'Untitled'}"?`)) return
  voices.filter(v => v.pad === pad).forEach(stopVoice)
  const k = Object.keys(b.pads).find(k => b.pads[k] === pad)
  delete b.pads[k]
  if (pad.file && !fileUsed(pad.file)) { dbDel('files', pad.file); bufs.delete(pad.file); peaks.delete(pad.file) }
  S.show.items = S.show.items.filter(i => i.pad !== pad.id)
  selPad = null; save(); renderBoard(); renderPanel(); renderBanks()
}
function drawWave(wave, cv, p, buf, ch) {
  const pk = peaksOf(p.file, buf), dur = buf.duration
  if (!p.dur) p.dur = dur
  const draw = () => {
    const w = wave.clientWidth, hh = wave.clientHeight, dpr = devicePixelRatio || 1
    cv.width = w * dpr; cv.height = hh * dpr
    const g = cv.getContext('2d'); g.scale(dpr, dpr)
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#fff'
    g.globalAlpha = 0.75
    const n = pk.length
    for (let x = 0; x < w; x++) { const v = pk[Math.floor(x / w * n)] || 0, y = Math.max(1, v * hh * 0.9); g.fillRect(x, (hh - y) / 2, 1, y) }
  }
  draw()
  const shadeL = h('div', { class: 'shade', style: 'left:0' }), shadeR = h('div', { class: 'shade', style: 'right:0' }), ph = h('div', { class: 'ph', style: 'display:none' })
  wave.append(shadeL, shadeR, ph)
  const marks = [['trimIn', 'IN', '#30d158', 't'], ['trimOut', 'OUT', '#30d158', 't']]
  if (p.loop) marks.push(['loopIn', 'LOOP', '#ffd60a', 'b'], ['loopOut', 'LOOP', '#ffd60a', 'b'])
  const els = {}
  const val = k => k === 'trimOut' ? (p.trimOut > 0 ? p.trimOut : dur) : k === 'loopOut' ? (p.loopOut > 0 ? p.loopOut : dur) : p[k] || 0
  const place = () => {
    for (const [k] of marks) els[k].style.left = (val(k) / dur * 100) + '%'
    shadeL.style.width = (val('trimIn') / dur * 100) + '%'; shadeR.style.width = (100 - val('trimOut') / dur * 100) + '%'
  }
  for (const [k, label, color, pos] of marks) {
    const m = h('div', { class: 'mk ' + pos, style: `--m:${color}` }, h('span', null, label)); els[k] = m; wave.append(m)
    m.addEventListener('pointerdown', e => {
      e.preventDefault(); m.setPointerCapture(e.pointerId)
      const move = ev => {
        const r = wave.getBoundingClientRect(); let t = clamp((ev.clientX - r.left) / r.width * dur, 0, dur)
        if (k === 'trimIn') t = Math.min(t, val('trimOut') - 0.05)
        if (k === 'trimOut') t = Math.max(t, val('trimIn') + 0.05)
        if (k === 'loopIn') t = Math.min(t, val('loopOut') - 0.05)
        if (k === 'loopOut') t = Math.max(t, val('loopIn') + 0.05)
        p[k] = Math.round(t * 1000) / 1000; place()
      }
      const up = () => { m.removeEventListener('pointermove', move); m.removeEventListener('pointerup', up); ch(); const hint = wave.parentNode.querySelector('.hint'); if (hint) hint.textContent = `${fmt(p.dur)} in all · plays ${fmt(padLen(p))}` }
      m.addEventListener('pointermove', move); m.addEventListener('pointerup', up)
    })
  }
  place()
  wavePh = () => { const v = voices.find(v => v.pad === p); if (!v) { ph.style.display = 'none'; return } ph.style.display = ''; ph.style.left = (vPos(v) / dur * 100) + '%' }
}

/* ---------- windows ---------- */
function modal(title, body, actions = []) {
  const ov = $('#overlay'); ov.textContent = ''
  const close = () => { ov.classList.remove('on'); ov.textContent = '' }
  const card = h('div', { class: 'sheet-card', role: 'dialog' }, h('h3', null, title, h('button', { class: 'pill ib sm x', onclick: close }, ic('x'))), body, actions.length ? h('div', { class: 'acts' }, actions) : null)
  ov.append(card); ov.classList.add('on')
  ov.onclick = e => { if (e.target === ov) close() }
  setTimeout(() => card.querySelector('input')?.focus(), 50)
  return close
}
function bankWindow(i) {
  const b = S.banks[i]
  const name = h('input', { class: 'field', value: b.name })
  const close = modal('Bank', h('div', { class: 'sec' }, name, h('div', { class: 'hint' }, 'A bank is a page of 300 pads: one for each show, guest or mood.')), [
    S.banks.length > 1 ? h('button', { class: 'pill danger', onclick: () => { if (!confirm(`Delete the bank "${b.name}" and its pads?`)) return; S.banks.splice(i, 1); S.bank = clamp(S.bank, 0, S.banks.length - 1); save(); close(); renderBanks(); renderBoard() } }, ic('trash'), 'Delete') : null,
    i > 0 ? h('button', { class: 'pill', onclick: () => { [S.banks[i - 1], S.banks[i]] = [S.banks[i], S.banks[i - 1]]; S.bank = i - 1; save(); close(); renderBanks(); renderBoard() } }, 'Move left') : null,
    h('button', { class: 'pill', onclick: () => { const nb = structuredClone(b); nb.id = uid(); nb.name = b.name + ' copy'; for (const k in nb.pads) { nb.pads[k].id = uid(); nb.pads[k].key = ''; nb.pads[k].midi = null } S.banks.splice(i + 1, 0, nb); S.bank = i + 1; save(); close(); renderBanks(); renderBoard() } }, 'Duplicate'),
    h('button', { class: 'pill main', onclick: () => { b.name = name.value.trim() || b.name; save(); close(); renderBanks() } }, 'Save')])
  name.addEventListener('keydown', e => e.key === 'Enter' && document.querySelector('.sheet-card .main').click())
}
function colWindow(c) {
  const col = bank().cols[c]
  const name = h('input', { class: 'field', value: col.name })
  let color = col.color
  const sw = h('div', { class: 'swatches' }, COLORS.map(x => h('button', { class: 'sw' + (x === color ? ' on' : ''), style: `background:${x}`, onclick: e => { color = x; sw.querySelectorAll('.sw').forEach(s => s.classList.remove('on')); e.currentTarget.classList.add('on') } })))
  const close = modal('Column', h('div', { class: 'sec' }, name, sw, h('div', { class: 'hint' }, 'Pads without their own colour take the column colour. Column fader ' + (c + 1) + ' in the Mixer rides this column.')), [
    h('button', { class: 'pill', onclick: () => { close(); pickFiles(c, firstEmpty(bank(), c)) } }, ic('folder'), 'Fill with sounds'),
    h('button', { class: 'pill main', onclick: () => { col.name = name.value.trim() || col.name; col.color = color; save(); close(); renderBoard(); if (tab === 'mixer') renderPanel() } }, 'Save')])
}
function itemWindow(it, kind) {
  const isNew = !it
  it ||= { id: uid(), kind, title: '', type: 'Presentation', dur: 180, note: '' }
  const body = h('div', { class: 'sec' })
  let title, type = it.type, mm, ss
  if (it.kind !== 'pad') {
    title = h('input', { class: 'field', value: it.title, placeholder: it.kind === 'voice' ? 'Voice track' : 'What happens: intro, guest, news…' })
    body.append(title)
  } else body.append(h('b', null, itemTitle(it)))
  if (it.kind === 'talk') {
    const kinds = seg(TALK_KINDS.map(x => [x, x]), type, v => { type = v }); kinds.classList.add('seg-wrap')
    body.append(kinds)
    mm = h('input', { class: 'field', style: 'width:80px', inputmode: 'numeric', value: Math.floor((it.dur || 0) / 60) }); ss = h('input', { class: 'field', style: 'width:80px', inputmode: 'numeric', value: Math.round((it.dur || 0) % 60) })
    body.append(row('Planned', mm, h('span', { class: 'lbl', style: 'min-width:0' }, 'min'), ss, h('span', { class: 'lbl', style: 'min-width:0' }, 'sec')))
  } else body.append(h('div', { class: 'hint' }, 'Length ' + fmt(itemDur(it)) + (it.kind === 'voice' ? ' · recorded with the microphone' : ' · from the pad')))
  const note = h('textarea', { class: 'field', placeholder: 'Notes for this part (guest, questions, what to say)' }); note.value = it.note || ''
  body.append(note)
  const close = modal(isNew ? 'New talk segment' : it.kind === 'pad' ? 'Jingle in the show' : it.kind === 'voice' ? 'Voice track' : 'Talk segment', body, [
    !isNew ? h('button', { class: 'pill danger', onclick: () => { const i = S.show.items.indexOf(it); if (i >= 0) { S.show.items.splice(i, 1); if (S.show.cur >= i && S.show.cur > -1) S.show.cur-- } if (it.file && !fileUsed(it.file)) dbDel('files', it.file); save(); close(); renderPanel() } }, ic('trash'), 'Remove') : null,
    it.kind === 'voice' ? h('button', { class: 'pill', onclick: () => fireItem(it) }, ic('play'), 'Listen') : null,
    h('button', { class: 'pill main', onclick: () => {
      if (title) it.title = title.value.trim() || (it.kind === 'voice' ? 'Voice track' : type || 'Talk')
      if (it.kind === 'talk') { it.type = type || 'Other'; it.dur = (Math.max(0, +mm.value || 0)) * 60 + clamp(+ss.value || 0, 0, 59) }
      it.note = note.value.trim()
      if (isNew) S.show.items.push(it)
      save(); close(); renderPanel()
    } }, isNew ? 'Add' : 'Save')])
}
function jinglePicker() {
  const q = h('input', { class: 'field', placeholder: 'Find a pad' })
  const list = h('div', { class: 'items', style: 'max-height:50vh;overflow:auto' })
  const fill = () => {
    list.textContent = ''
    const s = q.value.trim().toLowerCase()
    for (const b of S.banks) for (const k in b.pads) {
      const p = b.pads[k]; if (!p.file) continue
      if (s && !(p.name || '').toLowerCase().includes(s)) continue
      const c = +k.split(':')[0]
      list.append(h('div', { class: 'item', style: `--c:${padColor(p, b, c)};grid-template-columns:minmax(0,1fr) auto`, onclick: () => { S.show.items.push({ id: uid(), kind: 'pad', pad: p.id, note: '' }); save(); renderPanel(); toast('Added: ' + (p.name || 'Untitled')) } },
        h('div', { class: 'in' }, h('b', null, h('i'), p.name || 'Untitled'), h('span', null, b.name + ' · ' + b.cols[c].name)), h('span', { class: 'du' }, fmt(padLen(p)))))
    }
    if (!list.children.length) list.append(h('div', { class: 'hint' }, 'No pads with a sound yet.'))
  }
  q.addEventListener('input', fill); fill()
  modal('Add a jingle to the show', h('div', { class: 'sec' }, q, list, h('div', { class: 'hint' }, 'Tap to add; each tap adds it once more at the end.')))
}
function settingsWindow() {
  const theme = document.documentElement.dataset.theme || 'dark'
  const body = h('div', { class: 'sec' },
    box(row('Look', seg([['dark', 'Dark'], ['light', 'Light']], theme, v => { document.documentElement.dataset.theme = v; try { localStorage.setItem('rc_theme', v) } catch (e) {} })),
      row('At once', seg([[4, '4'], [6, '6'], [8, '8'], [12, '12'], [16, '16']].map(([a, b]) => [a, b]), S.set.maxVoices, v => { S.set.maxVoices = v; save() })),
      row('Crossfade', ...slider(0.2, 8, 0.1, S.set.xfade, v => { S.set.xfade = v; save() }, fmt1)),
      row('Fade all', ...slider(0.2, 10, 0.1, S.set.fadeAll, v => { S.set.fadeAll = v; save() }, fmt1)),
      row('New pads', seg([['stop', 'Stop'], ['fade', 'Fade'], ['restart', 'Restart'], ['pause', 'Pause']], S.set.second, v => { S.set.second = v; save() })),
      h('div', { class: 'hint' }, 'At once: how many sounds play together; the oldest fades when one more starts. New pads: what a second touch does on pads you add from now on.')),
    box(row('MIDI', h('button', { class: 'pill sm', onclick: () => midiConnect(true) }, ic('sliders'), midiIn.size ? midiIn.size + ' connected' : 'Connect'),
      h('button', { class: 'pill sm' + (learn?.kind === 'go' ? ' on' : ''), onclick: () => { learn = { kind: 'go' }; midiConnect(); toast('Play the note for Next') } }, S.set.midiGo != null ? 'Next = note ' + S.set.midiGo : 'Learn Next')),
      h('div', { class: 'hint' }, 'A MIDI controller (pads, keys) plays pads: pick a pad in Edit, press Learn and hit a note. Works in Chrome and Edge.')),
    box(h('div', { class: 'keys' },
      h('kbd', null, 'Space'), h('span', null, 'Next item of the show'), h('kbd', null, 'P'), h('span', null, 'Pause / resume everything'),
      h('kbd', null, 'M'), h('span', null, 'Microphone on / off'), h('kbd', null, 'Esc'), h('span', null, 'Fade all out'),
      h('kbd', null, '⇧ Esc'), h('span', null, 'Stop all at once'), h('kbd', null, '1 – 0'), h('span', null, 'Banks 1 to 10 (with ⌥ / Alt)'),
      h('kbd', null, 'Any key'), h('span', null, 'The pad you gave it (Edit > Pad > Key)'))),
    box(h('div', { class: 'wrap' }, h('button', { class: 'pill sm', onclick: exportBackup }, ic('download'), 'Back up everything'), h('button', { class: 'pill sm', onclick: () => { $('#backupPick').value = ''; $('#backupPick').click() } }, ic('upload'), 'Restore')),
      h('div', { class: 'hint' }, 'Everything stays in this browser on this device: pads, sounds, shows and the log. A backup is one file with all of it, to keep or to move to another computer or iPad.')),
  )
  modal('Settings', body, [h('button', { class: 'pill danger', onclick: resetAll }, 'Start over')])
}

/* ---------- backup ---------- */
const b64 = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob) })
async function exportBackup() {
  toast('Packing your board…')
  const files = {}
  for (const k of await dbKeys('files')) { const blob = await dbGet('files', k); if (blob) files[k] = await b64(blob) }
  download(new Blob([JSON.stringify({ app: 'roarcast', v: 1, state: S, files })], { type: 'application/json' }), `RoarCast backup ${stamp()}.roarcast`)
}
async function importBackup(f) {
  try {
    const j = JSON.parse(await f.text())
    if (j.app !== 'roarcast' && j.app !== 'roarjingle') throw new Error('This is not a RoarCast backup')
    if (!confirm('Restore this backup? It replaces the board, the shows and the log on this device.')) return
    stopAll()
    for (const k of await dbKeys('files')) await dbDel('files', k)
    for (const [k, d] of Object.entries(j.files || {})) await dbPut('files', k, await (await fetch(d)).blob())
    bufs.clear(); peaks.clear()
    S = migrate(j.state); await dbPut('kv', 'state', S)
    renderAll(); toast('Restored')
  } catch (e) { toast('Could not restore: ' + e.message) }
}
async function resetAll() {
  if (!confirm('Start over? Every pad, sound, show and log on this device is deleted.')) return
  stopAll()
  for (const k of await dbKeys('files')) await dbDel('files', k)
  await dbDel('kv', 'state'); location.reload()
}

/* ---------- keys and MIDI ---------- */
const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
document.addEventListener('keydown', e => {
  if (learn?.kind === 'key') {
    e.preventDefault()
    const p = learn.pad; learn = null
    if (e.key === 'Backspace' || e.key === 'Delete') p.key = ''
    else if (e.key === 'Escape') {}
    else if (['Space', ' '].includes(e.key) || ['p', 'P', 'm', 'M'].includes(e.key)) toast('That key is taken by the show; pick another')
    else { for (const b of S.banks) for (const k in b.pads) if (b.pads[k].key === e.key.toLowerCase()) b.pads[k].key = ''; p.key = e.key.length === 1 ? e.key.toLowerCase() : e.key }
    save(); renderBoard(); renderPanel(); return
  }
  if (typing(e) || e.metaKey || e.ctrlKey) return
  if ($('#overlay').classList.contains('on')) { if (e.key === 'Escape') $('#overlay .x')?.click(); return }
  if (e.repeat) return
  if (e.altKey && /^Digit\d$/.test(e.code)) { const i = (+e.code.slice(5) + 9) % 10; if (S.banks[i]) { S.bank = i; save(); renderBanks(); renderBoard() } e.preventDefault(); return }
  if (e.code === 'Space') { e.preventDefault(); showGo(); return }
  if (e.key === 'Escape') { e.shiftKey ? stopAll() : fadeAll(); return }
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
  if (k === 'p') return pauseAll()
  if (k === 'm') return toggleTalk()
  // the pad's key: the bank on screen first, then any bank
  const find = b => Object.values(b.pads).find(p => p.file && p.key === k)
  const p = find(bank()) || S.banks.map(find).find(Boolean)
  if (p) { e.preventDefault(); tapPad(p) }
})
const midiIn = new Map()
async function midiConnect(tell) {
  if (!navigator.requestMIDIAccess) { toast('This browser has no MIDI (use Chrome or Edge)'); return false }
  try {
    const acc = await navigator.requestMIDIAccess()
    const hook = () => { for (const i of acc.inputs.values()) if (!midiIn.has(i.id)) { midiIn.set(i.id, i); i.onmidimessage = onMidi } }
    hook(); acc.onstatechange = hook
    if (tell) toast(midiIn.size ? midiIn.size + ' MIDI device(s) connected' : 'No MIDI device found')
    return true
  } catch (e) { toast('MIDI not allowed'); return false }
}
async function midiLearn(p) { if (!(await midiConnect())) return; learn = { kind: 'midi', pad: p }; renderPanel(); toast('Hit a note or pad on your controller') }
function onMidi(m) {
  const [st, note, vel] = m.data, type = st & 0xf0
  const on = (type === 0x90 && vel > 0) || (type === 0xb0 && vel > 0)
  if (!on) return
  const id = type === 0xb0 ? 'cc' + note : note
  if (learn?.kind === 'midi') { const p = learn.pad; learn = null; for (const b of S.banks) for (const k in b.pads) if (b.pads[k].midi === id) b.pads[k].midi = null; p.midi = id; save(); renderPanel(); toast('Learned: ' + id); return }
  if (learn?.kind === 'go') { learn = null; S.set.midiGo = id; save(); toast('Next is note ' + id); return }
  if (S.set.midiGo === id) return showGo()
  const find = b => Object.values(b.pads).find(p => p.file && p.midi === id)
  const p = find(bank()) || S.banks.map(find).find(Boolean)
  if (p) tapPad(p)
}

/* ---------- files dropped on the page ---------- */
document.addEventListener('dragover', e => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); document.body.classList.add('dragging') } })
document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dragging') })
document.addEventListener('drop', e => {
  e.preventDefault(); document.body.classList.remove('dragging')
  if (e.dataTransfer?.files?.length) { const b = bank(); const c = 0; const r = firstEmpty(b, c); assignFiles(e.dataTransfer.files, c, r - 1 < 0 ? 0 : r, b) }
})
$('#filePick').addEventListener('change', e => { if (pickTarget && e.target.files.length) assignFiles(e.target.files, pickTarget.c, pickTarget.r, pickTarget.b) })
$('#backupPick').addEventListener('change', e => e.target.files[0] && importBackup(e.target.files[0]))
addEventListener('resize', () => { placeLens($('#banks')); placeLens($('#tabs')); renderTop() })
document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume() })
addEventListener('beforeunload', e => { if (rec || voices.length) { e.preventDefault(); e.returnValue = '' } })

function renderAll() { renderBanks(); renderTop(); renderBoard(); renderTabs(); renderPanel() }

/* ---------- start ---------- */
async function boot() {
  document.body.append(h('div', { class: 'dropzone' }, 'Drop sounds to add them to the board'))
  let first = false
  try { const s = await dbGet('kv', 'state'); if (s) S = migrate(s); else first = true } catch (e) { toast('This browser does not keep data here (private window?)') }
  renderAll()
  requestAnimationFrame(tick)
  // browsers start sound only after a touch: one tap to begin
  const st = h('div', { class: 'start' }, h('div', { class: 'sheet-card' }, h('div', { class: 'wm' }, h('span', null, 'ROAR'), h('b', null, 'CAST')),
    h('div', { class: 'hint', style: 'font-size:14px' }, 'Jingles, beds and effects on pads, the show planned to the second, your voice on air and the whole show recorded.'),
    h('button', { class: 'pill main', style: 'height:44px;padding:0 26px;font-size:15px', onclick: async () => {
      ensureCtx(); st.remove()
      if (first) { toast('Making a few sounds to start with…'); await makeDemos(); renderAll(); toast('Ready. Tap a pad.') }
    } }, ic('play'), 'Start'),
    h('div', { class: 'hint' }, 'Everything stays in this browser. On an iPad: Share > Add to Home Screen.')))
  document.body.append(st)
}
boot()
