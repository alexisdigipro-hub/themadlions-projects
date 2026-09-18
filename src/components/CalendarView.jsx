import { useMemo, useState } from 'react'
import { Button, Confirm, Field, Input, Modal, Select, Textarea, useIsMobile, useToast } from './ui.jsx'
import MiniCalendar from './MiniCalendar.jsx'
import { EVENT_TYPES, can, today, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { addDays, buildICS, download, fmtDate, holidayName, monthGrid, monthLabel, weekdayShort } from '../lib/dates.js'

export default function CalendarView({ projectId = null, title }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const editable = can(user, 'calendar', 'edit')
  // Days off are an administrator's call now: they set them for whoever is away, not each
  // person for themselves. Everything else still follows the calendar edit permission.
  const isAdmin = user?.role === 'admin'
  const canEditDraft = (d) => (d?.type === 'unavailable' ? isAdmin : editable)
  const team = state.users.filter((u) => u.active !== false)
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [draft, setDraft] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [projFilter, setProjFilter] = useState('all')
  const mobile = useIsMobile()

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
    for (const e of events) {
      if (e.endDate && e.endDate > e.date) {
        let d = e.date, guard = 0
        while (d <= e.endDate && guard < 60) { (m[d] = m[d] || []).push(e); d = addDays(d, 1); guard += 1 }
      } else (m[e.date] = m[e.date] || []).push(e)
    }
    for (const k in m) m[k].sort((a, b) => (a.start || '').localeCompare(b.start || ''))
    return m
  }, [events])

  const grid = monthGrid(ym.y, ym.m, state.settings?.weekStart)
  const holiday = (iso) => holidayName(iso, state.settings?.greekHolidays !== false)
  const shift = (n) => {
    const d = new Date(ym.y, ym.m + n, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }
  // personId is who the day off belongs to; createdBy stays who wrote it down. Older days off
  // have no personId, so everything that reads one falls back to createdBy.
  const newEvent = (date, type = 'prep') => ({ id: uid(), projectId: type === 'unavailable' ? '' : projectId || projects[0]?.id || '', type, title: '', date, endDate: '', start: '', end: '', locationText: '', notes: '', personId: '', personName: '', createdBy: user?.id || '', createdByName: user?.name || '', isNew: true })
  const canMarkOff = isAdmin
  const personLabel = (e) => e.personName || e.createdByName || e.title

  const save = () => {
    if (draft.type === 'unavailable' && !draft.personId) return toast('Pick who is not available.', 'error')
    if (draft.type !== 'unavailable' && !draft.title.trim()) return toast('Give the event a title.', 'error')
    if (draft.endDate && draft.endDate < draft.date) return toast('End date is before the start.', 'error')
    update((s) => {
      const i = s.events.findIndex((e) => e.id === draft.id)
      const { isNew, ...ev } = { ...draft, title: draft.type === 'unavailable' ? `${draft.personName || 'Someone'} not available` : draft.title, createdBy: draft.createdBy || user?.id || '', createdByName: draft.createdByName || user?.name || '' }
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
          {canMarkOff && (
            <Button variant="ghost" onClick={() => setDraft(newEvent(today(), 'unavailable'))}>
              Not available
            </Button>
          )}
          {editable && (
            <Button variant="primary" onClick={() => setDraft(newEvent(today()))}>
              Add event
            </Button>
          )}
        </div>
      </div>

      <div className="cal-layout stacked">
        {mobile ? (
          <div className="panel cal-mobile">
            <MiniCalendar
              large
              items={events.map((e) => ({ date: e.date, endDate: e.endDate, time: e.start, color: typeOf(e.type).color, title: e.type === 'unavailable' ? `${personLabel(e)} not available` : e.title, sub: [e.start, !projectId && e.projectId ? projName(e.projectId) : '', e.type !== 'unavailable' ? typeOf(e.type).label : ''].filter(Boolean).join(' · '), ev: e }))}
              onItemClick={(e) => setDraft({ ...e })}
              onAddDay={editable ? (d) => setDraft(newEvent(d)) : canMarkOff ? (d) => setDraft(newEvent(d, 'unavailable')) : null}
              addLabel={editable ? 'Add event' : 'Not available'}
            />
          </div>
        ) : (
        <div className="cal-grid" role="grid">
          {weekdayShort(state.settings?.weekStart).map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {grid.map((cell) => {
            const evs = byDate[cell.iso] || []
            const isToday = cell.iso === today()
            const hol = holiday(cell.iso)
            return (
              <div
                key={cell.iso}
                className={`cal-cell ${cell.inMonth ? '' : 'dim'} ${isToday ? 'today' : ''} ${cell.dow >= 5 ? 'weekend' : ''} ${hol ? 'holiday' : ''}`}
                onClick={() => editable && setDraft(newEvent(cell.iso))}
                role="gridcell"
                title={hol || undefined}
              >
                <span className="cal-day">{Number(cell.iso.slice(-2))}</span>
                {hol && <span className="cal-holiday">{hol}</span>}
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
                      {e.type === 'unavailable' ? <><small>✕</small>{personLabel(e)}</> : e.title}
                    </button>
                  ))}
                  {evs.length > 3 && <span className="cal-more">+{evs.length - 3}</span>}
                </div>
              </div>
            )
          })}
        </div>
        )}

        <aside className="cal-side">
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
          canEditDraft(draft) ? (
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
            {draft.createdByName && <p className="muted small">Added by {draft.createdByName}</p>}
            {draft.type === 'unavailable' ? (
              <Field label="Who is not available" hint="Their photo goes grey on Home for these days.">
                <Select
                  value={draft.personId || ''}
                  onChange={(e) => setDraft({ ...draft, personId: e.target.value, personName: team.find((u) => u.id === e.target.value)?.name || '' })}
                  options={[['', 'Pick a person'], ...team.map((u) => [u.id, u.name])]}
                  disabled={!canEditDraft(draft)}
                />
              </Field>
            ) : (
              <Field label="Title">
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus disabled={!canEditDraft(draft)} />
              </Field>
            )}
            <div className="row-2">
              <Field label="Type">
                <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} options={EVENT_TYPES.filter((t) => t.key !== 'unavailable' || isAdmin).map((t) => [t.key, t.label])} disabled={!canEditDraft(draft)} />
              </Field>
              <Field label="Project">
                <Select value={draft.projectId || ''} onChange={(e) => setDraft({ ...draft, projectId: e.target.value })} disabled={!canEditDraft(draft) || !!projectId}>
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
              <Field label={draft.type === 'unavailable' ? 'From' : 'Date'}>
                <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} disabled={!canEditDraft(draft)} />
              </Field>
              {draft.type === 'unavailable' ? (
                <Field label="To (optional)">
                  <Input type="date" value={draft.endDate || ''} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} disabled={!canEditDraft(draft)} />
                </Field>
              ) : null}
              <Field label="Start">
                <Input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} disabled={!canEditDraft(draft)} />
              </Field>
              <Field label="End">
                <Input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} disabled={!canEditDraft(draft)} />
              </Field>
            </div>
            <Field label="Location">
              <Input value={draft.locationText} onChange={(e) => setDraft({ ...draft, locationText: e.target.value })} disabled={!canEditDraft(draft)} />
            </Field>
            <Field label="Notes">
              <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} disabled={!canEditDraft(draft)} />
            </Field>
            {draft.sourceDayId && <p className="fineprint">This event mirrors a shoot day from the schedule. Change the date there to keep them in sync.</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
