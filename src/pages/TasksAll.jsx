import { useMemo, useState } from 'react'
import { PageHead, Select, useToast } from '../components/ui.jsx'
import { can, today, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { DeptChips, TaskList, TaskModal } from './project/Tasks.jsx'

export default function TasksAll() {
  const { state, updateProject } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [who, setWho] = useState('me') // me | all
  const [status, setStatus] = useState('open')
  const [dept, setDept] = useState('')
  const [proj, setProj] = useState('')
  const [draft, setDraft] = useState(null)
  const editable = can(user, 'tasks', 'edit')

  const projects = visibleProjects(state, user)
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]))
  const all = projects.flatMap((p) => (p.tasks || []).map((t) => ({ ...t, projectId: p.id })))
  const mine = (t) => !t.assignee || t.assignee.trim().toLowerCase() === (user?.name || '').trim().toLowerCase()
  const t0 = today()

  const base = all.filter((t) => (who === 'me' ? mine(t) : true)).filter((t) => (proj ? t.projectId === proj : true))
  const shown = base
    .filter((t) => (dept ? (t.dept || 'Other') === dept : true))
    .filter((t) => (status === 'all' ? true : status === 'done' ? t.status === 'done' : t.status !== 'done'))
    .sort((a, b) => (a.due || '9').localeCompare(b.due || '9'))

  const groups = useMemo(() => {
    const g = { overdue: [], today: [], week: [], later: [], nodate: [], done: [] }
    const week = new Date(); week.setDate(week.getDate() + 7)
    const wk = `${week.getFullYear()}-${String(week.getMonth() + 1).padStart(2, '0')}-${String(week.getDate()).padStart(2, '0')}`
    shown.forEach((t) => {
      if (t.status === 'done') g.done.push(t)
      else if (!t.due) g.nodate.push(t)
      else if (t.due < t0) g.overdue.push(t)
      else if (t.due === t0) g.today.push(t)
      else if (t.due <= wk) g.week.push(t)
      else g.later.push(t)
    })
    return g
  }, [shown, t0])

  const people = [...new Set([...state.users.map((u) => u.name), ...projects.flatMap((p) => p.contacts.map((c) => c.name))])].filter(Boolean)

  const persist = (t, fn) => updateProject(t.projectId, (p) => {
    p.tasks = p.tasks || []
    const x = p.tasks.find((y) => y.id === t.id)
    if (x) fn(x, p)
  })
  const setTaskStatus = (t, s) => persist(t, (x) => { x.status = s; x.doneAt = s === 'done' ? new Date().toISOString() : '' })
  const remove = (t) => updateProject(t.projectId, (p) => (p.tasks = (p.tasks || []).filter((y) => y.id !== t.id)))
  const save = () => {
    if (!draft.title.trim()) return toast('Give the task a title.', 'error')
    persist(draft, (x) => Object.assign(x, draft, { doneAt: draft.status === 'done' ? draft.doneAt || new Date().toISOString() : '' }))
    setDraft(null)
    toast('Task saved', 'ok')
  }

  const Section = ({ title, items }) =>
    items.length ? (
      <section className="task-group">
        <h3>{title} <span className="muted">{items.length}</span></h3>
        <TaskList tasks={items} editable={editable} showProject projectsById={projectsById} onEdit={(t) => setDraft({ ...t })} onStatus={setTaskStatus} onDelete={remove} />
      </section>
    ) : null

  return (
    <div>
      <PageHead title="Tasks" sub={`${all.filter((t) => t.status !== 'done').length} open across ${projects.length} projects`}>
        <div className="segmented small">
          <button className={who === 'me' ? 'on' : ''} onClick={() => setWho('me')}>Mine</button>
          <button className={who === 'all' ? 'on' : ''} onClick={() => setWho('all')}>Everyone</button>
        </div>
        <Select value={proj} onChange={(e) => setProj(e.target.value)} options={[['', 'All projects'], ...projects.map((p) => [p.id, p.title])]} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[['open', 'Open'], ['done', 'Done'], ['all', 'All']]} />
      </PageHead>
      {base.length > 0 && <DeptChips tasks={base} dept={dept} setDept={setDept} filter={status} />}

      {!shown.length ? (
        <p className="muted">Nothing to do. Tasks are created inside each project, in the Tasks tab.</p>
      ) : (
        <>
          <Section title="Overdue" items={groups.overdue} />
          <Section title="Today" items={groups.today} />
          <Section title="Next 7 days" items={groups.week} />
          <Section title="Later" items={groups.later} />
          <Section title="No date" items={groups.nodate} />
          <Section title="Done" items={groups.done} />
        </>
      )}

      {draft && <TaskModal draft={draft} setDraft={setDraft} onSave={save} onClose={() => setDraft(null)} people={people} />}
    </div>
  )
}
