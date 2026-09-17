import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'
import { download } from '../../lib/dates.js'
import { SECTION_NAMES, analyze, deleteTrack, fmtTime, fmtTimeMs, parseTime, songMapText, trackUrl, uploadTrack } from '../../lib/audio.js'
import { remote } from '../../lib/supabase.js'

const TRACK_KINDS = [['master', 'Master'], ['playback', 'Playback'], ['instrumental', 'Instrumental'], ['demo', 'Demo'], ['other', 'Other']]
const emptyMusic = () => ({ tracks: [], activeTrackId: '', sections: [], notes: '' })

/* Waveform drawn from stored peaks; click or drag to seek. */
function Waveform({ peaks = [], duration = 0, time = 0, sections = [], onSeek, active }) {
  const ref = useRef()
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    const w = c.clientWidth, h = c.clientHeight
    c.width = w * dpr; c.height = h * dpr
    const ctx = c.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)
    const css = getComputedStyle(document.documentElement)
    const accent = css.getPropertyValue('--accent').trim() || '#c9932f'
    const muted = css.getPropertyValue('--line').trim() || '#999'
    // section bands
    sections.forEach((s, i) => {
      if (!duration || s.end <= s.start) return
      const x0 = (s.start / duration) * w, x1 = (s.end / duration) * w
      ctx.fillStyle = i % 2 ? 'rgba(127,127,127,0.10)' : 'rgba(127,127,127,0.05)'
      ctx.fillRect(x0, 0, x1 - x0, h)
      if (s.id === active) { ctx.fillStyle = 'rgba(201,147,47,0.18)'; ctx.fillRect(x0, 0, x1 - x0, h) }
    })
    const n = peaks.length || 1
    const bw = w / n
    const played = duration ? (time / duration) * n : 0
    for (let i = 0; i < n; i++) {
      const p = peaks[i] || 0
      const bh = Math.max(2, p * (h - 6))
      ctx.fillStyle = i < played ? accent : muted
      ctx.fillRect(i * bw + 0.5, (h - bh) / 2, Math.max(1, bw - 1), bh)
    }
    if (duration) {
      const x = (time / duration) * w
      ctx.fillStyle = accent
      ctx.fillRect(x - 1, 0, 2, h)
    }
  }, [peaks, duration, time, sections, active])
  const seek = (e) => {
    if (!duration) return
    const r = ref.current.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration)))
  }
  return <canvas ref={ref} className="wave" onClick={seek} onMouseMove={(e) => e.buttons === 1 && seek(e)} />
}

