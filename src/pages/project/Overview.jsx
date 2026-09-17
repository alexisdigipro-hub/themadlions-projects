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

export default function Overview() {
  const { project, edit, canEdit } = useProject()
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

  const steps = [
    { done: !!project.script.text, label: 'Import the script', to: 'script' },
    { done: project.scenes.length > 0, label: 'Run the breakdown', to: 'breakdown' },
    { done: project.locations.length > 0, label: 'Add locations', to: 'locations' },
    { done: project.contacts.length > 0, label: 'Add cast and crew', to: 'people' },
    { done: project.shootingDays.length > 0, label: 'Build the shooting schedule', to: 'schedule' },
    { done: project.shootingDays.length > 0 && unscheduled === 0 && project.scenes.length > 0, label: 'Schedule every scene', to: 'schedule' },
  ]

  return (
    <div className="overview">
      <div className="stats">
        <Stat label="Scenes" value={project.scenes.length} note={project.scenes.length ? `${formatPages(eighths)} pages` : 'No breakdown yet'} />
        <Stat label="Shoot days" value={project.shootingDays.length} note={nextShoot ? `Next ${fmtDate(nextShoot.date)}` : 'None scheduled'} />
        <Stat label="Unscheduled scenes" value={unscheduled} />
        <Stat label="Locations" value={project.locations.length} />
        <Stat label="Cast / crew" value={`${cast} / ${crew}`} />
        <Stat label="Budget" value={bt.lines ? money(bt.total, bt.currency) : '–'} note={bt.act ? `${money(bt.act, bt.currency)} spent` : bt.lines ? `${bt.lines} lines` : 'No budget yet'} />
        <Stat label="Shot" value={rs.daysReported ? `${rs.scenesDone}/${rs.scenesTotal}` : '–'} note={rs.daysReported ? `${formatPages(rs.pagesShot)} pages · ${rs.daysReported} days reported` : 'No reports yet'} />
        <Stat label="Open tasks" value={openTasks} />
      </div>

      <div className="cols">
        <section className="panel">
          <div className="panel-head">
            <h2>Where this project stands</h2>
            {canEdit('projects') && (
              <Button size="sm" variant="ghost" onClick={() => setDraft({ ...project })}>
                Edit details
              </Button>
            )}
          </div>
          <ul className="checklist">
            {steps.map((s) => (
              <li key={s.label} className={s.done ? 'done' : ''}>
                <Link to={s.to}>{s.label}</Link>
              </li>
            ))}
          </ul>
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
