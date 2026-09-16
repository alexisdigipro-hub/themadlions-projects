import CalendarView from '../components/CalendarView.jsx'
import { PageHead } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'

export default function CalendarAll() {
  const { state } = useStore()
  return (
    <>
      <PageHead title="Production calendar" sub="Every project you have access to, on one board" />
      <CalendarView title={state.workspace.name} />
    </>
  )
}