export default function Music() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const editable = canEdit('music')
  const music = { ...emptyMusic(), ...(project.music || {}) }
  const track = music.tracks.find((t) => t.id === music.activeTrackId) || music.tracks[0]
  const audioRef = useRef()
  const fileRef = useRef()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState('')
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(null) // section id
  const [draft, setDraft] = useState(null)
  const [paste, setPaste] = useState(null)
  const [activeSec, setActiveSec] = useState('')

  const sections = useMemo(() => [...music.sections].sort((a, b) => a.start - b.start), [music.sections])
  const current = sections.find((s) => time >= s.start && time < s.end)

  useEffect(() => {
    let alive = true
    trackUrl(track).then((u) => alive && setUrl(u))
    return () => { alive = false }
  }, [track?.id, track?.path])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => {
      setTime(a.currentTime)
      if (loop) {
        const s = music.sections.find((x) => x.id === loop)
        if (s && a.currentTime >= s.end) a.currentTime = s.start
      }
    }
    const onPlay = () => setPlaying(true), onPause = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime); a.addEventListener('play', onPlay); a.addEventListener('pause', onPause); a.addEventListener('ended', onPause)
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); a.removeEventListener('ended', onPause) }
  }, [url, loop, music.sections])

  const setMusic = (fn) => edit((p) => { p.music = { ...emptyMusic(), ...(p.music || {}) }; fn(p.music, p) })
  const seek = (t) => { if (audioRef.current) { audioRef.current.currentTime = t; setTime(t) } }
  const toggle = () => { const a = audioRef.current; if (!a) return; a.paused ? a.play() : a.pause() }
  const playSection = (s) => { setLoop(null); seek(s.start); audioRef.current?.play() }

  const onFile = async (file) => {
    if (!file) return
    setBusy('Analysing waveform…')
    try {
      const { peaks, duration } = await analyze(file)
      const id = uid()
      setBusy('Uploading…')
      const { path, ext } = await uploadTrack({ projectId: project.id, id, file })
      setMusic((m) => {
        m.tracks.push({ id, name: file.name.replace(/\.[^.]+$/, ''), path, ext, duration, peaks, bytes: file.size, kind: m.tracks.length ? 'other' : 'master', addedAt: new Date().toISOString() })
        m.activeTrackId = id
      })
      toast(`${file.name} added · ${fmtTime(duration)}`, 'ok')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy('')
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const removeTrack = async (t) => {
    await deleteTrack(t.path).catch(() => {})
    setMusic((m) => { m.tracks = m.tracks.filter((x) => x.id !== t.id); if (m.activeTrackId === t.id) m.activeTrackId = m.tracks[0]?.id || '' })
  }

  const saveSection = () => {
    if (!draft.name.trim()) return toast('Name the section.', 'error')
    const s = { ...draft, start: parseTime(draft.startText), end: parseTime(draft.endText) }
    if (s.end <= s.start) return toast('End must be after start.', 'error')
    setMusic((m) => {
      const i = m.sections.findIndex((x) => x.id === s.id)
      const { startText, endText, ...clean } = s
      if (i >= 0) m.sections[i] = clean
      else m.sections.push(clean)
    })
    setDraft(null)
  }
  const openSection = (s) => setDraft({ ...s, startText: fmtTimeMs(s.start), endText: fmtTimeMs(s.end), sceneIds: s.sceneIds || [] })
  const addSection = () => {
    const last = sections[sections.length - 1]
    const start = last ? last.end : 0
    const name = SECTION_NAMES[sections.length] || `Part ${sections.length + 1}`
    setDraft({ id: uid(), name, startText: fmtTimeMs(start), endText: fmtTimeMs(Math.min(track?.duration || start + 30, start + 30)), lyrics: '', sceneIds: [], notes: '' })
  }
  const markNow = (key) => setDraft({ ...draft, [key]: fmtTimeMs(time) })
  const quickMark = (s, key) => setMusic((m) => { const x = m.sections.find((y) => y.id === s.id); if (x) x[key] = Math.round(time * 10) / 10 })
  const fromPaste = () => {
    const blocks = paste.text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
    if (!blocks.length) return
    const dur = track?.duration || blocks.length * 30
    const per = dur / blocks.length
    setMusic((m) => {
      blocks.forEach((b, i) => m.sections.push({ id: uid(), name: SECTION_NAMES[i] || `Part ${i + 1}`, start: Math.round(i * per * 10) / 10, end: Math.round((i + 1) * per * 10) / 10, lyrics: b, sceneIds: [], notes: '' }))
    })
    setPaste(null)
    toast(`${blocks.length} sections created. Fix the times while the track plays.`, 'ok')
  }
  const exportMap = () => download(`${project.title} - song map.txt`, songMapText(music, project.scenes))

  return (
    <div className="music">
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>{track ? track.name : 'No track yet'}</strong>
          <span className="muted">{track ? `${fmtTime(track.duration)} · ${TRACK_KINDS.find(([v]) => v === track.kind)?.[1] || ''}${music.tracks.length > 1 ? ` · ${music.tracks.length} versions` : ''}` : 'Upload the song to start the song map'}{sections.length ? ` · ${sections.length} sections` : ''}</span>
        </div>
        <div className="toolbar-actions">
          {music.tracks.length > 1 && (
            <Select className="compact" value={track?.id || ''} onChange={(e) => setMusic((m) => (m.activeTrackId = e.target.value))} options={music.tracks.map((t) => [t.id, `${t.name} (${TRACK_KINDS.find(([v]) => v === t.kind)?.[1]})`])} />
          )}
          {sections.length > 0 && <Button variant="ghost" onClick={exportMap}>Export song map</Button>}
          {editable && (
            <>
              <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              <Button variant={track ? 'ghost' : 'primary'} onClick={() => fileRef.current?.click()} disabled={!!busy}>{busy || (track ? 'Add version' : 'Upload song')}</Button>
            </>
          )}
        </div>
      </div>

      {!remote && <p className="notice">Local mode: the audio file plays for this session only. With the Supabase backend it is stored for the whole team.</p>}

      {track ? (
        <section className="panel player">
          <audio ref={audioRef} src={url} preload="metadata" />
          <Waveform peaks={track.peaks} duration={track.duration} time={time} sections={sections} onSeek={seek} active={current?.id} />
          <div className="player-bar">
            <button className="play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
            <span className="player-time">{fmtTimeMs(time)} <span className="muted">/ {fmtTime(track.duration)}</span></span>
            <span className="player-now">{current ? <><span className="muted">now:</span> <strong>{current.name}</strong></> : null}</span>
            <div className="row-actions">
              {loop && <Button size="sm" variant="ghost" onClick={() => setLoop(null)}>Stop loop</Button>}
              {editable && <Confirm label="Remove track" onConfirm={() => removeTrack(track)} />}
            </div>
          </div>
          {editable && (
            <div className="track-meta small">
              <Input value={track.name} onChange={(e) => setMusic((m) => { const t = m.tracks.find((x) => x.id === track.id); if (t) t.name = e.target.value })} />
              <Select value={track.kind} onChange={(e) => setMusic((m) => { const t = m.tracks.find((x) => x.id === track.id); if (t) t.kind = e.target.value })} options={TRACK_KINDS} />
            </div>
          )}
        </section>
      ) : (
        <Empty title="Upload the song">MP3, M4A or WAV. The waveform is drawn here, then you mark the sections (intro, verses, choruses) with their times and lyrics, and tie each one to the setups that will cover it.</Empty>
      )}

      <div className="toolbar">
        <div className="toolbar-info"><strong>Song map</strong><span className="muted">Sections with times, lyrics and the setups that cover them</span></div>
        {editable && (
          <div className="toolbar-actions">
            {!sections.length && <Button variant="ghost" onClick={() => setPaste({ text: '' })}>Paste full lyrics</Button>}
            <Button variant="primary" onClick={addSection}>Add section</Button>
          </div>
        )}
      </div>

      {!sections.length ? (
        <Empty title="No sections yet">Paste the whole lyric once and it is split into sections by the blank lines, then fix the times while the track plays. Or add sections one by one.</Empty>
      ) : (
        <ol className="song-map">
          {sections.map((s) => {
            const setups = (s.sceneIds || []).map((id) => project.scenes.find((x) => x.id === id)).filter(Boolean)
            return (
              <li key={s.id} className={`song-sec ${current?.id === s.id ? 'now' : ''} ${loop === s.id ? 'loop' : ''}`} onMouseEnter={() => setActiveSec(s.id)} onMouseLeave={() => setActiveSec('')}>
                <div className="song-sec-head">
                  <button className="song-time" onClick={() => track && playSection(s)} title="Play from here">▶ {fmtTime(s.start)}</button>
                  <strong className="song-name">{s.name}</strong>
                  <span className="muted small">{fmtTime(s.start)} to {fmtTime(s.end)} · {Math.round(s.end - s.start)}s</span>
                  <span className="grow" />
                  {editable && track && (
                    <span className="row-actions song-marks no-print">
                      <button onClick={() => quickMark(s, 'start')} title="Set start to the playhead">start = {fmtTimeMs(time)}</button>
                      <button onClick={() => quickMark(s, 'end')} title="Set end to the playhead">end = {fmtTimeMs(time)}</button>
                    </span>
                  )}
                  {track && <button className="link small" onClick={() => { setLoop(loop === s.id ? null : s.id); if (loop !== s.id) { seek(s.start); audioRef.current?.play() } }}>{loop === s.id ? 'looping' : 'loop'}</button>}
                  {editable && <button className="link small" onClick={() => openSection(s)}>Edit</button>}
                  {editable && <Confirm label="Delete" onConfirm={() => setMusic((m) => (m.sections = m.sections.filter((x) => x.id !== s.id)))}>×</Confirm>}
                </div>
                {s.lyrics && <pre className="song-lyrics">{s.lyrics}</pre>}
                <div className="song-setups small">
                  {setups.length ? setups.map((x) => <span key={x.id} className="pill">Sc. {x.number} · {x.location || x.heading}</span>) : <span className="muted">No setup yet</span>}
                  {s.notes && <span className="muted"> · {s.notes}</span>}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {draft && (
        <Modal open wide title={music.sections.some((s) => s.id === draft.id) ? `Edit ${draft.name}` : 'New section'} onClose={() => setDraft(null)}
          footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveSection}>Save section</Button></>}>
          <div className="stack">
            <div className="row-3">
              <Field label="Name"><Input list="secnames" autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><datalist id="secnames">{SECTION_NAMES.map((n) => <option key={n} value={n} />)}</datalist></Field>
              <Field label="Start" hint="m:ss.t">
                <div className="row-actions"><Input value={draft.startText} onChange={(e) => setDraft({ ...draft, startText: e.target.value })} />{track && <Button size="sm" variant="ghost" onClick={() => markNow('startText')}>now</Button>}</div>
              </Field>
              <Field label="End" hint="m:ss.t">
                <div className="row-actions"><Input value={draft.endText} onChange={(e) => setDraft({ ...draft, endText: e.target.value })} />{track && <Button size="sm" variant="ghost" onClick={() => markNow('endText')}>now</Button>}</div>
              </Field>
            </div>
            <Field label="Lyrics"><Textarea rows={6} value={draft.lyrics} onChange={(e) => setDraft({ ...draft, lyrics: e.target.value })} placeholder="The words sung in this section" /></Field>
            <Field label="Setups that cover this section" hint="From the Breakdown. Hold Ctrl or Cmd to pick several.">
              <select multiple className="input multi" value={draft.sceneIds} onChange={(e) => setDraft({ ...draft, sceneIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
                {project.scenes.map((x) => <option key={x.id} value={x.id}>{x.number} · {x.location || x.heading}</option>)}
              </select>
              {!project.scenes.length && <div className="muted small">No setups yet. Run the breakdown from the treatment first.</div>}
            </Field>
            <Field label="Notes"><Input value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Performance to camera, playback at 100%, slow motion 50fps" /></Field>
          </div>
        </Modal>
      )}

      {paste && (
        <Modal open wide title="Paste the full lyrics" onClose={() => setPaste(null)}
          footer={<><Button variant="ghost" onClick={() => setPaste(null)}>Cancel</Button><Button variant="primary" onClick={fromPaste}>Create sections</Button></>}>
          <div className="stack">
            <p className="small muted">Leave a blank line between sections (verse, chorus…). Each block becomes a section with a provisional time; you fix the times while the song plays.</p>
            <Textarea rows={14} autoFocus value={paste.text} onChange={(e) => setPaste({ text: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  )
}
