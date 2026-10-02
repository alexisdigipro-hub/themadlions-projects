import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Modal, useToast } from '../../components/ui.jsx'
import { ProjectForm } from '../Dashboard.jsx'
import { useProject } from '../Project.jsx'
import { can, uid, useStore } from '../../lib/store.jsx'
import { fmtDate, fmtLong } from '../../lib/dates.js'
import { projectProgress } from '../../lib/progress.js'
import { compress } from '../../lib/photos.js'
import { analyze, fmtTime, trackUrl, uploadTrack } from '../../lib/audio.js'
import { needsEncoding, toMp3 } from '../../lib/mp3.js'
import { remote } from '../../lib/supabase.js'
import Tasks from './Tasks.jsx'

const emptyMusic = () => ({ tracks: [], activeTrackId: '', sections: [], notes: '' })

/* Just a track to upload and listen to, here on Overview — no waveform, sections or lyrics, that
   full editor lives on the Script tab now. Writes to the same project.music.tracks the Script
   page's song map reads, so a track added here shows up there too, and the other way round. */
function SongPlayer({ project, edit, editable }) {
  const toast = useToast()
  const music = { ...emptyMusic(), ...(project.music || {}) }
  const track = music.tracks.find((t) => t.id === music.activeTrackId) || music.tracks[0]
  const fileRef = useRef()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    let alive = true
    trackUrl(track).then((u) => alive && setUrl(u))
    return () => { alive = false }
  }, [track?.id, track?.path])

  const setMusic = (fn) => edit((p) => { p.music = { ...emptyMusic(), ...(p.music || {}) }; fn(p.music) })

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
      const { path, ext } = await uploadTrack({ projectId: project.id, id, file })
      setMusic((m) => {
        m.tracks.push({ id, name: file.name.replace(/\.[^.]+$/, ''), path, ext, duration, peaks, bytes: file.size, kind: m.tracks.length ? 'other' : 'master', addedAt: new Date().toISOString() })
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

  return (
    <section className="panel">
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
          <audio controls src={url} style={{ width: '100%' }} />
          <span className="muted small">{track.name} · {fmtTime(track.duration)}</span>
        </div>
      )}
    </section>
  )
}

export default function Overview() {
  const { project, edit, canEdit, user } = useProject()
  const { state } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState(null)

  const { pct, stages } = projectProgress(project, state.settings)
  const coverRef = useRef()
  const setCover = async (file) => {
    if (!file) return
    try {
      const c = await compress(file, { max: 1200, quality: 0.8, thumb: 640 })
      edit((p) => { p.coverThumb = c.thumb })
    } catch (e) { /* ignored */ }
  }

  return (
    <div className="overview">
      <section className="panel progress">
        <div className="progress-head">
          <div className="progress-cover">
            {project.coverThumb ? <img src={project.coverThumb} alt="" /> : <span className="progress-cover-empty" style={{ background: project.color }} />}
            {canEdit('projects') && (
              <>
                <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => setCover(e.target.files?.[0])} />
                <button className="link small" onClick={() => coverRef.current?.click()}>{project.coverThumb ? 'Change cover' : 'Add cover'}</button>
              </>
            )}
          </div>
          <div className="progress-main">
            <div className="progress-top">
              <span>
                <strong>{pct}% done</strong> <span className="muted small">{project.status}{project.endDate ? ` · delivery ${fmtDate(project.endDate)}` : ''}{project.frozen ? ' · 🔒 locked' : ''}</span>
              </span>
              <span className="row-actions">
                {canEdit('projects') && (
                  <button className="link small" onClick={() => setDraft({ ...project })}>Edit details</button>
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
            {(project.client || project.director || project.producer || project.startDate || project.endDate || project.notes) && (
              <div className="progress-details">
                <dl className="details">
                  {project.client && (
                    <>
                      <dt>Client</dt>
                      <dd>{project.client}</dd>
                    </>
                  )}
                  {project.director && (
                    <>
                      <dt>Director</dt>
                      <dd>{project.director}</dd>
                    </>
                  )}
                  {project.producer && (
                    <>
                      <dt>Producer</dt>
                      <dd>{project.producer}</dd>
                    </>
                  )}
                  {project.startDate && (
                    <>
                      <dt>Start</dt>
                      <dd>{fmtLong(project.startDate)}</dd>
                    </>
                  )}
                  {project.endDate && (
                    <>
                      <dt>Delivery</dt>
                      <dd>{fmtLong(project.endDate)}</dd>
                    </>
                  )}
                </dl>
                {project.notes && <p className="notes-text">{project.notes}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      {project.category === 'Music Video' && can(user, 'music') && <SongPlayer project={project} edit={edit} editable={canEdit('music')} />}

      {can(user, 'tasks') && (
        <section className="panel">
          <Tasks />
        </section>
      )}

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
