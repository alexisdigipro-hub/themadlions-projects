import { useEffect, useState } from 'react'
import { Button, Empty, Input } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { can, uid, useStore } from '../../lib/store.jsx'
import RunOfShow from './RunOfShow.jsx'
import CallSheets from './CallSheets.jsx'
import { newDayFor, ordinoDates } from '../../lib/shootDays.js'

/* Ordino & Program (Alex, 10 Oct). No shoot day to add and no stripboard: the dates come from the
   project, the shoot days it has in the Calendar (else its start date), and each date has its ordino,
   a template filled in on the left with the link as it looks on a phone beside it, which is what
   the crew get. The day behind each date is made here by itself, so the Calendar, Finance, the
   weather and the share link go on working as before. An Event keeps its run of show above.
   Someone with Call sheets on view sees only the link. */
export default function Schedule() {
  const { project, user, edit, canEdit } = useProject()
  const { state, update } = useStore()
  const days = project.shootingDays || []
  const linkOnly = can(user, 'callsheets') && !can(user, 'callsheets', 'edit')
  const editable = can(user, 'callsheets', 'edit') && canEdit('callsheets')
  const dates = ordinoDates(project, state.events)
  const missing = dates.filter((d) => !days.some((x) => x.date === d))
  useEffect(() => {
    if (!editable || !missing.length) return
    edit((p) => { p.shootingDays = [...(p.shootingDays || []), ...missing.filter((d) => !(p.shootingDays || []).some((x) => x.date === d)).map((d) => newDayFor(p, d))] })
  }, [editable, missing.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const [date, setDate] = useState('')
  // with no date anywhere yet: one date here puts a shoot day for the project in the Calendar
  const addDate = () => {
    if (!date) return
    update((s) => { s.events.push({ id: uid(), projectId: project.id, type: 'shoot', title: `Shoot day · ${project.title}`, date, start: '', end: '', locationText: '', notes: '' }); return s })
    setDate('')
  }

  if (linkOnly) {
    return (
      <div className="schedule-sheets">
        {days.length ? <CallSheets linkOnly /> : <Empty title="No ordino yet">It shows here as soon as the shoot date is set.</Empty>}
      </div>
    )
  }

  return (
    <div className="schedule-sheets">
      {project.category === 'Event' && <section className="panel"><RunOfShow /></section>}
      {days.length ? (
        <section className="panel"><CallSheets /></section>
      ) : (
        <Empty title="No shoot date yet" action={editable && (
          <div className="ordino-date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Shoot date" />
            <Button variant="primary" onClick={addDate} disabled={!date}>Add to the Calendar</Button>
          </div>
        )}>
          The ordino takes its date from the project: a Shoot day for this project in the Calendar, or the project&#39;s start date in Edit details.
        </Empty>
      )}
    </div>
  )
}
