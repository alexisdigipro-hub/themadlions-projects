import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'
import { download } from '../../lib/dates.js'

export const SHOT_SIZES = ['EWS', 'WS', 'FS', 'MWS', 'MS', 'MCU', 'CU', 'ECU', 'Insert', 'OTS', 'POV', 'Two shot', 'Establishing']
export const ANGLES = ['Eye level', 'Low', 'High', 'Dutch', 'Overhead', 'Worm', 'Profile', 'Frontal', 'Three-quarter']
export const MOVEMENTS = ['Static', 'Pan', 'Tilt', 'Push in', 'Pull out', 'Dolly', 'Track', 'Steadicam', 'Handheld', 'Crane', 'Drone', 'Zoom', 'Whip pan', 'Rack focus']
export const GEAR = ['Tripod', 'Slider', 'Dolly', 'Steadicam', 'Gimbal', 'Handheld', 'Crane', 'Jib', 'Drone', 'Car mount', 'Underwater', 'Probe lens']
const STATUS = ['planned', 'shot', 'skipped']

const emptyShot = (sceneId, n) => ({
  id: uid(), sceneId, number: n, size: 'MS', angle: 'Eye level', movement: 'Static', lens: '', camera: 'A', fps: '25',
  gear: 'Tripod', description: '', subject: '', audio: '', duration: '', status: 'planned', notes: '', frame: '', frameUrl: '',
})

// Downscale a picked image to a small JPEG data URL so storyboard frames fit in local storage.
function fileToFrame(file, max = 560) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => reject(new Error('Could not read that image.'))
    img.src = url
  })
}

const nextLetter = (existing) => {
  const used = new Set(existing.map((s) => String(s.number).replace(/^\d+/, '')))
  for (let i = 0; i < 26; i++) {
    const l = String.fromCharCode(65 + i)
    if (!used.has(l)) return l
  }
  return String(existing.length + 1)
}

