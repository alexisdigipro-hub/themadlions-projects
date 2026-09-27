import CalendarView from '../components/CalendarView.jsx'
import { PageHead } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'

export default function CalendarAll() {
  const { state } = useStore()
  return (
    <>
      <PageHead title={<>THE<strong>MAD</strong>LIONS CALENDAR</>} />
      <CalendarView title={state.workspace.name} />
    </>
  )
}
