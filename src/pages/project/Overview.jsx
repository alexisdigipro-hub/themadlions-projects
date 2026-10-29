import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal, useToast } from '../../components/ui.jsx'
import { ProjectForm } from '../Dashboard.jsx'
import { useProject } from '../Project.jsx'
import { can, nextProjectCode, uid, useStore } from '../../lib/store.jsx'
import { duplicateProject } from '../../lib/duplicate.js'
import { fmtDate } from '../../lib/dates.js'
import { projectProgress } from '../../lib/progress.js'
import { analyze, fmtTime, fmtTimeMs, uploadTrack } from '../../lib/audio.js'
import { useTrackSource } from '../../lib/trackSource.js'
import { pcloudTarget } from '../../lib/pcloud.js'
import { needsEncoding, toMp3 } from '../../lib/mp3.js'
import { useAudioChoice } from '../../components/AudioChoice.jsx'
import { remote } from '../../lib/supabase.js'
import ProjectRoarMe from '../../components/ProjectRoarMe.jsx'
import Tasks, { tasksFor } from './Tasks.jsx'
import Notes from './Notes.jsx'
import Script from './Script.jsx'
import Music, { Waveform } from './Music.jsx'
import People from './People.jsx'
import RoardinoPage from '../RoardinoPage.jsx'
import { supabase } from '../../lib/supabase.js'
import { syncShootDay } from '../../lib/shootDays.js'
import { ReceiptModal } from '../../components/Receipt.jsx'
import { groupPairs } from '../../lib/budgetCats.js'

// Made absolute here: a relative url() inside a CSS variable is read against the stylesheet
// (assets/), not the page, so "./ordino-set.webp" was looked for in the wrong folder
const ORDINO_BG = new URL(`${import.meta.env.BASE_URL}ordino-set.webp`, document.baseURI).href

const emptyMusic = () => ({ tracks: [], activeTrackId: '', sections: [], notes: '' })

/* A track to upload and listen to, here on Overview, with the same waveform as the full editor —
   just no sections/lyrics editing, that lives on the Script tab now. Writes to the same
   project.music.tracks the Script page's song map reads, so a track added here shows up there
   too, and the other way round. */
