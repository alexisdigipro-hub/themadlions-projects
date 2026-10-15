import CalendarView from '../components/CalendarView.jsx'
import { useStore } from '../lib/store.jsx'

export default function CalendarAll() {
  const { state } = useStore()
  // no page title (Alex, 15 Oct: more room): the controls come first
  return <CalendarView title={state.workspace.name} />
}
