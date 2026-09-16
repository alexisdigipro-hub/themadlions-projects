import { useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { today, uid, useStore } from '../../lib/store.jsx'
import { formatPages, stripColor } from '../../lib/breakdown.js'
import { addDays, fmtDate } from '../../lib/dates.js'

const emptyDay = (date) => ({ id: uid(), date, unit: 'Main unit', callTime: '07:00', wrapTime: '19:00', locationId: '', notes: '', sceneIds: [] })

export default function Schedule() {
  const { project, edit, canEdit } = useProject()
  const { update } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [pick, setPick] = useState(null) // dayId to add scenes to
  const editable = canEdit('schedule')

  const days = [...project.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
  const scheduled = new Set(days.flatMap((d) => d.sceneIds))
  const unscheduled = project.scenes.filter((s) => !scheduled.has(s.id))
  const sceneById = Object.fromEntries(project.scenes.map((s) => [s.id, s]))

  const saveDay = () => {
    if (!draft.date) return toast('Pick a date.', 'error')
    edit((p) => {
      const i = p.shootingDays.findIndex((d) => d.id === draft.id)
      if (i >= 0) p.shootingDays[i] = { ...p.shootingDays[i], ...draft }
      else p.shootingDays.push(draft)
    })
    // mirror to the calendar
    update((s) => {
      const loc = project.locations.find((l) => l.id === draft.locationId)
      const title = `Shoot day · ${project.title}${draft.unit && draft.unit !== 'Main unit' ? ` (${draft.unit})` : ''}`
      const existing = s.events.find((e) => e.sourceDayId === draft.id)
      const ev = {
        id: existing?.id || uid(),
        projectId: project.id,
        sourceDayId: draft.id,
        type: 'shoot',
        title,
        date: draft.date,
        start: draft.callTime,
        end: draft.wrapTime,
        locationText: loc ? `${loc.name}, ${loc.address}` : '',
        notes: draft.notes,
      }
      if (existing) Object.assign(existing, ev)
      else s.events.push(ev)
      return s
    })
    setDraft(null)
    toast('Shoot day saved', 'ok')
  }

  const deleteDay = (id) => {
    edit((p) => {
      p.shootingDays = p.shootingDays.filter((d) => d.id !== id)
      p.scenes.forEach((s) => s.dayId === id && (s.dayId = ''))
    })
    update((s) => {
      s.events = s.events.filter((e) => e.sourceDayId !== id)
      return s
    })
  }

  const assign = (dayId, sceneIds) => {
    edit((p) => {
      p.shootingDays.forEach((d) => (d.sceneIds = d.sceneIds.filter((x) => !sceneIds.includes(x))))
      const d = p.shootingDays.find((x) => x.id === dayId)
      if (d) d.sceneIds.push(...sceneIds)
      p.scenes.forEach((s) => sceneIds.includes(s.id) && (s.dayId = dayId))
    })
  }
  const unassign = (sceneId) => {
    edit((p) => {
      p.shootingDays.forEach((d) => (d.sceneIds = d.sceneIds.filter((x) => x !== sceneId)))
      const s = p.scenes.find((x) => x.id === sceneId)
      if (s) s.dayId = ''
    })
  }
  const move = (dayId, idx, dir) => {
    edit((p) => {
      const d = p.shootingDays.find((x) => x.id === dayId)
      const j = idx + dir
      if (!d || j < 0 || j >= d.sceneIds.length) return
      ;[d.sceneIds[idx], d.sceneIds[j]] = [d.sceneIds[j], d.sceneIds[idx]]
    })
  }

  const dayEighths = (d) => d.sceneIds.reduce((a, id) => a + (sceneById[id]?.eighths || 0), 0)
  const dayCast = (d) => [...new Set(d.sceneIds.flatMap((id) => sceneById[id]?.characters || []))]

  return (
    <div className="schedule">
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>{days.length} shoot days</strong>
          <span className="muted">
            {project.scenes.length - unscheduled.length} of {project.scenes.length} scenes scheduled
          </span>
        </div>
        {editable && (
          <div className="toolbar-actions">
            <Button variant="primary" onClick={() => setDraft(emptyDay(days.length ? addDays(days[days.length - 1].date, 1) : project.startDate || today()))}>
              Add shoot day
            </Button>
          </div>
        )}
      </div>

      {project.scenes.length === 0 && <Empty title="No scenes to schedule">Run the breakdown first so the strips appear here.</Empty>}

      <div className="board">
        {days.map((d) => {
          const loc = project.locations.find((l) => l.id === d.locationId)
          return (
            <section key={d.id} className="day">
              <header className="day-head">
                <div>
                  <h2>
                    Day {days.indexOf(d) + 1} <span className="muted">{fmtDate(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </h2>
                  <p className="muted small">
                    {d.unit} · call {d.callTime} · wrap {d.wrapTime}
                    {loc ? ` · ${loc.name}` : ''} · {formatPages(dayEighths(d))} pages · {dayCast(d).length} cast
                  </p>
                </div>
                {editable && (
                  <div className="day-tools">
                    <Button size="sm" onClick={() => setPick(d.id)} disabled={!unscheduled.length}>
                      Add scenes
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDraft({ ...d })}>
                      Edit
                    </Button>
                    <Confirm onConfirm={() => deleteDay(d.id)} />
                  </div>
                )}
              </header>
              {d.sceneIds.length === 0 ? (
                <p className="muted small pad">No scenes yet.</p>
              ) : (
                <div className="strips">
                  {d.sceneIds.map((id, i) => {
                    const s = sceneById[id]
                    if (!s) return null
                    return (
                      <div key={id} className={`strip ${stripColor(s)} static`}>
                        <span className="strip-num">{s.number}</span>
                        <span className="strip-ie">
                          {s.intExt}
                          <small>{s.timeOfDay}</small>
                        </span>
                        <span className="strip-main">
                          <span className="strip-loc">{s.location}</span>
                          <span className="strip-syn">{s.synopsis}</span>
                        </span>
                        <span className="strip-chars">{s.characters.join(', ')}</span>
                        <span className="strip-pages">{formatPages(s.eighths)}</span>
                        {editable && (
                          <span className="strip-ctl">
                            <button onClick={() => move(d.id, i, -1)} aria-label="Move up">↑</button>
                            <button onClick={() => move(d.id, i, 1)} aria-label="Move down">↓</button>
                            <button onClick={() => unassign(id)} aria-label="Remove from day">×</button>
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {d.notes && <p className="small pad">{d.notes}</p>}
            </section>
          )
        })}

        {unscheduled.length > 0 && (
          <section className="day unscheduled">
            <header className="day-head">
              <h2>
                Unscheduled <span className="muted">{unscheduled.length} scenes · {formatPages(unscheduled.reduce((a, s) => a + s.eighths, 0))} pages</span>
              </h2>
            </header>
            <div className="strips">
              {unscheduled.map((s) => (
                <div key={s.id} className={`strip ${stripColor(s)} static`}>
                  <span className="strip-num">{s.number}</span>
                  <span className="strip-ie">
                    {s.intExt}
                    <small>{s.timeOfDay}</small>
                  </span>
                  <span className="strip-main">
                    <span className="strip-loc">{s.location}</span>
                    <span className="strip-syn">{s.synopsis}</span>
                  </span>
                  <span className="strip-chars">{s.characters.join(', ')}</span>
                  <span className="strip-pages">{formatPages(s.eighths)}</span>
                  {editable && days.length > 0 && (
                    <span className="strip-ctl">
                      <select className="mini" value="" onChange={(e) => e.target.value && assign(e.target.value, [s.id])} aria-label="Assign to day">
                        <option value="">Day…</option>
                        {days.map((d, i) => (
                          <option key={d.id} value={d.id}>
                            Day {i + 1} · {fmtDate(d.date)}
                          </option>
                        ))}
                      </select>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <Modal
        open={!!draft}
        title={project.shootingDays.some((d) => d.id === draft?.id) ? 'Edit shoot day' : 'New shoot day'}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveDay}>
              Save shoot day
            </Button>
          </>
        }
      >
        {draft && (
          <div className="stack">
            <div className="row-2">
              <Field label="Date">
                <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </Field>
              <Field label="Unit">
                <Input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
              </Field>
            </div>
            <div className="row-2">
              <Field label="General call">
                <Input type="time" value={draft.callTime} onChange={(e) => setDraft({ ...draft, callTime: e.target.value })} />
              </Field>
              <Field label="Estimated wrap">
                <Input type="time" value={draft.wrapTime} onChange={(e) => setDraft({ ...draft, wrapTime: e.target.value })} />
              </Field>
            </div>
            <Field label="Location">
              <Select value={draft.locationId} onChange={(e) => setDraft({ ...draft, locationId: e.target.value })}>
                <option value="">No location yet</option>
                {project.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notes">
              <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>

      <ScenePicker open={!!pick} scenes={unscheduled} onClose={() => setPick(null)} onPick={(ids) => { assign(pick, ids); setPick(null) }} />
    </div>
  )
}

function ScenePicker({ open, scenes, onClose, onPick }) {
  const [sel, setSel] = useState([])
  if (!open) return null
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  return (
    <Modal
      open
      title="Add scenes to this day"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={() => setSel(scenes.map((s) => s.id))}>
            Select all
          </Button>
          <span className="spacer" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!sel.length} onClick={() => onPick(sel)}>
            Add {sel.length || ''} scene{sel.length === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <ul className="pick-list">
        {scenes.map((s) => (
          <li key={s.id}>
            <label className="check">
              <input type="checkbox" checked={sel.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className={`pick-swatch ${stripColor(s)}`} />
              <strong>{s.number}</strong> {s.intExt} {s.location} {s.timeOfDay} <span className="muted">{formatPages(s.eighths)}</span>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
