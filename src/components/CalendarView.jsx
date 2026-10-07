import { useEffect, useMemo, useState } from 'react'
import { Button, Confirm, Field, Input, Modal, Select, Textarea, useIsMobile, useToast } from './ui.jsx'
import MiniCalendar from './MiniCalendar.jsx'
import { EVENT_TYPES, can, today, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { addDays, buildICS, download, fmtDate, holidayName, monthGrid, monthLabel, weekdayShort } from '../lib/dates.js'
import { gcalCalendarsOf, gcalDelete, gcalOn, gcalPullAll, gcalUpsert, reconcilePulledEvents } from '../lib/googleCalendar.js'

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
  const [syncing, setSyncing] = useState(false)
  const synced = gcalOn(state.settings)
  const calendarId = state.settings.googleCalendarId // the one our own events are written to
  // every Google calendar shown here, each with its colour; an event pulled from one keeps its id
  const gcals = gcalCalendarsOf(state.settings)
  const gcalKey = gcals.map((c) => c.id).join(',')
  const gcalById = Object.fromEntries(gcals.map((c) => [c.id, c]))
  const calFor = (ev) => ev.googleCalendarId || calendarId

  const projects = visibleProjects(state, user)
  const allowedIds = new Set(projects.map((p) => p.id))
  const events = useMemo(
    () =>
      state.events.filter((e) => {
        if (projectId && e.projectId !== projectId) return false
        if (!projectId && e.projectId && !allowedIds.has(e.projectId)) return false
        // "gcal:<id>" is one Google calendar when several are connected; a plain type otherwise
        if (typeFilter.startsWith('gcal:')) { if (e.type !== 'google' || e.googleCalendarId !== typeFilter.slice(5)) return false }
        else if (typeFilter !== 'all' && e.type !== typeFilter) return false
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
    const { isNew, ...ev } = { ...draft, title: draft.type === 'unavailable' ? `${draft.personName || 'Someone'} not available` : draft.title, createdBy: draft.createdBy || user?.id || '', createdByName: draft.createdByName || user?.name || '' }
    update((s) => {
      const i = s.events.findIndex((e) => e.id === ev.id)
      if (i >= 0) s.events[i] = { ...s.events[i], ...ev }
      else s.events.push(ev)
      return s
    })
    toast(draft.isNew ? 'Event added' : 'Event saved', 'ok')
    setDraft(null)
    // Days off stay internal scheduling, not something to push onto a calendar other people see.
    if (synced && ev.type !== 'unavailable' && calFor(ev)) {
      gcalUpsert({ calendarId: calFor(ev), event: ev })
        .then((r) => { if (r.googleEventId !== ev.googleEventId) update((s) => { const i = s.events.findIndex((e) => e.id === ev.id); if (i >= 0) s.events[i] = { ...s.events[i], googleEventId: r.googleEventId }; return s }) })
        .catch((e) => toast(`Not synced to Google Calendar: ${e.message}`, 'error'))
    }
  }
  const remove = (id) => {
    const ev = state.events.find((e) => e.id === id)
    update((s) => {
      s.events = s.events.filter((e) => e.id !== id)
      return s
    })
    setDraft(null)
    if (synced && ev?.googleEventId) {
      gcalDelete({ calendarId: calFor(ev), googleEventId: ev.googleEventId }).catch((e) => toast(`Not removed from Google Calendar: ${e.message}`, 'error'))
    }
  }
  const pull = () => {
    setSyncing(true)
    const now = new Date()
    const timeMin = new Date(now.getTime() - 90 * 86400000).toISOString()
    const timeMax = new Date(now.getTime() + 400 * 86400000).toISOString()
    gcalPullAll({ calendars: gcals, timeMin, timeMax })
      .then((events) => {
        update((s) => { s.events = reconcilePulledEvents(s.events, events); return s })
      })
      .catch((e) => toast(`Could not sync from Google Calendar: ${e.message}`, 'error'))
      .finally(() => setSyncing(false))
  }
  // The workspace's own Calendar page keeps the shared connection fresh on its own; a project's
  // calendar tab shows the same underlying events without re-pulling for every project opened.
  useEffect(() => {
    if (synced && !projectId) pull()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced, gcalKey])

  const typeOf = (k) => EVENT_TYPES.find((t) => t.key === k) || EVENT_TYPES[0]
  // With several Google calendars the legend and the filter show one entry per calendar, in its
  // own colour, instead of one "From Google Calendar".
  const legendTypes = gcals.length > 1
    ? EVENT_TYPES.filter((t) => t.key !== 'google').concat(gcals.map((c) => ({ key: `gcal:${c.id}`, label: c.name, color: c.color })))
    : EVENT_TYPES.map((t) => (t.key === 'google' && gcals[0] ? { ...t, color: gcals[0].color } : t))
  const colorOf = (e) => (e.type === 'google' && gcalById[e.googleCalendarId]?.color) || (e.type === 'google' && gcals[0]?.color) || typeOf(e.type).color
  const labelOf = (e) => (e.type === 'google' && gcalById[e.googleCalendarId]?.name) || typeOf(e.type).label
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
            {legendTypes.map((t) => (
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
          {/* on the top-level Calendar page this moved to Settings > Calendar (Alex); a project's
              own Calendar tab keeps it here, it is that project's own export */}
          {projectId && (
            <Button variant="ghost" onClick={() => download(`${title || 'calendar'}.ics`, buildICS(events, title), 'text/calendar')}>
              Export .ics
            </Button>
          )}
          {synced && !projectId && (
            <Button variant="ghost" onClick={pull} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          )}
          {canMarkOff && (
            <Button onClick={() => setDraft(newEvent(today(), 'unavailable'))}>
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
              items={events.map((e) => ({ date: e.date, endDate: e.endDate, time: e.start, color: colorOf(e), title: e.type === 'unavailable' ? `${personLabel(e)} not available` : e.title, sub: [e.start, !projectId && e.projectId ? projName(e.projectId) : '', e.type !== 'unavailable' ? labelOf(e) : ''].filter(Boolean).join(' · '), ev: e }))}
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
                      style={{ '--ev': colorOf(e) }}
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
          {/* the legend doubles as a filter: click a type to show only it on the grid above, click it
              again for all types. Same state the "All types" dropdown uses, so the two stay in sync. */}
          <div className="cal-legend">
            {legendTypes.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`cal-legend-btn ${typeFilter === t.key ? 'on' : ''}`}
                style={{ '--ev': t.color }}
                onClick={() => setTypeFilter((f) => (f === t.key ? 'all' : t.key))}
                title={`Show only ${t.label}`}
              >
                <i style={{ background: t.color }} /> {t.label}
              </button>
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
                <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} options={EVENT_TYPES.filter((t) => (t.key !== 'google' || draft.type === 'google') && (t.key !== 'unavailable' || isAdmin)).map((t) => [t.key, t.label])} disabled={!canEditDraft(draft)} />
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
            {draft.type === 'google' && draft.googleEventId && <p className="fineprint">Synced with {gcalById[draft.googleCalendarId]?.name || 'Google Calendar'}. A change here is pushed there, and the other way round next time the page syncs.</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