export default function Shots() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const editable = canEdit('shots')
  const shots = project.shots || []
  const [sceneId, setSceneId] = useState(project.scenes[0]?.id || '')
  const [draft, setDraft] = useState(null)
  const [view, setView] = useState('list') // list | board
  const scene = project.scenes.find((s) => s.id === sceneId) || project.scenes[0]
  const sceneShots = useMemo(() => shots.filter((s) => s.sceneId === scene?.id), [shots, scene])
  const countBy = useMemo(() => {
    const m = {}
    shots.forEach((s) => (m[s.sceneId] = (m[s.sceneId] || 0) + 1))
    return m
  }, [shots])

  if (!project.scenes.length) {
    return (
      <Empty title="No scenes to plan shots for">
        Run scene detection in <Link to="../breakdown">Breakdown</Link> first. Shots are planned per scene.
      </Empty>
    )
  }

  const save = () => {
    if (!draft.description.trim() && !draft.subject.trim()) return toast('Describe the shot.', 'error')
    edit((p) => {
      p.shots = p.shots || []
      const i = p.shots.findIndex((s) => s.id === draft.id)
      if (i >= 0) p.shots[i] = draft
      else p.shots.push(draft)
    })
    setDraft(null)
    toast('Shot saved', 'ok')
  }
  const remove = (id) => edit((p) => (p.shots = (p.shots || []).filter((s) => s.id !== id)))
  const duplicate = (s) => edit((p) => {
    const copy = { ...s, id: uid(), number: `${scene.number}${nextLetter(sceneShots)}`, status: 'planned' }
    p.shots.push(copy)
  })
  const move = (idx, dir) => edit((p) => {
    const ids = p.shots.filter((s) => s.sceneId === scene.id).map((s) => s.id)
    const j = idx + dir
    if (j < 0 || j >= ids.length) return
    const a = p.shots.findIndex((s) => s.id === ids[idx]), b = p.shots.findIndex((s) => s.id === ids[j])
    ;[p.shots[a], p.shots[b]] = [p.shots[b], p.shots[a]]
  })
  const setStatus = (id, status) => edit((p) => {
    const s = p.shots.find((x) => x.id === id)
    if (s) s.status = status
  })

  const exportCSV = () => {
    const head = ['Scene', 'Shot', 'Size', 'Angle', 'Movement', 'Gear', 'Lens', 'Camera', 'FPS', 'Subject', 'Description', 'Audio', 'Est. duration', 'Status', 'Notes']
    const rows = project.scenes.flatMap((sc) =>
      shots.filter((s) => s.sceneId === sc.id).map((s) => [sc.number, s.number, s.size, s.angle, s.movement, s.gear, s.lens, s.camera, s.fps, s.subject, s.description, s.audio, s.duration, s.status, s.notes]),
    )
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    download(`${project.title} - shot list.csv`, csv, 'text/csv')
  }

  const done = sceneShots.filter((s) => s.status === 'shot').length

  return (
    <div className="shots">
      <div className="toolbar no-print">
        <div className="toolbar-info">
          <strong>{shots.length} shots</strong>
          <span className="muted">
            {project.scenes.filter((s) => countBy[s.id]).length} of {project.scenes.length} scenes planned · {shots.filter((s) => s.status === 'shot').length} shot
          </span>
        </div>
        <div className="toolbar-actions">
          <div className="segmented small">
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
            <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>Storyboard</button>
          </div>
          {shots.length > 0 && (
            <Button variant="ghost" onClick={exportCSV}>Export CSV</Button>
          )}
          {shots.length > 0 && (
            <Button variant="ghost" onClick={() => window.print()}>Print</Button>
          )}
          {editable && (
            <Button variant="primary" onClick={() => setDraft(emptyShot(scene.id, `${scene.number}${nextLetter(sceneShots)}`))}>
              Add shot
            </Button>
          )}
        </div>
      </div>

      <div className="shots-layout">
        <ul className="scene-rail no-print">
          {project.scenes.map((s) => (
            <li key={s.id}>
              <button className={s.id === scene.id ? 'on' : ''} onClick={() => setSceneId(s.id)}>
                <span className="num">{s.number}</span>
                <span className="name">{s.location || s.heading}</span>
                <span className="cnt">{countBy[s.id] || ''}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="shots-main">
          <div className="shots-scene-head">
            <h2>
              Sc. {scene.number} <span className="muted">{scene.heading}</span>
            </h2>
            <span className="muted small">{scene.synopsis}</span>
            {sceneShots.length > 0 && (
              <span className="muted small">{done}/{sceneShots.length} shot</span>
            )}
          </div>

          {!sceneShots.length ? (
            <Empty title="No shots for this scene yet">Add the coverage: master, singles, inserts. Each shot can carry a storyboard frame.</Empty>
          ) : view === 'list' ? (
            <>
            <ul className="shot-cards mob-only">
              {sceneShots.map((s, i) => (
                <li key={s.id} className={`shot-card ${s.status}`}>
                  <div className="shot-card-head">
                    <strong>{s.number}</strong>
                    <span>{s.size} · {s.angle} · {s.movement}</span>
                    {editable ? (
                      <select className="input select tiny" value={s.status} onChange={(e) => setStatus(s.id, e.target.value)}>
                        {STATUS.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    ) : <span className="muted">{s.status}</span>}
                  </div>
                  <div>{s.subject && <strong>{s.subject}. </strong>}{s.description}</div>
                  <div className="muted small">{[s.gear, s.lens && `${s.lens}mm`, s.camera && `Cam ${s.camera}`, s.duration].filter(Boolean).join(' · ')}</div>
                  {editable && (
                    <div className="row-actions">
                      <button onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                      <button onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                      <button onClick={() => setDraft({ ...s })}>Edit</button>
                      <button onClick={() => duplicate(s)}>Copy</button>
                      <Confirm onConfirm={() => remove(s.id)} label="Delete">×</Confirm>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="table-wrap desk-only">
              <table className="table shots-table">
                <thead>
                  <tr>
                    <th>Shot</th><th>Size</th><th>Angle</th><th>Move</th><th>Gear / lens</th><th>Description</th><th>Dur.</th><th>Status</th>{editable && <th />}
                  </tr>
                </thead>
                <tbody>
                  {sceneShots.map((s, i) => (
                    <tr key={s.id} className={s.status === 'skipped' ? 'dim' : ''}>
                      <td><strong>{s.number}</strong>{s.frame && <span className="muted small"> ◧</span>}</td>
                      <td>{s.size}</td>
                      <td>{s.angle}</td>
                      <td>{s.movement}</td>
                      <td>{[s.gear, s.lens && `${s.lens}mm`, s.camera && `Cam ${s.camera}`, s.fps && s.fps !== '25' && `${s.fps}fps`].filter(Boolean).join(' · ')}</td>
                      <td>
                        {s.subject && <strong>{s.subject}. </strong>}{s.description}
                        {s.notes && <div className="muted small">{s.notes}</div>}
                      </td>
                      <td>{s.duration}</td>
                      <td>
                        {editable ? (
                          <select className="input select tiny" value={s.status} onChange={(e) => setStatus(s.id, e.target.value)}>
                            {STATUS.map((x) => <option key={x}>{x}</option>)}
                          </select>
                        ) : s.status}
                      </td>
                      {editable && (
                        <td className="row-actions no-print">
                          <button onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                          <button onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                          <button onClick={() => setDraft({ ...s })}>Edit</button>
                          <button onClick={() => duplicate(s)}>Copy</button>
                          <Confirm onConfirm={() => remove(s.id)} label="Delete">×</Confirm>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <div className="board-grid">
              {sceneShots.map((s) => (
                <figure key={s.id} className={`frame ${s.status}`} onClick={() => editable && setDraft({ ...s })}>
                  <div className="frame-img">
                    {s.frame || s.frameUrl ? <img src={s.frame || s.frameUrl} alt="" /> : <span className="muted">no frame</span>}
                  </div>
                  <figcaption>
                    <strong>{s.number}</strong> {s.size} · {s.movement}
                    <div className="small">{s.subject && `${s.subject}. `}{s.description}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* print: every scene with its shots */}
      <div className="print-only shots-print">
        <h1>{project.title} · Shot list</h1>
        {project.scenes.filter((sc) => countBy[sc.id]).map((sc) => (
          <section key={sc.id}>
            <h3>Sc. {sc.number} {sc.heading}</h3>
            <table className="table">
              <thead><tr><th>Shot</th><th>Size</th><th>Angle</th><th>Move</th><th>Gear / lens</th><th>Description</th><th>Dur.</th></tr></thead>
              <tbody>
                {shots.filter((s) => s.sceneId === sc.id).map((s) => (
                  <tr key={s.id}><td>{s.number}</td><td>{s.size}</td><td>{s.angle}</td><td>{s.movement}</td><td>{[s.gear, s.lens && `${s.lens}mm`].filter(Boolean).join(' · ')}</td><td>{s.subject && `${s.subject}. `}{s.description}</td><td>{s.duration}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {draft && <ShotModal draft={draft} setDraft={setDraft} onSave={save} onClose={() => setDraft(null)} scenes={project.scenes} />}
    </div>
  )
}

function ShotModal({ draft, setDraft, onSave, onClose, scenes }) {
  const toast = useToast()
  const fileRef = useRef()
  const set = (k, v) => setDraft({ ...draft, [k]: v })
  const pick = async (file) => {
    if (!file) return
    try {
      set('frame', await fileToFrame(file))
    } catch (e) {
      toast(e.message, 'error')
    }
  }
  return (
    <Modal
      open
      wide
      title={`Shot ${draft.number}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSave}>Save shot</Button>
        </>
      }
    >
      <div className="row-3">
        <Field label="Shot number"><Input value={draft.number} onChange={(e) => set('number', e.target.value)} /></Field>
        <Field label="Scene">
          <Select value={draft.sceneId} onChange={(e) => set('sceneId', e.target.value)} options={scenes.map((s) => [s.id, `${s.number} · ${s.location || s.heading}`])} />
        </Field>
        <Field label="Status"><Select value={draft.status} onChange={(e) => set('status', e.target.value)} options={STATUS} /></Field>
      </div>
      <div className="row-3">
        <Field label="Size"><Select value={draft.size} onChange={(e) => set('size', e.target.value)} options={SHOT_SIZES} /></Field>
        <Field label="Angle"><Select value={draft.angle} onChange={(e) => set('angle', e.target.value)} options={ANGLES} /></Field>
        <Field label="Movement"><Select value={draft.movement} onChange={(e) => set('movement', e.target.value)} options={MOVEMENTS} /></Field>
      </div>
      <div className="row-3">
        <Field label="Gear"><Select value={draft.gear} onChange={(e) => set('gear', e.target.value)} options={GEAR} /></Field>
        <Field label="Lens (mm)"><Input value={draft.lens} onChange={(e) => set('lens', e.target.value)} placeholder="35" inputMode="numeric" /></Field>
        <div className="row-2">
          <Field label="Camera"><Input value={draft.camera} onChange={(e) => set('camera', e.target.value)} placeholder="A" /></Field>
          <Field label="FPS"><Input value={draft.fps} onChange={(e) => set('fps', e.target.value)} placeholder="25" inputMode="numeric" /></Field>
        </div>
      </div>
      <Field label="Subject"><Input value={draft.subject} onChange={(e) => set('subject', e.target.value)} placeholder="ELENI at the steel door" /></Field>
      <Field label="Description"><Textarea rows={2} value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Slow push in as she pulls the door shut. Hold on her face." /></Field>
      <div className="row-3">
        <Field label="Audio"><Input value={draft.audio} onChange={(e) => set('audio', e.target.value)} placeholder="Sync, MOS, playback" /></Field>
        <Field label="Est. duration"><Input value={draft.duration} onChange={(e) => set('duration', e.target.value)} placeholder="0:08" /></Field>
        <Field label="Notes"><Input value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Needs rain rig" /></Field>
      </div>
      <Field label="Storyboard frame" hint="Upload a sketch or still (stored small, in this browser) or paste an image link.">
        <div className="frame-pick">
          {(draft.frame || draft.frameUrl) && <img src={draft.frame || draft.frameUrl} alt="" />}
          <div className="stack">
            <input ref={fileRef} type="file" accept="image/*" className="hidden-input" onChange={(e) => pick(e.target.files?.[0])} />
            <Button size="sm" onClick={() => fileRef.current?.click()}>Upload image</Button>
            <Input value={draft.frameUrl} onChange={(e) => set('frameUrl', e.target.value)} placeholder="https://…/frame.jpg" />
            {(draft.frame || draft.frameUrl) && (
              <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, frame: '', frameUrl: '' })}>Remove frame</Button>
            )}
          </div>
        </div>
      </Field>
    </Modal>
  )
}
