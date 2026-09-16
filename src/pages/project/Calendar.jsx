import CalendarView from '../../components/CalendarView.jsx'
import { useProject } from '../Project.jsx'

export default function ProjectCalendar() {
  const { project } = useProject()
  return <CalendarView projectId={project.id} title={project.title} />
}
