import CalendarView from '../components/CalendarView.jsx'
import { PageHead, useIsMobile } from '../components/ui.jsx'
import { useStore } from '../lib/store.jsx'

export default function CalendarAll() {
  const { state } = useStore()
  const mobile = useIsMobile()
  return (
    <>
      {/* no title on a phone (Alex, 15 Oct): the controls come first, under the app's own top bar */}
      {!mobile && <PageHead title={<>THE<strong>MAD</strong>LIONS CALENDAR</>} />}
      <CalendarView title={state.workspace.name} />
    </>
  )
}
