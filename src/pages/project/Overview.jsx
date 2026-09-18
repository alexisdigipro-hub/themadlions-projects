import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Modal, Stat, useToast } from '../../components/ui.jsx'
import { ProjectForm } from '../Dashboard.jsx'
import { useProject } from '../Project.jsx'
import { EVENT_TYPES, today, useStore } from '../../lib/store.jsx'
import { formatPages } from '../../lib/breakdown.js'
import { fmtDate, fmtLong } from '../../lib/dates.js'
import { budgetTotals, money } from './Budget.jsx'
import { reportSummary } from './Reports.jsx'
import { projectProgress } from '../../lib/progress.js'
import { compress } from '../../lib/photos.js'
import { useRef } from 'react'

export default function Overview() {
  const { project, edit, canEdit, user } = useProject()
  const { state } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState(null)

  const eighths = project.scenes.reduce((a, s) => a + (s.eighths || 0), 0)
  const upcoming = state.events
    .filter((e) => e.projectId === project.id && e.date >= today())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
  const nextShoot = [...project.shootingDays].filter((d) => d.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0]
  const unscheduled = project.scenes.filter((s) => !s.dayId).length
  const cast = project.contacts.filter((c) => c.kind === 'cast').length
  const crew = project.contacts.filter((c) => c.kind === 'crew').length
  const bt = budgetTotals(project)
  const rs = reportSummary(project)
  const openTasks = (project.tasks || []).filter((t) => t.status !== 'done').length

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
            <div className="progress-top"><strong>{pct}% done</strong><span className="muted small">{project.status}{project.endDate ? ` · delivery ${fmtDate(project.endDate)}` : ''}{project.frozen ? ' · 🔒 locked' : ''}</span>
              {user?.role === 'admin' && <button className="link small" onClick={() => { edit((p) => { p.frozen = !p.frozen }); toast(project.frozen ? 'Project unlocked, the team can edit again' : 'Project locked: only administrators can change it now', 'ok') }}>{project.frozen ? 'Unlock' : 'Lock project'}</button>}
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
      <div className="stats">
        <Stat label="Scenes" value={project.scenes.length} note={project.scenes.length ? `${formatPages(eighths)} pages` : 'No breakdown yet'} />
        <Stat label="Shoot days" value={project.shootingDays.length} note={nextShoot ? `Next ${fmtDate(nextShoot.date)}` : 'None scheduled'} />
        <Stat label="Unscheduled scenes" value={unscheduled} />
        <Stat label="Locations" value={project.locations.length} />
        <Stat label="Cast / crew" value={`${cast} / ${crew}`} />
        <Stat
          label="Budget"
          value={bt.lines ? money(bt.total, bt.currency) : '–'}
          note={
            project.budget?.cap
              ? bt.total > Number(project.budget.cap)
                ? `${money(bt.total - Number(project.budget.cap), bt.currency)} over the ${money(project.budget.cap, bt.currency)} cap`
                : `${money(Number(project.budget.cap) - bt.total, bt.currency)} left of ${money(project.budget.cap, bt.currency)}`
              : bt.act ? `${money(bt.act, bt.currency)} spent` : bt.lines ? `${bt.lines} lines` : 'No budget yet'
          }
        />
        <Stat label="Shot" value={rs.daysReported ? `${rs.scenesDone}/${rs.scenesTotal}` : '–'} note={rs.daysReported ? `${formatPages(rs.pagesShot)} pages · ${rs.daysReported} days reported` : 'No reports yet'} />
        <Stat label="Open tasks" value={openTasks} />
      </div>

      <div className="cols">
        <section className="panel">
          <div className="panel-head">
            <h2>Details</h2>
            {canEdit('projects') && (
              <Button size="sm" variant="ghost" onClick={() => setDraft({ ...project })}>
                Edit details
              </Button>
            )}
          </div>
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
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Coming up</h2>
            <Link to="calendar" className="link">
              Calendar
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">Nothing on the calendar for this project yet.</p>
          ) : (
            <ul className="event-list">
              {upcoming.map((e) => {
                const t = EVENT_TYPES.find((x) => x.key === e.type) || EVENT_TYPES[0]
                return (
                  <li key={e.id}>
                    <span className="dot" style={{ background: t.color }} />
                    <span className="ev-date">{fmtDate(e.date)}</span>
                    <span className="ev-title">{e.title}</span>
                    {e.start && <span className="muted">{e.start}</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

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
