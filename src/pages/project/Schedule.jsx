import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useProject } from '../Project.jsx'
import { can, useStore } from '../../lib/store.jsx'
import RunOfShow from './RunOfShow.jsx'
import RoardinoPage from '../RoardinoPage.jsx'
import { newDayFor, ordinoDates } from '../../lib/shootDays.js'

/* The project's Ordino tab: Roardino with this project's ordinos (Alex, 23 Oct 2026; until then the hub's own
   ordino form, src/pages/project/CallSheets.jsx, now gone). The shoot days still come from the project's dates
   (its Shoot days in the Calendar, else its start date) and are made here by themselves, so Roardino's New ordino
   and Fill from project find the day, and the Calendar, Finance and the weather go on working as before.
   An Event keeps its run of show above. Only whoever may edit the ordino gets this tab; everyone sees the
   finished ordino on the Overview. */
export default function Schedule() {
  const { project, user, edit, canEdit } = useProject()
  const { state } = useStore()
  const days = project.shootingDays || []
  const editable = can(user, 'callsheets', 'edit') && canEdit('callsheets')
  const dates = ordinoDates(project, state.events)
  const missing = dates.filter((d) => !days.some((x) => x.date === d))
  useEffect(() => {
    if (!editable || !missing.length) return
    edit((p) => { p.shootingDays = [...(p.shootingDays || []), ...missing.filter((d) => !(p.shootingDays || []).some((x) => x.date === d)).map((d) => newDayFor(p, d))] })
  }, [editable, missing.join()]) // eslint-disable-line react-hooks/exhaustive-deps

  // the tab is for whoever may edit the ordino; everyone else has it on the Overview (Alex, 10 Oct)
  if (!can(user, 'callsheets', 'edit')) return <Navigate to=".." replace />

  return (
    <div className="schedule-sheets">
      {project.category === 'Event' && <section className="panel"><RunOfShow /></section>}
      <RoardinoPage project={project.id} className="in-project" />
    </div>
  )
}
