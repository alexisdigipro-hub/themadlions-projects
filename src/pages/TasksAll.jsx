import { useMemo, useState } from 'react'
import { PageHead, Select, useToast } from '../components/ui.jsx'
import { can, today, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { DeptChips, TaskList, TaskModal, emptyTask } from './project/Tasks.jsx'
import { Button } from '../components/ui.jsx'
import { sendAutoNotice, userByName } from '../components/Notices.jsx'

export default function TasksAll() {
  const { state, updateProject, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [who, setWho] = useState('all') // all | me — opens on Everyone
  const [status, setStatus] = useState('open')
  const [dept, setDept] = useState('')
  const [proj, setProj] = useState('')
  const [draft, setDraft] = useState(null)

  const projects = visibleProjects(state, user)
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]))
  const editable = can(user, 'tasks', 'edit')
  const all = [
    ...projects.flatMap((p) => (p.tasks || []).map((t) => ({ ...t, projectId: p.id }))),
    ...(state.todos || []).map((t) => ({ ...t, projectId: '' })),
  ]
  const mine = (t) => !t.assignee || t.assignee.trim().toLowerCase() === (user?.name || '').trim().toLowerCase()
  const t0 = today()

  const base = all.filter((t) => (who === 'me' ? mine(t) : true)).filter((t) => (proj === 'general' ? !t.projectId : proj ? t.projectId === proj : true))
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

  const persist = (t, fn) => {
    if (!t.projectId) return update((s) => { const x = s.todos.find((y) => y.id === t.id); if (x) fn(x); return s })
    updateProject(t.projectId, (p) => {
      p.tasks = p.tasks || []
      const x = p.tasks.find((y) => y.id === t.id)
      if (x) fn(x, p)
    })
  }
  const setTaskStatus = (t, s) => persist(t, (x) => { x.status = s; x.doneAt = s === 'done' ? new Date().toISOString() : '' })
  const remove = (t) => (t.projectId ? updateProject(t.projectId, (p) => (p.tasks = (p.tasks || []).filter((y) => y.id !== t.id))) : update((s) => { s.todos = s.todos.filter((y) => y.id !== t.id); return s }))
  const save = () => {
    if (!draft.title.trim()) return toast('Give the task a title.', 'error')
    const done = { doneAt: draft.status === 'done' ? draft.doneAt || new Date().toISOString() : '' }
    const before = all.find((t) => t.id === draft.id)
    // Handing a task to someone else from this page tells them, exactly as it does inside a project.
    const target = draft.assignee && draft.assignee !== before?.assignee && draft.status !== 'done' ? userByName(state, draft.assignee) : undefined
    if (target && target.id !== user?.id) {
      sendAutoNotice(update, {
        kind: 'taskAssigned', key: `task:${draft.id}`,
        fromId: user?.id, fromName: user?.name, to: [target.id],
        title: 'New task for you',
        body: [draft.title, projectsById[draft.projectId]?.title, draft.due ? `due ${draft.due}` : ''].filter(Boolean).join(' · '),
      })
    }
    if (!draft.projectId) {
      update((s) => {
        const i = s.todos.findIndex((y) => y.id === draft.id)
        const { projectId, ...t } = { ...draft, ...done }
        if (i >= 0) s.todos[i] = t
        else s.todos.push(t)
        return s
      })
    } else persist(draft, (x) => Object.assign(x, draft, done))
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
          <button className={who === 'all' ? 'on' : ''} onClick={() => setWho('all')}>Everyone</button>
          <button className={who === 'me' ? 'on' : ''} onClick={() => setWho('me')}>Mine</button>
        </div>
        <div className="segmented small">
          {[['open', 'Open'], ['done', 'Done'], ['all', 'All']].map(([k, l]) => (
            <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l}</button>
          ))}
        </div>
        <Select className="compact" value={proj} onChange={(e) => setProj(e.target.value)} options={[['', 'Everything'], ['general', 'General only'], ...projects.map((p) => [p.id, p.title])]} />
        {editable && <Button variant="primary" onClick={() => setDraft(emptyTask({ projectId: '', dept: 'Other' }))}>Add task</Button>}
      </PageHead>
      {base.length > 0 && <DeptChips tasks={base} dept={dept} setDept={setDept} filter={status} />}

      {!shown.length ? (
        <p className="muted">Nothing to do. Add a general task here, or project tasks inside each project's Tasks tab.</p>
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
