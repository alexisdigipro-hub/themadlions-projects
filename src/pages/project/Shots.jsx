import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { can, uid, useCurrentUser, useStore } from '../../lib/store.jsx'
import { download } from '../../lib/dates.js'
import { publishShare, shotlistUrl, tokenOf } from '../../lib/shares.js'
import { mailLink, waShareLink } from '../../lib/share.js'
import ShotListDesigner from '../../components/ShotListDesigner.jsx'
import ShotDay from '../../components/ShotDay.jsx'
import { ZOOM } from '../../lib/callsheetLayout.js'
import { accentOf, cellText, colTitle, dayPlan, optionsWith, shotLayoutOf, timeline, toHHMM } from '../../lib/shotLayout.js'

const STATUS = ['planned', 'shot', 'skipped']

const emptyShot = (sceneId, n, layout) => ({
  id: uid(), sceneId, number: n, size: layout.lists.size.includes('MS') ? 'MS' : layout.lists.size[0] || '', angle: layout.lists.angle[0] || '', movement: layout.lists.movement[0] || '', lens: '', camera: 'A', fps: '25',
  gear: layout.lists.gear[0] || '', description: '', subject: '', audio: '', duration: '', status: 'planned', notes: '', frame: '', frameUrl: '',
  setupMin: '', shootMin: '', custom: {},
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

// A setup built by hand in the shot list, with no script or breakdown behind it.
const manualScene = (n) => ({
  id: uid(), number: String(n), heading: `SETUP ${n}`, intExt: 'EXT', location: '', timeOfDay: '',
  synopsis: '', body: '', characters: [], elements: {}, flags: [], notes: '', dayId: '', eighths: 4,
  order: n - 1, source: 'manual',
})

export default function Shots() {
  const { project, edit, canEdit } = useProject()
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const editable = canEdit('shots')
  const canShare = can(user, 'share', 'edit')
  const layout = shotLayoutOf(project, state)
  const [designing, setDesigning] = useState(false)
  const [share, setShare] = useState(null) // { busy } | { url, what } | { error }
  const [dayId, setDayId] = useState('')
  const shots = project.shots || []
  const [sceneId, setSceneId] = useState(project.scenes[0]?.id || '')
  const [draft, setDraft] = useState(null)
  const [view, setView] = useState('list') // list | board | day
  const [quick, setQuick] = useState('')
  const scene = project.scenes.find((s) => s.id === sceneId) || project.scenes[0]

  // Build a shot list from nothing: add setups by hand, no breakdown needed.
  const addScene = () => {
    const s = manualScene((project.scenes?.length || 0) + 1)
    edit((p) => {
      p.scenes = [...(p.scenes || []), s]
      if (!p.breakdownStatus || p.breakdownStatus === 'none') p.breakdownStatus = 'manual'
    })
    setSceneId(s.id)
    return s
  }
  const renameScene = (v) => edit((p) => {
    const s = p.scenes.find((x) => x.id === scene.id)
    if (!s) return
    s.location = v
    s.heading = v ? v.toUpperCase() : `SETUP ${s.number}`
  })
  const sceneShots = useMemo(() => shots.filter((s) => s.sceneId === scene?.id), [shots, scene])
  const countBy = useMemo(() => {
    const m = {}
    shots.forEach((s) => (m[s.sceneId] = (m[s.sceneId] || 0) + 1))
    return m
  }, [shots])

  if (!project.scenes.length) {
    return (
      <Empty
        title="No shot list yet"
        action={editable && <Button variant="primary" onClick={addScene}>Add first setup</Button>}
      >
        <>
          Start it by hand: add a setup and put its shots under it. Or build the setups automatically from a script,
          a treatment or pasted text in <Link to="../script">Script &amp; Breakdown</Link>.
        </>
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
  // Type a line, press Enter, the shot is in the list. Details can be filled in later.
  const quickAdd = () => {
    const v = quick.trim()
    if (!v) return
    edit((p) => {
      p.shots = p.shots || []
      const existing = p.shots.filter((s) => s.sceneId === scene.id)
      p.shots.push({ ...emptyShot(scene.id, `${scene.number}${nextLetter(existing)}`, layout), description: v })
    })
    setQuick('')
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
    const cols = layout.columns.filter((c) => c.key !== 'frame')
    const head = ['Scene', ...cols.map(colTitle)]
    const rows = project.scenes.flatMap((sc) =>
      shots.filter((s) => s.sceneId === sc.id).map((s) => [sc.number, ...cols.map((c) => cellText(s, c.key))]),
    )
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    download(`${project.title} - shot list.csv`, csv, 'text/csv')
  }

  // The layout is saved whole on the project the first time anything in it changes.
  const setLayout = (fn) => edit((p) => { p.shotLayout = fn(shotLayoutOf(p, state)) })
  const makeDefault = () => {
    update((st) => { st.settings = { ...st.settings, shotLayout: layout }; return st })
    toast('Every project without its own layout now uses this one', 'ok')
  }
  const resetLayout = () => edit((p) => { delete p.shotLayout })

  const accent = accentOf(layout, project)
  const screenCols = layout.columns.filter((c) => c.screen)
  const printCols = layout.columns.filter((c) => c.print)
  const has = (cols, k) => cols.some((c) => c.key === k)
  const cell = (s, c, cols, live) => {
    switch (c.key) {
      case 'number': return <><strong>{s.number}</strong>{(s.frame || s.frameUrl) && !has(cols, 'frame') && <span className="muted small"> ◧</span>}</>
      case 'frame': return s.frame || s.frameUrl ? <img className="shot-thumb" src={s.frame || s.frameUrl} alt="" /> : null
      case 'description':
        return (
          <>
            {!has(cols, 'subject') && s.subject && <strong>{s.subject}. </strong>}{s.description}
            {!has(cols, 'notes') && s.notes && <div className="muted small">{s.notes}</div>}
          </>
        )
      case 'status':
        return live && editable ? (
          <select className="input select tiny" value={s.status} onChange={(e) => setStatus(s.id, e.target.value)}>
            {STATUS.map((x) => <option key={x}>{x}</option>)}
          </select>
        ) : s.status
      default: return cellText(s, c.key)
    }
  }
  const wide = (k) => k === 'description' || k === 'notes' || k === 'subject' || k.startsWith('f_')

  // What a link carries: only the columns switched on for it, nothing else of the shot.
  const linkShot = (s, cols) => ({
    id: s.id,
    status: s.status,
    frame: has(cols, 'frame') ? s.frame || s.frameUrl || '' : '',
    cells: cols.filter((c) => c.key !== 'frame').map((c) => cellText(s, c.key)),
  })
  const makeShare = async (what) => {
    setShare({ busy: true })
    try {
      const cols = layout.columns.filter((c) => c.link)
      const base = {
        project: { title: project.title, color: project.color, cover: project.coverThumb || '' },
        company: { name: state.workspace.name, logo: state.settings.logo || '' },
        columns: cols.filter((c) => c.key !== 'frame').map((c) => ({ key: c.key, title: colTitle(c) })),
        look: { theme: layout.look.linkTheme, size: layout.look.linkSize, accent },
      }
      let data, ref
      if (what === 'day') {
        const days = [...project.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
        const day = days.find((d) => d.id === dayId) || days[0]
        const tl = timeline(dayPlan(day, shots, project.scenes), day.callSheet?.shootingCall || day.callTime, layout)
        data = {
          ...base,
          mode: 'day',
          day: { index: days.indexOf(day) + 1, count: days.length, date: day.date, callTime: day.callTime, wrap: toHHMM(tl.end) },
          rows: tl.rows.map((r) => (r.shot
            ? { start: toHHMM(r.start), end: toHHMM(r.end), scene: r.scene?.number || '', ...linkShot(r.shot, cols) }
            : { start: toHHMM(r.start), end: toHHMM(r.end), label: r.label, min: r.len })),
        }
        ref = `shotlist:${project.id}:${day.id}`
      } else {
        data = {
          ...base,
          mode: 'list',
          scenes: project.scenes.filter((sc) => countBy[sc.id]).map((sc) => ({
            number: sc.number,
            heading: sc.source === 'manual' ? sc.location || sc.heading : sc.heading,
            shots: shots.filter((x) => x.sceneId === sc.id).map((x) => linkShot(x, cols)),
          })),
        }
        ref = `shotlist:${project.id}`
      }
      const url = await publishShare({ workspaceId: state.workspace.id, kind: 'shotlist', ref, data, userId: user?.id })
      setShare({ url: shotlistUrl(tokenOf(url)), what })
    } catch (e) {
      setShare({ error: e.message })
    }
  }
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('Copied', 'ok') } catch { toast('Could not copy', 'error') }
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
            <button className={view === 'day' ? 'on' : ''} onClick={() => setView('day')}>Shoot day</button>
          </div>
          {editable && <Button variant={designing ? 'primary' : 'default'} onClick={() => setDesigning(!designing)}>{designing ? 'Done' : 'Customise'}</Button>}
          {canShare && shots.length > 0 && <Button onClick={() => makeShare(view === 'day' ? 'day' : 'list')}>Share link</Button>}
          {shots.length > 0 && (
            <Button variant="ghost" onClick={exportCSV}>Export CSV</Button>
          )}
          {shots.length > 0 && (
            <Button variant="ghost" onClick={() => window.print()}>Print</Button>
          )}
          {editable && <Button onClick={addScene}>Add setup</Button>}
          {editable && (
            <Button variant="primary" onClick={() => setDraft(emptyShot(scene.id, `${scene.number}${nextLetter(sceneShots)}`, layout))}>
              Add shot
            </Button>
          )}
        </div>
      </div>

      {designing && editable && (
        <ShotListDesigner layout={layout} setLayout={setLayout} hasOwn={!!project.shotLayout} isAdmin={user?.role === 'admin'} onMakeDefault={makeDefault} onReset={resetLayout} />
      )}

      <Modal open={!!share} title={share?.what === 'day' ? 'Share the shoot day' : 'Share the shot list'} onClose={() => setShare(null)}>
        {share?.busy && <p className="muted">Preparing the link…</p>}
        {share?.error && <p className="error">{share.error}</p>}
        {share?.url && (
          <div className="stack">
            <p className="small muted">
              {share.what === 'day'
                ? 'The day in shooting order with planned times, as it stands now. Anyone with the link sees it on their phone, no login.'
                : 'Every scene with its shots, in the columns you switched on for the link. Anyone with the link sees it on their phone, no login.'}
              {' '}Sharing again after changes refreshes the same link.
            </p>
            <div className="share-link"><input className="input" readOnly value={share.url} onFocus={(e) => e.target.select()} /><Button variant="ghost" onClick={() => copy(share.url)}>Copy</Button></div>
            <div className="row-actions wrap">
              <a className="btn btn-primary" href={waShareLink(`${project.title} · Shot list\n${share.url}`)} target="_blank" rel="noreferrer">Send on WhatsApp</a>
              <a className="btn btn-ghost" href={mailLink({ subject: `${project.title} · Shot list`, body: share.url })}>Mail</a>
            </div>
          </div>
        )}
      </Modal>

      {view === 'day' ? (
        <ShotDay project={project} shots={shots} layout={layout} edit={edit} editable={editable} dayId={dayId} setDayId={setDayId} onOpenShot={(s) => setDraft({ ...s })} />
      ) : (
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
          {editable && (
            <li className="rail-add">
              <button onClick={addScene}>+ Add setup</button>
            </li>
          )}
        </ul>

        <div className="shots-main">
          <div className="shots-scene-head">
            {editable && scene.source === 'manual' ? (
              <h2>
                Sc. {scene.number}{' '}
                <Input
                  key={scene.id}
                  className="input sm inline-title"
                  defaultValue={scene.location}
                  placeholder="Name this setup"
                  onBlur={(e) => renameScene(e.target.value.trim())}
                  onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                />
              </h2>
            ) : (
              <h2>
                Sc. {scene.number} <span className="muted">{scene.heading}</span>
              </h2>
            )}
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
                  {screenCols.filter((c) => c.custom && cellText(s, c.key)).map((c) => <div key={c.key} className="small"><span className="muted">{colTitle(c)}:</span> {cellText(s, c.key)}</div>)}
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
              <table className={`table shots-table${accent ? ' sl-accented' : ''}`} style={accent ? { '--sl-accent': accent } : undefined}>
                <thead>
                  <tr>
                    {screenCols.map((c) => <th key={c.key}>{colTitle(c)}</th>)}{editable && <th />}
                  </tr>
                </thead>
                <tbody>
                  {sceneShots.map((s, i) => (
                    <tr key={s.id} className={s.status === 'skipped' ? 'dim' : ''}>
                      {screenCols.map((c) => <td key={c.key} className={wide(c.key) ? 'c-wide' : 'c-tight'}>{cell(s, c, screenCols, true)}</td>)}
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

          {editable && view === 'list' && (
            <div className="quick-add no-print">
              <Input
                value={quick}
                placeholder="Quick add: describe the shot, press Enter"
                onChange={(e) => setQuick(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && quickAdd()}
              />
              <Button onClick={quickAdd}>Add</Button>
              <span className="muted small">or use Add shot for size, lens, movement and a storyboard frame</span>
            </div>
          )}
        </div>
      </div>

      )}

      {/* print: every scene with its shots, in the columns switched on for paper */}
      {view !== 'day' && (
        <div className={`print-only shots-print${accent ? ' sl-accented' : ''}`} style={{ ...(accent ? { '--sl-accent': accent } : {}), ...(ZOOM[layout.look.printSize] !== 1 ? { zoom: ZOOM[layout.look.printSize] } : {}) }}>
          <h1>{project.title} · Shot list</h1>
          {project.scenes.filter((sc) => countBy[sc.id]).map((sc) => (
            <section key={sc.id}>
              <h3>Sc. {sc.number} {sc.heading}</h3>
              <table className="table">
                <thead><tr>{printCols.map((c) => <th key={c.key}>{colTitle(c)}</th>)}</tr></thead>
                <tbody>
                  {shots.filter((s) => s.sceneId === sc.id).map((s) => (
                    <tr key={s.id}>{printCols.map((c) => <td key={c.key} className={wide(c.key) ? 'c-wide' : 'c-tight'}>{cell(s, c, printCols, false)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}

      {draft && <ShotModal draft={draft} setDraft={setDraft} onSave={save} onClose={() => setDraft(null)} scenes={project.scenes} layout={layout} />}
    </div>
  )
}

function ShotModal({ draft, setDraft, onSave, onClose, scenes, layout }) {
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
        <Field label="Size"><Select value={draft.size} onChange={(e) => set('size', e.target.value)} options={optionsWith(layout.lists.size, draft.size)} /></Field>
        <Field label="Angle"><Select value={draft.angle} onChange={(e) => set('angle', e.target.value)} options={optionsWith(layout.lists.angle, draft.angle)} /></Field>
        <Field label="Movement"><Select value={draft.movement} onChange={(e) => set('movement', e.target.value)} options={optionsWith(layout.lists.movement, draft.movement)} /></Field>
      </div>
      <div className="row-3">
        <Field label="Gear"><Select value={draft.gear} onChange={(e) => set('gear', e.target.value)} options={optionsWith(layout.lists.gear, draft.gear)} /></Field>
        <Field label="Lens (mm)">
          {layout.lists.lens.length
            ? <Select value={draft.lens} onChange={(e) => set('lens', e.target.value)} options={[['', '–'], ...optionsWith(layout.lists.lens, draft.lens)]} />
            : <Input value={draft.lens} onChange={(e) => set('lens', e.target.value)} placeholder="35" inputMode="numeric" />}
        </Field>
        <div className="row-2">
          <Field label="Camera"><Input value={draft.camera} onChange={(e) => set('camera', e.target.value)} placeholder="A" /></Field>
          <Field label="FPS"><Input value={draft.fps} onChange={(e) => set('fps', e.target.value)} placeholder="25" inputMode="numeric" /></Field>
        </div>
      </div>
      <Field label="Subject"><Input value={draft.subject} onChange={(e) => set('subject', e.target.value)} placeholder="ELENI at the steel door" /></Field>
      <Field label="Description"><Textarea rows={2} value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Slow push in as she pulls the door shut. Hold on her face." /></Field>
      <div className="row-3">
        <Field label="Setup (minutes)" hint={`Empty means ${layout.timing.setup}`}><Input value={draft.setupMin ?? ''} onChange={(e) => set('setupMin', e.target.value.replace(/[^\d]/g, ''))} placeholder={String(layout.timing.setup)} inputMode="numeric" /></Field>
        <Field label="Shoot (minutes)" hint={`Empty means ${layout.timing.shoot}`}><Input value={draft.shootMin ?? ''} onChange={(e) => set('shootMin', e.target.value.replace(/[^\d]/g, ''))} placeholder={String(layout.timing.shoot)} inputMode="numeric" /></Field>
        <div />
      </div>
      {layout.columns.some((c) => c.custom) && (
        <div className="row-3">
          {layout.columns.filter((c) => c.custom).map((c) => (
            <Field key={c.key} label={colTitle(c)}><Input value={draft.custom?.[c.key] || ''} onChange={(e) => set('custom', { ...(draft.custom || {}), [c.key]: e.target.value })} /></Field>
          ))}
        </div>
      )}
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
