import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Modal, useToast } from '../../components/ui.jsx'
import { ProjectForm } from '../Dashboard.jsx'
import { useProject } from '../Project.jsx'
import { can, nextProjectCode, uid, useStore } from '../../lib/store.jsx'
import { duplicateProject } from '../../lib/duplicate.js'
import { fmtDate } from '../../lib/dates.js'
import { projectProgress } from '../../lib/progress.js'
import { useCover } from '../../components/CoverCropper.jsx'
import { analyze, fmtTime, fmtTimeMs, uploadTrack } from '../../lib/audio.js'
import { useTrackSource } from '../../lib/trackSource.js'
import { pcloudTarget } from '../../lib/pcloud.js'
import { needsEncoding, toMp3 } from '../../lib/mp3.js'
import { remote } from '../../lib/supabase.js'
import Tasks, { tasksFor } from './Tasks.jsx'
import { Waveform } from './Music.jsx'
import Notes from './Notes.jsx'
import CallSheets from './CallSheets.jsx'

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

  const onFile = async (file) => {
    if (!file) return
    const original = file
    try {
      if (needsEncoding(file)) {
        setBusy('Converting to MP3… 0%')
        file = await toMp3(file, (pct) => setBusy(`Converting to MP3… ${Math.round(pct * 100)}%`))
      }
      setBusy('Analysing…')
      const { peaks, duration } = await analyze(file)
      const id = uid()
      setBusy('Uploading…')
      const { path, ext, fileid, scope } = await uploadTrack({ projectId: project.id, id, file, pcloud: pcloudTarget(state, project.id, 'Music') })
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
    return editable ? <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" hidden onChange={(e) => onFile(e.target.files?.[0])} /> : null
  }

  return (
    <section className="panel song-card">
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
    </section>
  )
}

export default function Overview() {
  const { project, edit, canEdit, user } = useProject()
  const [ordinoOpen, setOrdinoOpen] = useState(false)
  // the ordino's days, and the one to name on the button: the next to come, else the last
  const ordinoDays = [...(project.shootingDays || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
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
  // Alex: an empty Tasks / Song / Links / Production notes panel is just a box saying nothing.
  // Each one keeps quiet until it has something in it, and its button lives in one row up here
  // instead. Pressing a button bumps a counter the panel watches, so it opens its own form.
  const [start, setStart] = useState({ task: 0, song: 0, link: 0, notes: 0 })
  const begin = (k) => setStart((s0) => ({ ...s0, [k]: s0[k] + 1 }))
  const isMusicVideo = project.category === 'Music Video'
  const hasSong = !!(project.music?.tracks || []).length
  const adds = [
    can(user, 'tasks') && canEdit('tasks') && !tasksFor(project.tasks || [], user).length && ['task', 'Add task'],
    isMusicVideo && can(user, 'music') && canEdit('music') && !hasSong && ['song', 'Upload song'],
    can(user, 'files') && canEdit('files') && !(project.links || []).length && ['link', 'Add link'],
    can(user, 'files') && canEdit('files') && !(project.productionNotes || '').trim() && ['notes', 'Add notes'],
  ].filter(Boolean)
  const coverRef = useRef()
  const cover = useCover({ value: project, projectId: project.id, keepSource: true, onChange: (patch) => edit((p) => { Object.assign(p, patch) }) })

  return (
    <div className="overview">
      <section className="panel progress">
        <div className="progress-head">
          <div className="progress-cover">
            {project.coverThumb ? <img src={project.coverThumb} alt="" /> : <span className="progress-cover-empty" style={{ background: project.color }} />}
            {canEdit('projects') && (
              <>
                <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { cover.pick(e.target.files?.[0]); e.target.value = '' }} />
                <span className="cover-links">
                  <button className="link small" onClick={() => coverRef.current?.click()}>{project.coverThumb ? 'Change' : 'Add cover'}</button>
                  {project.coverThumb && <button className="link small" onClick={cover.adjust}>Adjust</button>}
                </span>
                {cover.modal}
              </>
            )}
          </div>
          <div className="progress-main">
            <div className="progress-top">
              <span>
                <strong>{pct}% done</strong> <span className="muted small">{project.status}{project.endDate ? ` · delivery ${fmtDate(project.endDate)}` : ''}{project.frozen ? ' · 🔒 locked' : ''}</span>
              </span>
              <span className="row-actions progress-actions">
                {canEdit('projects') && (
                  <button className="link small" onClick={() => setDraft({ ...project })}>Edit details</button>
                )}
                {can(user, 'projects', 'edit') && (
                  <button className="link small" disabled={duping} onClick={duplicate}>{duping ? 'Copying…' : 'Duplicate'}</button>
                )}
                {user?.role === 'admin' && (
                  <button className="link small" onClick={() => { edit((p) => { p.frozen = !p.frozen }); toast(project.frozen ? 'Project unlocked, the team can edit again' : 'Project locked: only administrators can change it now', 'ok') }}>
                    {project.frozen ? 'Unlock' : 'Lock project'}
                  </button>
                )}
              </span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
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
                    <Link to={`../${st.to}`}>
                      <span className="stage-dot" />
                      <span className="stage-label">{st.label}</span>
                      <span className="stage-pct muted small">{st.done >= 1 ? '✓' : st.done > 0 ? `${Math.round(st.done * 100)}%` : ''}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {adds.length > 0 && (
        <div className="add-bar">
          {adds.map(([k, label]) => (
            <Button key={k} variant="ghost" onClick={() => begin(k)}>{label}</Button>
          ))}
        </div>
      )}

      {/* the song first, above the ordino (Alex, 10 Oct) */}
      {isMusicVideo && can(user, 'music') && <SongPlayer project={project} edit={edit} editable={canEdit('music')} hideEmpty startSignal={start.song} />}

      {/* The ordino as one glass button the height of the song box, for everyone on the project,
          administrators too (Alex, 10 Oct); it opens the finished ordino as the crew get it on a phone */}
      {ordinoDays.length > 0 && (
        // the project's cover, very faint, behind the glass (Alex, 10 Oct)
        <button type="button" className={`ordino-btn${project.coverThumb ? ' has-cover' : ''}`} style={project.coverThumb ? { '--ordino-cover': `url("${project.coverThumb}")` } : undefined} onClick={() => setOrdinoOpen(true)}>
          <span className="ordino-btn-ico" aria-hidden="true">🎬</span>
          <span className="ordino-btn-text">
            <strong>Ordino</strong>
            <span>{[nextOrdino.date && new Date(nextOrdino.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), nextOrdino.callTime && `call ${nextOrdino.callTime}`, ordinoDays.length > 1 && `${ordinoDays.length} days`].filter(Boolean).join(' · ')}</span>
          </span>
          <span className="ordino-btn-go" aria-hidden="true">›</span>
        </button>
      )}
      <Modal open={ordinoOpen} title="Ordino" onClose={() => setOrdinoOpen(false)}>
        {ordinoOpen && <div className="ordino-modal"><CallSheets linkOnly /></div>}
      </Modal>

      {can(user, 'tasks') && <Tasks hideEmpty startSignal={start.task} />}


      {/* Files & Notes used to be its own tab; links and production notes moved here, Files was dropped */}
      {can(user, 'files') && <Notes hideEmpty startLink={start.link} startNotes={start.notes} />}

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
                edit((p) => Object.assign(p, draft))
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