function SongPlayer({ project, edit, editable, hideEmpty = false, startSignal = 0 }) {
  const toast = useToast()
  const { state } = useStore()
  const music = { ...emptyMusic(), ...(project.music || {}) }
  const track = music.tracks.find((t) => t.id === music.activeTrackId) || music.tracks[0]
  const sections = music.sections || []
  const fileRef = useRef()
  const audioRef = useRef()
  const { url, err, onError, play } = useTrackSource(track)
  const [busy, setBusy] = useState('')
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const current = sections.find((s) => time >= s.start && time < s.end)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setTime(a.currentTime)
    const onPlay = () => setPlaying(true), onPause = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime); a.addEventListener('play', onPlay); a.addEventListener('pause', onPause); a.addEventListener('ended', onPause)
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); a.removeEventListener('ended', onPause) }
  }, [url])

  // Upload song out on the Overview opens this panel's own file picker.
  useEffect(() => { if (startSignal) fileRef.current?.click() }, [startSignal])

  const setMusic = (fn) => edit((p) => { p.music = { ...emptyMusic(), ...(p.music || {}) }; fn(p.music) })
  const seek = (t) => { if (audioRef.current) { audioRef.current.currentTime = t; setTime(t) } }
  const toggle = () => { const a = audioRef.current; if (!a) return; a.paused ? play(a) : a.pause() }

  const [askAudio, audioChoice] = useAudioChoice()
  const onFile = async (file) => {
    if (!file) return
    const original = file
    try {
      // a WAV (or AIFF, FLAC): kept as it is or made an MP3 here, as the person chooses
      if (needsEncoding(file)) {
        const how = await askAudio(file)
        if (!how) return
        if (how === 'mp3') {
          setBusy('Converting to MP3… 0%')
          file = await toMp3(file, (pct) => setBusy(`Converting to MP3… ${Math.round(pct * 100)}%`))
        }
      }
      setBusy('Analysing…')
      const { peaks, duration } = await analyze(file)
      const id = uid()
      setBusy('Uploading…')
      const { path, ext, fileid, scope } = await uploadTrack({ projectId: project.id, id, file, pcloud: pcloudTarget(state, project.id, 'Music'), onProgress: (p) => setBusy(`Uploading… ${Math.round(p * 100)}%`) })
      setMusic((m) => {
        m.tracks.push({ id, name: file.name.replace(/\.[^.]+$/, ''), path, ext, ...(fileid ? { fileid, scope } : {}), duration, peaks, bytes: file.size, kind: m.tracks.length ? 'other' : 'master', addedAt: new Date().toISOString() })
        m.activeTrackId = id
      })
      toast(original !== file ? `${original.name} converted and added · ${fmtTime(duration)}` : `${file.name} added · ${fmtTime(duration)}`, 'ok')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy('')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // No song yet: the file input still has to exist for that button to reach.
  if (hideEmpty && !track) {
    return editable ? <><input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" hidden onChange={(e) => onFile(e.target.files?.[0])} />{audioChoice}</> : null
  }

  return (
    <section className="panel song-card" data-stage="song">
      <div className="panel-head">
        <h2>Song</h2>
        {editable && (
          <>
            <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} disabled={!!busy}>
              {busy || (track ? 'Add version' : 'Upload song')}
            </Button>
          </>
        )}
      </div>
      {!track ? (
        <p className="muted small">Upload the song to listen to it here. Full lyrics, sections and timing live on the Script tab.</p>
      ) : (
        <div className="stack">
          {!remote && <p className="notice small">Local mode: the audio plays for this session only.</p>}
          {music.tracks.length > 1 && (
            <select className="input select compact" value={track.id} onChange={(e) => setMusic((m) => (m.activeTrackId = e.target.value))}>
              {music.tracks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <audio ref={audioRef} src={url || undefined} preload="metadata" onError={onError} />
          {/* one slim row, play, the waveform, the time (Alex, 10 Oct: the whole box smaller, not only the wave) */}
          <div className="player-row">
            <button className="play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
            <Waveform peaks={track.peaks} duration={track.duration} time={time} sections={sections} onSeek={seek} active={current?.id} />
            <span className="player-time">{fmtTimeMs(time)} <span className="muted">/ {fmtTime(track.duration)}</span></span>
          </div>
          {err && <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>{err}</p>}
        </div>
      )}
      {audioChoice}
    </section>
  )
}

/* The add buttons as pills with an icon each (Alex, 11 Oct: "buttons of 2026") */
const ADD_ICONS = {
  task: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5" /><path d="m8.5 12 2.4 2.4 4.6-4.8" /></svg>,
  song: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></svg>,
  link: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></svg>,
  script: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>,
  paste: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="12" height="16" rx="2.5" /><path d="M9.5 4.5V3.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.7" /><path d="M9 10h6M9 13.5h6M9 17h4" /></svg>,
  chat: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4.5 3.5v-3.5h0a2 2 0 0 1-1-1.7z" /><path d="M8.5 9.5h7M8.5 12.5h4.5" /></svg>,
  notes: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8.5L19 8v11.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" /><path d="M14 3.5V8h5M8.5 12.5h7M8.5 16h5" /></svg>,
  edit: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>,
  duplicate: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" /></svg>,
  lock: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>,
  unlock: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 7.6-1.8" /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  more: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18.5" cy="12" r="1.4" /></svg>,
}

export default function Overview() {
  const { project, edit, canEdit, user, sections = [] } = useProject()
  const [ordinoOpen, setOrdinoOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const myReceipts = (project.budget?.lines || []).filter((l) => l.receipt && l.receipt.addedBy === user?.id).length
  // the project's ordinos in Roardino (23 Oct) by date, and the one to name on the button: the next to come, else the last
  const [ordinoDays, setOrdinoDays] = useState([])
  useEffect(() => {
    if (!supabase) return
    let off = false
    supabase.from('roardino_ordinos').select('id, day:data->day').eq('project_id', project.id)
      .then(({ data }) => { if (!off) setOrdinoDays((data || []).map((r) => r.day || {}).sort((a, b) => (a.date || '').localeCompare(b.date || ''))) })
    return () => { off = true }
  }, [project.id])
  const todayIso = new Date().toISOString().slice(0, 10)
  const nextOrdino = ordinoDays.find((d) => (d.date || '') >= todayIso) || ordinoDays[ordinoDays.length - 1] || {}
  const { state, update } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(null)
  const [duping, setDuping] = useState(false)
  // copies the stored project, not the one shown here (which has the company library merged in)
  const duplicate = async () => {
    const raw = state.projects.find((p) => p.id === project.id)
    if (!raw) return
    setDuping(true)
    try {
      const { project: copy, shared } = await duplicateProject(raw)
      update((s) => {
        copy.code = nextProjectCode(s)
        s.projects.push(copy)
        return s
      })
      toast(shared ? `Copied. ${shared} file${shared === 1 ? '' : 's'} could not be copied and stay shared with the original.` : `Copied as "${copy.title}"`, shared ? 'error' : 'ok')
      navigate(`/p/${copy.id}`)
    } catch (e) {
      toast(`Could not duplicate: ${e.message}`, 'error')
    } finally {
      setDuping(false)
    }
  }

  const { pct, stages } = projectProgress(project, state.settings)
  // the facts under the progress (Overview's top, a computer): the shoot and how far off it is, days, crew, cast
  const facts = (() => {
    const out = []
    const d = /^\d{4}-\d{2}-\d{2}$/.test(project.startDate || '') ? Math.round((Date.parse(project.startDate) - Date.parse(new Date().toISOString().slice(0, 10))) / 86400000) : null
    if (d !== null) out.push({ k: 'shoot', v: fmtDate(project.startDate), l: d === 0 ? 'shoot today' : d === 1 ? 'shoot tomorrow' : d > 1 ? `shoot in ${d} days` : `shot ${-d} day${d === -1 ? '' : 's'} ago`, soon: d >= 0 && d <= 7 })
    const n = (project.shootingDays || []).length
    if (n) out.push({ k: 'days', v: n, l: n === 1 ? 'shoot day' : 'shoot days' })
    const crew = (project.contacts || []).filter((c) => c.kind === 'crew' && c.dept !== 'Client').length
    const cast = (project.contacts || []).filter((c) => c.kind === 'cast').length
    if (crew) out.push({ k: 'crew', v: crew, l: 'crew' })
    if (cast) out.push({ k: 'cast', v: cast, l: 'cast' })
    return out
  })()
  const next = project.status === 'Delivered' ? null : stages.find((st) => st.done < 1) || null
  /* a stage chip takes you to its place (Alex, 29 Oct: they all threw him to Home, the old tabs being gone): Budget and
     Schedule are tabs of the project; the rest are boxes on this page (data-stage), scrolled to under the progress;
     a stage whose box is not there yet (nothing added) does nothing */
  const STAGE_BOXES = { doc: ['song', 'script'], brief: ['script'], breakdown: ['script'], cast: ['cast'], crew: ['crew', 'cast'], locations: ['locations'], venue: ['locations'], schedule: ['ordino'] }
  const goStage = (st) => {
    const to = (st.to || '').split('?')[0]
    if (to === 'budget' || to === 'schedule') return navigate(`/p/${project.id}/${to}`)
    for (const k of STAGE_BOXES[st.key] || []) {
      let el = document.querySelector(`.overview [data-stage="${k}"]`)
      if (el && el.style.display === 'contents') el = el.firstElementChild
      if (!el) continue
      const bar = document.querySelector('.overview .panel.progress')
      const room = bar && getComputedStyle(bar).position === 'sticky' ? (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight + 16 : 16
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - room, behavior: 'smooth' })
      el.classList.remove('stage-flash'); void el.offsetWidth; el.classList.add('stage-flash')
      return
    }
  }
  // Alex: an empty Tasks / Song / Links / Production notes panel is just a box saying nothing.
  // Each one keeps quiet until it has something in it, and its button lives in one row up here
  // instead. Pressing a button bumps a counter the panel watches, so it opens its own form.
  const [pillSlot, setPillSlot] = useState(null) // where the Project Database puts its add pills
  const [roarmeOpen, setRoarmeOpen] = useState(false)
  // the project's title row and the whole progress stay at the top while the page scrolls under them (Alex, 29 Oct:
  // "ALL of this fixed"), on a computer (styles.css): the progress sits right under the title row (--proj-top-h), and
  // once the page has moved the title row gets its glass band (.ov-scrolled) and the progress a shadow (.stuck)
  const stickMark = useRef(null)
  const stickPanel = useRef(null)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const proj = stickPanel.current?.closest('.project')
    const top = proj?.querySelector('.proj-top')
    let ro = null
    if (proj && top && typeof ResizeObserver !== 'undefined') {
      const size = () => proj.style.setProperty('--proj-top-h', `${top.offsetHeight}px`)
      size()
      ro = new ResizeObserver(size)
      ro.observe(top)
    }
    // read on every scroll (of the window or any box), once a frame: steadier than an observer in Safari
    let raf = 0
    const look = () => {
      raf = 0
      const el = stickMark.current
      if (!el) return
      const head = top ? top.getBoundingClientRect().bottom : 0
      const now = el.getBoundingClientRect().top < head - 2
      setStuck(now)
      proj?.classList.toggle('ov-scrolled', (window.scrollY || document.scrollingElement?.scrollTop || 0) > 2)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(look) }
    window.addEventListener('scroll', on, { passive: true, capture: true })
    window.addEventListener('resize', on)
    look()
    return () => { ro?.disconnect(); proj?.classList.remove('ov-scrolled'); window.removeEventListener('scroll', on, { capture: true }); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf) }
  }, [])
  const [menu, setMenu] = useState('') // 'add' or 'more': the two small menus of the project's top row (Alex, 28 Oct)
  // a choice in + Add closes it; a DOM listener, because the Project Database's pills come in through a portal
  useEffect(() => {
    if (!menu) return
    const on = (e) => { if (e.target.closest?.('.ov-menu-add button')) setTimeout(() => setMenu(''), 0) }
    const key = (e) => { if (e.key === 'Escape') setMenu('') }
    document.addEventListener('click', on)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('click', on); document.removeEventListener('keydown', key) }
  }, [menu])
  const [start, setStart] = useState({ task: 0, song: 0, link: 0, notes: 0, script: 0, paste: 0 })
  const begin = (k) => setStart((s0) => ({ ...s0, [k]: s0[k] + 1 }))
  const isMusicVideo = project.category === 'Music Video'
  const hasSong = !!(project.music?.tracks || []).length
  // the adds in groups, so one + Add holds them all (Alex, 28 Oct: "many buttons, all mixed up")
  const adds = [
    can(user, 'tasks') && canEdit('tasks') && !tasksFor(project.tasks || [], user).length && ['task', 'Add task'],
    isMusicVideo && can(user, 'music') && canEdit('music') && !hasSong && ['song', 'Upload song'],
    can(user, 'files') && canEdit('files') && !(project.links || []).length && ['link', 'Add link'],
    can(user, 'files') && canEdit('files') && !(project.productionNotes || '').trim() && ['notes', 'Add notes'],
    sections.includes('script') && canEdit('script') && !project.script?.text && !(project.scriptVersions || []).length && ['script', 'Upload script'],
    sections.includes('script') && canEdit('script') && !project.script?.text && !(project.scriptVersions || []).length && ['paste', 'Paste script'],
  ].filter(Boolean)

  return (
    <div className="overview">
      <span ref={stickMark} className="progress-mark" aria-hidden="true" />
      <section ref={stickPanel} className={`panel progress${stuck ? ' stuck' : ''}`}>
        <div className="progress-head">
          <div className="progress-cover">
            {/* Change / Adjust under the picture went (Alex, 11 Oct): the cover is changed in Edit details */}
            {project.coverThumb ? <img src={project.coverThumb} alt="" /> : <span className="progress-cover-empty" style={{ background: project.color }} />}
          </div>
          <div className="progress-main">
            <div className="progress-top">
              <span>
                <strong className="progress-pct">{pct}%<small> done</small></strong> <span className="muted small progress-sub">{[project.status === 'Delivered' && ['Delivered'], project.frozen && ['🔒 locked'], project.startDate && [`shoot ${fmtDate(project.startDate)}`, 'progress-shoot']].filter(Boolean).map(([x, c]) => <span key={x} className={c}>{x}</span>)}</span>
              </span>
              {/* the project's few actions, always in the same place (Alex, 28 Oct: "I was looking for Edit"):
                  + Add (everything that can be added, in groups), Edit, and ⋯ for Duplicate, Lock and the RoarMe group */}
              <span className="ov-acts">
                {(adds.length > 0 || sections.includes('people')) && (
                  <span className="ov-menu-wrap">
                    <button type="button" className={`add-pill ov-add${menu === 'add' ? ' on' : ''}`} onClick={() => setMenu(menu === 'add' ? '' : 'add')} aria-expanded={menu === 'add'}>{ADD_ICONS.plus}<span>Add</span></button>
                    {menu === 'add' && (
                      <>
                        <span className="ab-export-shade" onClick={() => setMenu('')} />
                        <div className="ov-menu ov-menu-add">
                          {adds.some(([k]) => ['task', 'link', 'notes'].includes(k)) && <>
                            <span className="ov-menu-head">Work</span>
                            <div className="ov-menu-grid">{adds.filter(([k]) => ['task', 'link', 'notes'].includes(k)).map(([k, label]) => <button key={k} type="button" className="add-pill" onClick={() => begin(k)}>{ADD_ICONS[k]}<span>{label}</span></button>)}</div>
                          </>}
                          {adds.some(([k]) => ['song', 'script', 'paste'].includes(k)) && <>
                            <span className="ov-menu-head">Song &amp; script</span>
                            <div className="ov-menu-grid">{adds.filter(([k]) => ['song', 'script', 'paste'].includes(k)).map(([k, label]) => <button key={k} type="button" className="add-pill" onClick={() => begin(k)}>{ADD_ICONS[k]}<span>{label}</span></button>)}</div>
                          </>}
                          {sections.includes('people') && <>
                            <span className="ov-menu-head">People, places &amp; gear</span>
                            {/* the Project Database's Add crew / Add cast / Add location / Add item (People.jsx, through a portal) */}
                            <div className="ov-menu-grid" ref={setPillSlot} />
                          </>}
                        </div>
                      </>
                    )}
                  </span>
                )}
                {canEdit('projects') && <button type="button" className="add-pill ov-edit" onClick={() => setDraft({ ...project })}>{ADD_ICONS.edit}<span>Edit</span></button>}
                {(can(user, 'projects', 'edit') || user?.role === 'admin') && (
                  <span className="ov-menu-wrap">
                    <button type="button" className={`ov-round${menu === 'more' ? ' on' : ''}`} onClick={() => setMenu(menu === 'more' ? '' : 'more')} aria-label="More" title="Duplicate, Lock, RoarMe group">{ADD_ICONS.more}</button>
                    {menu === 'more' && (
                      <>
                        <span className="ab-export-shade" onClick={() => setMenu('')} />
                        <div className="ov-menu ov-menu-more">
                          {can(user, 'projects', 'edit') && <button type="button" className="ov-menu-row" disabled={duping} onClick={() => { setMenu(''); duplicate() }}>{ADD_ICONS.duplicate}<span><b>{duping ? 'Copying…' : 'Duplicate'}</b><small>A copy of this project to start from</small></span></button>}
                          {user?.role === 'admin' && <button type="button" className="ov-menu-row" onClick={() => { setMenu(''); edit((p) => { p.frozen = !p.frozen }); toast(project.frozen ? 'Project unlocked, the team can edit again' : 'Project locked: only administrators can change it now', 'ok') }}>{project.frozen ? ADD_ICONS.unlock : ADD_ICONS.lock}<span><b>{project.frozen ? 'Unlock project' : 'Lock project'}</b><small>{project.frozen ? 'The team can edit it again' : 'Only administrators can change it'}</small></span></button>}
                          {remote && user?.role === 'admin' && <button type="button" className="ov-menu-row" onClick={() => { setMenu(''); setRoarmeOpen(true) }}>{ADD_ICONS.chat}<span><b>RoarMe group</b><small>The project's chat in RoarMe</small></span></button>}
                        </div>
                      </>
                    )}
                  </span>
                )}
              </span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            {/* on a computer the bar is made of the stages (Alex, 29 Oct: "this bar could be more refined and beautiful"):
                one segment each, as long as its weight, lit as far as it is done, in the order of the chips under it */}
            <div className="progress-segs" aria-hidden="true">
              {stages.map((st) => (
                <span key={st.key} className={`pseg${st.done >= 1 ? ' done' : st.done > 0 ? ' part' : ''}`} style={{ flexGrow: st.weight || 1 }} title={`${st.label}: ${st.done >= 1 ? 'done' : `${Math.round(st.done * 100)}%`}`}>
                  <i style={{ width: `${Math.round(Math.min(1, st.done) * 100)}%` }} />
                </span>
              ))}
            </div>
            <ul className="stages">
              {stages.map((st) => (
                <li key={st.key} className={st.done >= 1 ? 'done' : st.done > 0 ? 'part' : ''}>
                  {st.manual ? (
                    <button className="stage-manual" disabled={!canEdit('projects')} onClick={() => edit((p) => { const k = st.key.slice(7); p.customStages = { ...(p.customStages || {}), [k]: !p.customStages?.[k] } })}>
                      <span className="stage-dot" />
                      <span className="stage-label">{st.label}</span>
                      <span className="stage-pct muted small">{st.done >= 1 ? '✓' : 'tap when done'}</span>
                    </button>
                  ) : (
                    <button type="button" className="stage-manual stage-go" onClick={() => goStage(st)}>
                      <span className="stage-dot" />
                      <span className="stage-label">{st.label}</span>
                      <span className="stage-pct muted small">{st.done >= 1 ? '✓' : st.done > 0 ? `${Math.round(st.done * 100)}%` : ''}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {/* the project at a glance under the stages, on a computer (Alex, 29 Oct: "maybe add something"): the shoot
                and how far off it is, its days, the people, and the next stage still to do as a link to it */}
            <div className="progress-facts">
              {facts.map((f) => <span key={f.k} className={`pfact${f.soon ? ' soon' : ''}`}><b>{f.v}</b>{f.l}</span>)}
              {next && (next.manual ? <span className="pfact next">Next<b>{next.label}</b></span> : <button type="button" className="pfact next" onClick={() => goStage(next)}>Next<b>{next.label}</b><span aria-hidden="true">›</span></button>)}
            </div>
          </div>
        </div>
      </section>

      {/* the song first, above the ordino (Alex, 10 Oct) */}
      {/* one song box (Alex, 27 Oct: "the audio is there twice"): with the Script section on and a song uploaded it is the
          full song map (waveform, sections, lyrics); otherwise the simple player, whose Upload song is a pill above */}
      {isMusicVideo && can(user, 'music') && (sections.includes('script') && hasSong
        ? <section className="panel music-panel" data-stage="song"><Music /></section>
        : <SongPlayer project={project} edit={edit} editable={canEdit('music')} hideEmpty startSignal={start.song} />)}

      {/* The ordino as one button that looks like the song box above it, for everyone on the project,
          administrators too (Alex, 10 Oct); it opens the finished ordino as the crew get it on a phone.
          Alex's on-set picture (public/ordino-set.webp) shows faintly across it */}
      {ordinoDays.length > 0 && (
        <button type="button" className="panel ordino-btn" data-stage="ordino" style={{ '--ordino-bg': `url("${ORDINO_BG}")` }} onClick={() => setOrdinoOpen(true)}>
          <span className="ordino-btn-text">
            <strong>Ordino</strong>
            <span>{[nextOrdino.date && new Date(nextOrdino.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), nextOrdino.callTime && `call ${nextOrdino.callTime}`, ordinoDays.length > 1 && `${ordinoDays.length} days`].filter(Boolean).join(' · ')}</span>
          </span>
          <span className="ordino-btn-go" aria-hidden="true">›</span>
        </button>
      )}
      <Modal open={roarmeOpen} title="RoarMe group" onClose={() => setRoarmeOpen(false)}>
        {roarmeOpen && <ProjectRoarMe projectId={project.id} />}
      </Modal>
      <Modal open={ordinoOpen} title="Ordino" onClose={() => setOrdinoOpen(false)}>
        {ordinoOpen && <RoardinoPage project={project.id} see className="in-modal" />}
      </Modal>

      {/* Add receipt for the team, not administrators (Alex, 10 Oct): the same box as the Ordino button,
          opening the Budget tab's receipt form */}
      {user?.role !== 'admin' && (
        <button type="button" className="panel ordino-btn receipt-btn" onClick={() => setReceiptOpen(true)}>
          <span className="ordino-btn-text">
            <strong>Add receipt</strong>
            <span>{myReceipts ? `${myReceipts} added by you · paid for something? Photograph it` : `Paid for something on ${project.title}? Photograph it`}</span>
          </span>
          <span className="ordino-btn-go" aria-hidden="true">›</span>
        </button>
      )}
      {receiptOpen && <ReceiptModal project={project} groups={groupPairs(state.settings, project.budget?.lines || [])} onClose={() => setReceiptOpen(false)} />}

      {can(user, 'tasks') && <Tasks hideEmpty startSignal={start.task} />}


      {/* Files & Notes used to be its own tab; links and production notes moved here, Files was dropped */}
      {can(user, 'files') && <Notes hideEmpty startLink={start.link} startNotes={start.notes} />}

      {/* Project Database and Script & Breakdown, once tabs, are Overview's own sections now (Alex, 27 Oct); a
          project can still switch either off in Edit details > Tabs */}
      {sections.includes('people') && <People onOverview pillSlot={pillSlot} />}
      {sections.includes('script') && <div data-stage="script" style={{ display: 'contents' }}><Script hideEmpty uploadSignal={start.script} pasteSignal={start.paste} /></div>}

      <Modal
        open={!!draft}
        title="Edit project"
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!(draft.title || '').trim()) return toast('Give the project a title.', 'error')
                // the Shoot day goes into the Calendar and the Ordino as well (Alex, 11 Oct)
                update((s) => {
                  const i = s.projects.findIndex((x) => x.id === project.id)
                  if (i < 0) return s
                  const from = s.projects[i].startDate || ''
                  s.projects[i] = { ...s.projects[i], ...draft, updatedAt: new Date().toISOString() }
                  return syncShootDay(s, project.id, from, draft.startDate || '')
                })
                setDraft(null)
                toast('Project saved', 'ok')
              }}
            >
              Save changes
            </Button>
          </>
        }
      >
        {draft && <ProjectForm value={draft} onChange={setDraft} />}
      </Modal>
    </div>
  )
}
