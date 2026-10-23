import { Navigate } from 'react-router-dom'
import { useProject } from '../Project.jsx'
import RunOfShow from './RunOfShow.jsx'

/* An Event's Run of show tab. The project Ordino tab that was here went (Alex, 23 Oct 2026): ordinos are made in
   Roardino (side menu) and the project's ordino opens from the Overview's Ordino button, so any other project's
   old link to this tab opens the Overview. */
export default function Schedule() {
  const { project } = useProject()
  if (project.category !== 'Event') return <Navigate to=".." replace />
  return (
    <div className="schedule-sheets">
      <section className="panel"><RunOfShow /></section>
    </div>
  )
}
