import { PageHead } from '../components/ui.jsx'
import { useCurrentUser, useStore } from '../lib/store.jsx'
import { WorkLogTable, entryTotals, money2 } from '../components/WorkLog.jsx'

export default function MyWork() {
  const { state } = useStore()
  const user = useCurrentUser()
  const mine = (state.worklog || []).filter((e) => e.userId === user?.id)
  const t = entryTotals(mine)
  return (
    <div>
      <PageHead title="My work" sub={mine.length ? `${t.jobs} jobs logged · ${money2(t.pending)} still pending overall` : 'Your own list of jobs: what you did, for whom, how much, and whether it has been paid. Only you and the administrators see it.'} />
      <WorkLogTable userId={user?.id} editable />
    </div>
  )
}
