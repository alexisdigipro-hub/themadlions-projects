import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Confirm, Field, Input, Modal, Select, Textarea, useIsMobile, useToast } from './ui.jsx'
import MiniCalendar from './MiniCalendar.jsx'
import { can, eventTypesOf, today, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { addDays, buildICS, download, fmtDate, holidayName, monthGrid, monthLabel, weekdayShort } from '../lib/dates.js'
import { gcalDelete, gcalOn, gcalPull, gcalUpsert, reconcilePulledEvents } from '../lib/googleCalendar.js'
import { FEED_COLOR, liveFeeds, parseIcs, readFeedText } from '../lib/ical.js'

export default function CalendarView({ projectId = null, title }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const editable = can(user, 'calendar', 'edit')
  // Days off are an administrator's call now: they set them for whoever is away, not each
  // person for themselves. Everything else still follows the calendar edit permission.
  const isAdmin = user?.role === 'admin'
  const canEditDraft = (d) => (d?.feed ? false : d?.type === 'unavailable' ? isAdmin : editable)
  const team = state.users.filter((u) => u.active !== false)
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [draft, setDraft] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [projFilter, setProjFilter] = useState('all')
  const mobile = useIsMobile()
  const [syncing, setSyncing] = useState(false)
  // Read-only calendar feeds (Settings > Integrations). The file is fetched once per visit and
  // kept as text, so moving between months re-reads it without going back to the network.
  const feeds = liveFeeds(state.settings)
  const feedKey = feeds.map((f) => `${f.id}:${f.url}`).join('|')
  const [feedText, setFeedText] = useState({})
  const [feedErrors, setFeedErrors] = useState([])
  const [feedBusy, setFeedBusy] = useState(false)
  // Reading goes through readFeedText, which answers from the last half hour when it can: the
  // page is opened many times a day and Google starts refusing a calendar that is read that
  // often. Refresh feeds is the way to insist.
  const loadFeeds = (fresh = false) => {
    // Switched off in Settings, or none left: drop what the last read put on the page, or its
    // notice sits there over a calendar that is no longer showing any of it.
    if (!feeds.length || projectId) { setFeedText({}); setFeedErrors([]); return }
    setFeedBusy(true)
    setFeedErrors([])
    Promise.all(feeds.map((f) => readFeedText(f, { fresh }).then((r) => ({ id: f.id, ...r }))))
      .then((rows) => {
        setFeedText(Object.fromEntries(rows.filter((r) => r.text).map((r) => [r.id, r.text])))
        setFeedErrors(rows.map((r) => r.error).filter(Boolean))
      })
      .finally(() => setFeedBusy(false))
  }
  useEffect(() => { loadFeeds() }, [feedKey, projectId]) // eslint-disable-line react-hooks/exhaustive-deps
  // A year either side of the month on screen: enough for a repeating event to be worked out
  // without walking a calendar's whole history.
  const feedEvents = useMemo(() => {
    if (projectId) return []
    const from = `${ym.y - 1}-01-01`, to = `${ym.y + 1}-12-31`
    return feeds.flatMap((f) => (feedText[f.id] ? parseIcs(feedText[f.id], { from, to, feed: f }) : []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedText, feedKey, ym.y, projectId])

  const synced = gcalOn(state.settings)
  const calendarId = state.settings.googleCalendarId

  const projects = visibleProjects(state, user)
  const allowedIds = new Set(projects.map((p) => p.id))
  const events = useMemo(
    () =>
      [...state.events, ...feedEvents].filter((e) => {
        if (projectId && e.projectId !== projectId) return false
        if (!projectId && e.projectId && !allowedIds.has(e.projectId)) return false
        // "feed:<id>" picks one calendar feed; the other values are ordinary event types
        if (typeFilter.startsWith('feed:')) { if (e.feedId !== typeFilter.slice(5)) return false }
        else if (typeFilter !== 'all' && e.type !== typeFilter) return false
        if (!projectId && projFilter !== 'all' && (e.projectId || 'none') !== projFilter) return false
        return true
      }),
    [state.events, feedEvents, projectId, typeFilter, projFilter, allowedIds]
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
  // Week, Month or Year (Alex, 11 Oct: "a mode to see months and years", "and Week"); the arrows step
  // a week, a month or a year. Remembered on this device.
  const [calMode, setCalMode] = useState(() => { try { const m = localStorage.getItem('tml_cal_mode'); return m === 'year' || m === 'week' ? m : 'month' } catch { return 'month' } })
  const yearView = calMode === 'year' && !mobile
  const weekView = calMode === 'week' && !mobile
  // the first day of the week holding `iso`, by the week start set in Settings
  const weekOf = (iso) => { const d = new Date(iso + 'T00:00'); const back = state.settings?.weekStart === 'sunday' ? d.getDay() : (d.getDay() + 6) % 7; return addDays(iso, -back) }
  const [wk, setWk] = useState(() => weekOf(today()))
  const ymOf = (iso) => ({ y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 })
  const pickMode = (m) => {
    // into Week: this week when today is in the month on screen, else the month's first week
    if (m === 'week' && calMode !== 'week') {
      const t = today()
      const inView = ymOf(t).y === ym.y && ymOf(t).m === ym.m
      setWk(weekOf(inView ? t : `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-01`))
    }
    setCalMode(m)
    try { localStorage.setItem('tml_cal_mode', m) } catch {}
  }
  const shift = (n) => {
    if (weekView) { const w = addDays(wk, 7 * n); setWk(w); setYm(ymOf(addDays(w, 3))); return }
    const d = new Date(ym.y, ym.m + n * (yearView ? 12 : 1), 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }
  const goToday = () => { setYm({ y: now.getFullYear(), m: now.getMonth() }); setWk(weekOf(today())) }
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(wk, i))
  const weekLabel = () => {
    const a = new Date(wk + 'T00:00'); const b = new Date(addDays(wk, 6) + 'T00:00')
    const same = a.getMonth() === b.getMonth()
    return `${a.toLocaleDateString('en-GB', { day: 'numeric', ...(same ? {} : { month: 'short' }) })} – ${b.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  const openMonth = (m) => { setYm({ y: ym.y, m }); pickMode('month') }
  // personId is who the day off belongs to; createdBy stays who wrote it down. Older days off
  // have no personId, so everything that reads one falls back to createdBy.
  // a new event starts as Prep, or the first type still in use if Prep was removed in Settings
  const firstType = () => { const t = eventTypesOf(state.settings).filter((x) => !x.removed && x.key !== 'google' && x.key !== 'unavailable'); return (t.find((x) => x.key === 'prep') || t[0] || { key: 'shoot' }).key }
  const newEvent = (date, type = firstType()) => ({ id: uid(), projectId: type === 'unavailable' ? '' : projectId || projects[0]?.id || '', type, title: '', date, endDate: '', start: '', end: '', locationText: '', notes: '', personId: '', personName: '', createdBy: user?.id || '', createdByName: user?.name || '', isNew: true })
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
    if (synced && ev.type !== 'unavailable') {
      gcalUpsert({ calendarId, event: ev })
        .then((r) => { if (r.googleEventId !== ev.googleEventId) update((s) => { const i = s.events.findIndex((e) => e.id === ev.id); if (i >= 0) s.events[i] = { ...s.events[i], googleEventId: r.googleEventId }; return s }) })
        .catch((e) => toast(`Not synced to Google Calendar: ${e.message}`, 'error'))
    }
  }
  /* Drag an event to another day on the computer's month grid (Alex, 11 Oct). It moves by as many
     days as it was dragged (a three-day prep keeps its length); a shoot day takes the project's
     ordino for those dates and its Shoot day with it, the same as moving it on the ordino; Google
     Calendar is told, like after Save. */
  // the month grid reaches the foot of the window on a computer, however tall the window and
  // whatever sits above it, so nothing is left empty under it (Alex, 11 Oct)
  const gridRef = useRef(null)
  useEffect(() => {
    const el = gridRef.current
    if (!el || mobile || yearView) return undefined // the month grid and the week both stretch
    const fit = () => { el.style.minHeight = `${Math.max(560, Math.round(window.innerHeight - el.getBoundingClientRect().top - window.scrollY - 24))}px` }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [mobile, ym, yearView, weekView, wk])
  const dragging = useRef(null) // { ev, from }
  const [dropDay, setDropDay] = useState('')
  const dayGap = (a, b) => Math.round((Date.UTC(...b.split('-').map((x, i) => (i === 1 ? x - 1 : +x))) - Date.UTC(...a.split('-').map((x, i) => (i === 1 ? x - 1 : +x)))) / 86400000)
  const moveEvent = (ev, from, to) => {
    const n = dayGap(from, to)
    if (!n) return
    const date = addDays(ev.date, n)
    const endDate = ev.endDate ? addDays(ev.endDate, n) : ''
    update((s) => {
      const i = s.events.findIndex((e) => e.id === ev.id)
      if (i < 0) return s
      s.events[i] = { ...s.events[i], date, endDate }
      const pi = ev.type === 'shoot' && ev.projectId ? s.projects.findIndex((p) => p.id === ev.projectId) : -1
      if (pi >= 0) {
        const p = s.projects[pi]
        const last = ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date
        const days = p.shootingDays || []
        const taken = new Set(days.map((d) => d.date))
        const moved = days.map((d) => {
          if (!d.date || d.date < ev.date || d.date > last) return d
          const to2 = addDays(d.date, n)
          return taken.has(to2) && !(to2 >= ev.date && to2 <= last) ? d : { ...d, date: to2 }
        })
        s.projects[pi] = { ...p, shootingDays: moved, ...(p.startDate === ev.date ? { startDate: date } : {}) }
      }
      return s
    })
    toast(`Moved to ${fmtDate(date)}`, 'ok')
    if (synced && ev.type !== 'unavailable') {
      gcalUpsert({ calendarId, event: { ...ev, date, endDate } })
        .then((r) => { if (r.googleEventId !== ev.googleEventId) update((s) => { const i = s.events.findIndex((e) => e.id === ev.id); if (i >= 0) s.events[i] = { ...s.events[i], googleEventId: r.googleEventId }; return s }) })
        .catch((e) => toast(`Not synced to Google Calendar: ${e.message}`, 'error'))
    }
  }
  // the drag handlers a day (month tile or week column) and an event button take
  const dropOn = (iso) => ({
    onDragOver: (e) => { if (!dragging.current) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropDay !== iso) setDropDay(iso) },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropDay((d) => (d === iso ? '' : d)) },
    onDrop: (e) => { e.preventDefault(); const d = dragging.current; dragging.current = null; setDropDay(''); if (d) moveEvent(d.ev, d.from, iso) },
  })
  const dragFrom = (e, iso) => ({
    draggable: canEditDraft(e),
    onDragStart: (ev) => { dragging.current = { ev: state.events.find((x) => x.id === e.id) || e, from: iso }; ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', e.id); ev.currentTarget.classList.add('dragging') },
    onDragEnd: (ev) => { ev.currentTarget.classList.remove('dragging'); dragging.current = null; setDropDay('') },
  })
  const remove = (id) => {
    const ev = state.events.find((e) => e.id === id)
    update((s) => {
      s.events = s.events.filter((e) => e.id !== id)
      return s
    })
    setDraft(null)
    if (synced && ev?.googleEventId) {
      gcalDelete({ calendarId, googleEventId: ev.googleEventId }).catch((e) => toast(`Not removed from Google Calendar: ${e.message}`, 'error'))
    }
  }
  const pull = () => {
    setSyncing(true)
    const now = new Date()
    const timeMin = new Date(now.getTime() - 90 * 86400000).toISOString()
    const timeMax = new Date(now.getTime() + 400 * 86400000).toISOString()
    gcalPull({ calendarId, timeMin, timeMax })
      .then((r) => {
        update((s) => { s.events = reconcilePulledEvents(s.events, r.events); return s })
      })
      .catch((e) => toast(`Could not sync from Google Calendar: ${e.message}`, 'error'))
      .finally(() => setSyncing(false))
  }
  // The workspace's own Calendar page keeps the shared connection fresh on its own; a project's
  // calendar tab shows the same underlying events without re-pulling for every project opened.
  useEffect(() => {
    if (synced && !projectId) pull()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced, calendarId])

  // the workspace's own types (Settings > Calendar > Event types); removed ones still name old events
  const allTypes = eventTypesOf(state.settings)
  const types = allTypes.filter((t) => !t.removed)
  const typeOf = (k) => allTypes.find((t) => t.key === k) || { key: k, label: 'Other', color: '#9AA0A6' }
  const feedById = Object.fromEntries(feeds.map((f) => [f.id, f]))
  const colorOf = (e) => (e.feed ? feedById[e.feedId]?.color || FEED_COLOR : typeOf(e.type).color)
  const labelOf = (e) => (e.feed ? e.feedName || 'Calendar feed' : typeOf(e.type).label)
  // the legend and the type filter list the feeds after the app's own kinds
  const legendTypes = projectId ? types : [...types, ...feeds.map((f) => ({ key: `feed:${f.id}`, label: f.name || 'Calendar feed', color: f.color || FEED_COLOR }))]
  const projName = (id) => state.projects.find((p) => p.id === id)?.title || ''

  return (
    <div className="calendar">
      <div className="toolbar">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label={yearView ? 'Previous year' : 'Previous month'}>‹</button>
          <h2>{yearView ? ym.y : weekView ? weekLabel() : monthLabel(ym.y, ym.m)}</h2>
          <button className="icon-btn" onClick={() => shift(1)} aria-label={yearView ? 'Next year' : 'Next month'}>›</button>
          <Button size="sm" variant="ghost" onClick={goToday}>
            Today
          </Button>
          {!mobile && (
            <div className="segmented cal-mode">
              <button className={weekView ? 'on' : ''} onClick={() => pickMode('week')}>Week</button>
              <button className={!yearView && !weekView ? 'on' : ''} onClick={() => pickMode('month')}>Month</button>
              <button className={yearView ? 'on' : ''} onClick={() => pickMode('year')}>Year</button>
            </div>
          )}
        </div>
        {/* the type legend, which is also the type filter, sits in this row on a computer (Alex, 11 Oct:
            "on the same row as Not available"): click a type to show only it, click again for all */}
        {!mobile && (
          <div className="cal-legend cal-legend-top">
            {/* All, so one pill is always the chosen one and the glass lens has somewhere to slide from */}
            <button type="button" className={`cal-legend-btn ${typeFilter === 'all' ? 'on' : ''}`} onClick={() => setTypeFilter('all')}>All</button>
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
        )}
        <div className="toolbar-actions">
          {/* the type filter is the legend on a computer (Alex, 11 Oct); a phone has no legend, so it
              keeps this menu */}
          {mobile && (
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {legendTypes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
          {/* no project menu on a computer either (Alex, 11 Oct); the phone keeps it */}
          {!projectId && mobile && (
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
            <Button variant="ghost" onClick={() => { pull(); loadFeeds(true) }} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          )}
          {!synced && !!feeds.length && !projectId && (
            <Button variant="ghost" onClick={() => loadFeeds(true)} disabled={feedBusy}>{feedBusy ? 'Reading…' : 'Refresh feeds'}</Button>
          )}
          {canMarkOff && (
            <Button onClick={() => setDraft(newEvent(today(), 'unavailable'))}>
              Not available
            </Button>
          )}
          {editable && (
            <Button variant={mobile ? 'primary' : 'default'} onClick={() => setDraft(newEvent(today()))}>
              Add event
            </Button>
          )}
        </div>
      </div>

      {feedErrors.map((err) => <p key={err} className="notice">{err}</p>)}

      <div className="cal-layout stacked">
        {mobile ? (
          <div className="panel cal-mobile">
            <MiniCalendar
              large
              items={events.map((e) => ({ date: e.date, endDate: e.endDate, time: e.start, color: colorOf(e), title: e.type === 'unavailable' ? `${personLabel(e)} not available` : e.title, sub: [!projectId && e.projectId ? projName(e.projectId) : '', e.type !== 'unavailable' ? labelOf(e) : ''].filter(Boolean).join(' · '), ev: e }))}
              onItemClick={(e) => setDraft({ ...e })}
              onAddDay={editable ? (d) => setDraft(newEvent(d)) : canMarkOff ? (d) => setDraft(newEvent(d, 'unavailable')) : null}
              addLabel={editable ? 'Add event' : 'Not available'}
            />
          </div>
        ) : yearView ? (
          /* the year: twelve small months with a coloured dot per event (up to three a day); a month's
             name or any of its days opens that month */
          <div className="cal-year">
            {Array.from({ length: 12 }, (_, m) => {
              const cells = monthGrid(ym.y, m, state.settings?.weekStart)
              const count = cells.filter((c) => c.inMonth).reduce((n, c) => n + (byDate[c.iso]?.length || 0), 0)
              const current = ym.y === now.getFullYear() && m === now.getMonth()
              return (
                <section key={m} className={`cal-ym${current ? ' now' : ''}`}>
                  <button type="button" className="cal-ym-title" onClick={() => openMonth(m)}>
                    {new Date(ym.y, m, 1).toLocaleDateString('en-GB', { month: 'long' })}
                    {count > 0 && <small>{count}</small>}
                  </button>
                  <div className="cal-ym-grid">
                    {weekdayShort(state.settings?.weekStart).map((d) => <span key={d} className="cal-ym-dow">{d[0]}</span>)}
                    {cells.map((c) => {
                      const evs = c.inMonth ? byDate[c.iso] || [] : []
                      return (
                        <button
                          key={c.iso}
                          type="button"
                          className={`cal-ym-day${c.inMonth ? '' : ' out'}${c.iso === today() ? ' today' : ''}${evs.length ? ' has' : ''}${holiday(c.iso) && c.inMonth ? ' hol' : ''}`}
                          onClick={() => openMonth(m)}
                          title={evs.map((e) => (e.type === 'unavailable' ? `${personLabel(e)} not available` : e.title)).join('\n') || undefined}
                          tabIndex={c.inMonth ? 0 : -1}
                        >
                          <span>{Number(c.iso.slice(-2))}</span>
                          {evs.length > 0 && <i className="cal-ym-dots">{evs.slice(0, 3).map((e) => <b key={e.id} style={{ background: colorOf(e) }} />)}</i>}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        ) : weekView ? (
          /* the week: seven tall columns, every event of the day listed in full with its time, its
             project and its type; drag between days, click empty space to add */
          <div className="cal-week" ref={gridRef}>
            {weekDays.map((iso) => {
              const evs = byDate[iso] || []
              const hol = holiday(iso)
              const d = new Date(iso + 'T00:00')
              return (
                <div
                  key={iso}
                  className={`cal-wd${iso === today() ? ' today' : ''}${d.getDay() === 0 || d.getDay() === 6 ? ' weekend' : ''}${hol ? ' holiday' : ''}${dropDay === iso ? ' drop-over' : ''}`}
                  onClick={() => editable && setDraft(newEvent(iso))}
                  {...dropOn(iso)}
                >
                  <div className="cal-wd-head">
                    <span>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                    <b>{d.getDate()}</b>
                    {hol && <small>{hol}</small>}
                  </div>
                  <div className="cal-wd-events">
                    {evs.map((e) => (
                      <button key={e.id} type="button" className="cal-wev" style={{ '--ev': colorOf(e) }} {...dragFrom(e, iso)} onClick={(ev) => { ev.stopPropagation(); setDraft({ ...e }) }}>
                        {(e.start || e.end) && <small>{e.start}{e.end ? ` – ${e.end}` : ''}</small>}
                        <strong>{e.type === 'unavailable' ? `${personLabel(e)} not available` : e.title}</strong>
                        {e.type !== 'unavailable' && <em>{[!projectId && e.projectId ? projName(e.projectId) : '', labelOf(e)].filter(Boolean).join(' · ')}</em>}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
        <div className="cal-grid" role="grid" ref={gridRef}>
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
                className={`cal-cell ${cell.inMonth ? '' : 'dim'} ${isToday ? 'today' : ''} ${cell.dow >= 5 ? 'weekend' : ''} ${hol ? 'holiday' : ''} ${dropDay === cell.iso ? 'drop-over' : ''}`}
                onClick={() => editable && setDraft(newEvent(cell.iso))}
                {...dropOn(cell.iso)}
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
                      {...dragFrom(e, cell.iso)}
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
            {draft.feed
              ? <p className="muted small">From <b>{draft.feedName}</b>, a calendar this app only reads. Change it in that calendar.</p>
              : draft.createdByName && <p className="muted small">Added by {draft.createdByName}</p>}
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
            <div className="row-2" hidden={!!draft.feed}>
              <Field label="Type">
                <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} options={allTypes.filter((t) => (!t.removed || t.key === draft.type) && (t.key !== 'google' || draft.type === 'google') && (t.key !== 'unavailable' || isAdmin)).map((t) => [t.key, t.label])} disabled={!canEditDraft(draft)} />
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
            {draft.type === 'google' && draft.googleEventId && <p className="fineprint">Synced with Google Calendar. A change here is pushed there, and the other way round next time the page syncs.</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
