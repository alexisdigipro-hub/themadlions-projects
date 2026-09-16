import { useMemo, useState } from 'react'
import { Button, Confirm, Field, Input, Modal, Select, Textarea, useToast } from './ui.jsx'
import { EVENT_TYPES, can, today, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { buildICS, download, fmtDate, monthGrid, monthLabel, weekdayShort } from '../lib/dates.js'

export default function CalendarView({ projectId = null, title }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const editable = can(user, 'calendar', 'edit')
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [draft, setDraft] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [projFilter, setProjFilter] = useState('all')

  const projects = visibleProjects(state, user)
  const allowedIds = new Set(projects.map((p) => p.id))
  const events = useMemo(
    () =>
      state.events.filter((e) => {
        if (projectId && e.projectId !== projectId) return false
        if (!projectId && e.projectId && !allowedIds.has(e.projectId)) return false
        if (typeFilter !== 'all' && e.type !== typeFilter) return false
        if (!projectId && projFilter !== 'all' && (e.projectId || 'none') !== projFilter) return false
        return true
      }),
    [state.events, projectId, typeFilter, projFilter, allowedIds]
  )
  const byDate = useMemo(() => {
    const m = {}
    for (const e of events) (m[e.date] = m[e.date] || []).push(e)
    for (const k in m) m[k].sort((a, b) => (a.start || '').localeCompare(b.start || ''))
    return m
  }, [events])

  const grid = monthGrid(ym.y, ym.m)
  const shift = (n) => {
    const d = new Date(ym.y, ym.m + n, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }
  const newEvent = (date) => ({ id: uid(), projectId: projectId || projects[0]?.id || '', type: 'prep', title: '', date, start: '', end: '', locationText: '', notes: '', isNew: true })

  const save = () => {
    if (!draft.title.trim()) return toast('Give the event a title.', 'error')
    update((s) => {
      const i = s.events.findIndex((e) => e.id === draft.id)
      const { isNew, ...ev } = draft
      if (i >= 0) s.events[i] = { ...s.events[i], ...ev }
      else s.events.push(ev)
      return s
    })
    toast(draft.isNew ? 'Event added' : 'Event saved', 'ok')
    setDraft(null)
  }
  const remove = (id) => {
    update((s) => {
      s.events = s.events.filter((e) => e.id !== id)
      return s
    })
    setDraft(null)
  }

  const upcoming = events.filter((e) => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date) || (a.start || '').localeCompare(b.start || '')).slice(0, 10)
  const typeOf = (k) => EVENT_TYPES.find((t) => t.key === k) || EVENT_TYPES[0]
  const projName = (id) => state.projects.find((p) => p.id === id)?.title || ''

  return (
    <div className="calendar">
      <div className="toolbar">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <h2>{monthLabel(ym.y, ym.m)}</h2>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">›</button>
          <Button size="sm" variant="ghost" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>
            Today
          </Button>
        </div>
        <div className="toolbar-actions">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </Select>
          {!projectId && (
            <Select value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          )}
          <Button variant="ghost" onClick={() => download(`${title || 'calendar'}.ics`, buildICS(events, title), 'text/calendar')}>
            Export .ics
          </Button>
          {editable && (
            <Button variant="primary" onClick={() => setDraft(newEvent(today()))}>
              Add event
            </Button>
          )}
        </div>
      </div>

      <div className="cal-layout">
        <div className="cal-grid" role="grid">
          {weekdayShort().map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {grid.map((cell) => {
            const evs = byDate[cell.iso] || []
            const isToday = cell.iso === today()
            return (
              <div
                key={cell.iso}
                className={`cal-cell ${cell.inMonth ? '' : 'dim'} ${isToday ? 'today' : ''} ${cell.dow >= 5 ? 'weekend' : ''}`}
                onClick={() => editable && setDraft(newEvent(cell.iso))}
                role="gridcell"
              >
                <span className="cal-day">{Number(cell.iso.slice(-2))}</span>
                <div className="cal-events">
                  {evs.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      className="cal-ev"
                      style={{ '--ev': typeOf(e.type).color }}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        setDraft({ ...e })
                      }}
                      title={`${e.title}${e.start ? ` · ${e.start}` : ''}`}
                    >
                      {e.start && <small>{e.start}</small>}
                      {e.title}
                    </button>
                  ))}
                  {evs.length > 3 && <span className="cal-more">+{evs.length - 3}</span>}
                </div>
              </div>
            )
          })}
        </div>

        <aside className="cal-side">
          <h3>Next up</h3>
          {upcoming.length === 0 ? (
            <p className="muted small">Nothing scheduled ahead.</p>
          ) : (
            <ul className="event-list">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <span className="dot" style={{ background: typeOf(e.type).color }} />
                  <span className="ev-date">{fmtDate(e.date)}</span>
                  <button className="ev-title link" onClick={() => setDraft({ ...e })}>
                    {e.title}
                  </button>
                  {!projectId && e.projectId && <span className="muted small">{projName(e.projectId)}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="legend">
            {EVENT_TYPES.map((t) => (
              <span key={t.key}>
                <i style={{ background: t.color }} /> {t.label}
              </span>
            ))}
          </div>
        </aside>
      </div>

      <Modal
        open={!!draft}
        title={draft?.isNew ? 'New event' : 'Event'}
        onClose={() => setDraft(null)}
        footer={
          editable ? (
            <>
              {!draft?.isNew && <Confirm onConfirm={() => remove(draft.id)} />}
              <span className="spacer" />
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save}>
                {draft?.isNew ? 'Add event' : 'Save event'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Close
            </Button>
          )
        }
      >
        {draft && (
          <div className="stack">
            <Field label="Title">
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus disabled={!editable} />
            </Field>
            <div className="row-2">
              <Field label="Type">
                <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} options={EVENT_TYPES.map((t) => [t.key, t.label])} disabled={!editable} />
              </Field>
              <Field label="Project">
                <Select value={draft.projectId || ''} onChange={(e) => setDraft({ ...draft, projectId: e.target.value })} disabled={!editable || !!projectId}>
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="row-3">
              <Field label="Date">
                <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} disabled={!editable} />
              </Field>
              <Field label="Start">
                <Input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} disabled={!editable} />
              </Field>
              <Field label="End">
                <Input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} disabled={!editable} />
              </Field>
            </div>
            <Field label="Location">
              <Input value={draft.locationText} onChange={(e) => setDraft({ ...draft, locationText: e.target.value })} disabled={!editable} />
            </Field>
            <Field label="Notes">
              <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} disabled={!editable} />
            </Field>
            {draft.sourceDayId && <p className="fineprint">This event mirrors a shoot day from the schedule. Change the date there to keep them in sync.</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
