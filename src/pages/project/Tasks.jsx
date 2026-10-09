import { Fragment, useEffect, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { departmentsOf, today, uid, useCurrentUser, useStore } from '../../lib/store.jsx'
import { sendAutoNotice, userByName } from '../../components/Notices.jsx'
import { fmtDate } from '../../lib/dates.js'

export const TASK_STATUS = [
  ['todo', 'To do'],
  ['doing', 'In progress'],
  ['blocked', 'Blocked'],
  ['done', 'Done'],
]
export const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const PRIORITY_OPTIONS = PRIORITIES.map((p) => [p, p.toUpperCase()])
export const TASK_DEPTS = ['Production', 'Direction', 'Camera', 'Lighting', 'Sound', 'Art', 'Wardrobe', 'Makeup & hair', 'Locations', 'Casting', 'Post', 'Client', 'Legal', 'Other']

/* Alex: a teammate sees only the tasks assigned to them; administrators see every task.
   A task's assignee is stored as a name (typed, or picked from the team and the project's
   contacts), so the match is on the name, ignoring case and stray spaces, the same way a new
   assignment finds who to notify. An unassigned task is nobody's, so only administrators see it.
   This decides what is drawn. It is not a lock: project tasks travel inside the project
   document and general ones in the shared library, so a teammate's browser still receives them. */
export const seesAllTasks = (user) => user?.role === 'admin'
export const isAssignedTo = (t, user) => {
  const me = (user?.name || '').trim().toLowerCase()
  return !!me && (t.assignee || '').trim().toLowerCase() === me
}
export const visibleTasks = (list, user) => (seesAllTasks(user) ? list : list.filter((t) => isAssignedTo(t, user)))
/* A deleted task is kept with deletedAt (Alex, 9 Oct: Deleted under Completed on the Tasks page) and is
   left out everywhere else; Restore there brings it back, Delete forever drops it. */
export const tasksFor = (list, user) => visibleTasks(list.filter((t) => !t.deletedAt), user)
export const binTask = (x, user) => { x.deletedAt = new Date().toISOString(); x.deletedBy = user?.name || '' }

export const emptyTask = (partial = {}) => ({
  id: uid(), title: '', notes: '', assigneeId: '', assignee: '', dept: 'Production', due: '', priority: 'normal',
  status: 'todo', createdAt: new Date().toISOString(), doneAt: '', ...partial,
})

export function TaskList({ tasks, onEdit, onStatus, onDelete, editable, showProject, projectsById }) {
  const t0 = today()
  return (
    <ul className="task-list">
      {tasks.map((t) => {
        const late = t.due && t.due < t0 && t.status !== 'done'
        return (
          <li key={t.id} className={`task ${t.status} p-${t.priority}`}>
            <button className="task-check" aria-label="Toggle done" disabled={!editable} onClick={() => onStatus(t, t.status === 'done' ? 'todo' : 'done')}>
              {t.status === 'done' ? '✓' : ''}
            </button>
            <div className="task-main" onClick={() => editable && onEdit(t)}>
              <div className="task-title">
                {t.title}
                {t.priority === 'urgent' && <span className="pill urgent">urgent</span>}
                {t.priority === 'high' && <span className="pill high">high</span>}
                {t.status === 'blocked' && <span className="pill blocked">blocked</span>}
                {t.status === 'doing' && <span className="pill doing">in progress</span>}
              </div>
              <div className="task-meta muted small">
                {showProject && (projectsById?.[t.projectId] ? <span className="task-proj" style={{ '--pc': projectsById[t.projectId].color }}>{projectsById[t.projectId].title}</span> : <span className="task-proj" style={{ '--pc': 'var(--muted)' }}>General</span>)}
                <span>{t.dept}</span>
                {t.assignee && <span>{t.assignee}</span>}
                {t.due && <span className={late ? 'late' : ''}>{late ? 'Overdue · ' : 'Due '}{fmtDate(t.due)}</span>}
                {t.notes && <span className="task-notes">{t.notes}</span>}
              </div>
            </div>
            {editable && (
              <div className="row-actions no-print">
                <button onClick={() => onEdit(t)}>Edit</button>
                <Confirm onConfirm={() => onDelete(t)} label="Delete">×</Confirm>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* The task form. Wide, with room to read (Alex), and the assignee picked from the team rather
   than typed: a task is matched to its person by name, so a picked name is one that will match.
   A task from before this, assigned to someone outside the team (a crew contact), keeps that name
   as an option so opening it does not quietly drop who it was for. */
/* `lists` (the Tasks page: Company, the administrators' lists, the projects) adds a List field, so a
   task goes on the list picked there (Alex, 9 Oct). A project's own Tasks tab passes none. */
export function TaskModal({ draft, setDraft, onSave, onClose, lists }) {
  const { state } = useStore()
  const TASK_DEPTS = [...new Set([...departmentsOf(state), 'Legal'])]
  const set = (k, v) => setDraft({ ...draft, [k]: v })
  const team = (state.users || []).filter((u) => u.active !== false && u.name).sort((a, b) => a.name.localeCompare(b.name, ['el', 'en'], { sensitivity: 'base' }))
  const outside = draft.assignee && !team.some((u) => u.name.trim().toLowerCase() === draft.assignee.trim().toLowerCase())
  const assigneeOptions = [
    ['', 'Nobody yet'],
    ...team.map((u) => [u.name, u.name]),
    ...(outside ? [[draft.assignee, `${draft.assignee} (not in the team)`]] : []),
  ]
  const pickAssignee = (name) => setDraft({ ...draft, assignee: name, assigneeId: team.find((u) => u.name === name)?.id || '' })
  const listKey = draft.projectId ? `p:${draft.projectId}` : draft.listId && (lists || []).some((l) => l.key === `l:${draft.listId}`) ? `l:${draft.listId}` : 'general'
  const pickList = (k) => setDraft({ ...draft, projectId: k.startsWith('p:') ? k.slice(2) : '', listId: k.startsWith('l:') ? k.slice(2) : '' })
  return (
    <Modal
      open
      wide
      title={draft.title ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSave}>Save task</Button>
        </>
      }
    >
      <div className="task-form">
        <Field label="Task"><Input autoFocus value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Lock the rooftop permit" /></Field>
        {lists?.length > 1 && <Field label="List"><Select value={listKey} onChange={(e) => pickList(e.target.value)} options={lists.map((l) => [l.key, l.project ? `🎬 ${l.name}` : `${l.icon} ${l.name}`])} /></Field>}
        <div className="row-2">
          <Field label="Assignee"><Select value={draft.assignee || ''} onChange={(e) => pickAssignee(e.target.value)} options={assigneeOptions} /></Field>
          <Field label="Deadline"><Input type="date" value={draft.due} onChange={(e) => set('due', e.target.value)} /></Field>
        </div>
        <div className="row-3">
          <Field label="Department"><Select value={draft.dept} onChange={(e) => set('dept', e.target.value)} options={TASK_DEPTS} /></Field>
          <Field label="Priority"><Select value={draft.priority} onChange={(e) => set('priority', e.target.value)} options={PRIORITY_OPTIONS} /></Field>
          <Field label="Status"><Select value={draft.status} onChange={(e) => set('status', e.target.value)} options={TASK_STATUS} /></Field>
        </div>
        <Field label="Notes"><Textarea rows={6} value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Who to call, what was agreed, links" /></Field>
      </div>
    </Modal>
  )
}

export function DeptChips({ tasks, dept, setDept, filter = 'open' }) {
  const { state } = useStore()
  const counts = {}
  tasks.forEach((t) => {
    const openish = filter === 'all' ? true : filter === 'done' ? t.status === 'done' : t.status !== 'done'
    if (!openish) return
    counts[t.dept || 'Other'] = (counts[t.dept || 'Other'] || 0) + 1
  })
  const DEPTS = departmentsOf(state)
  const depts = [...DEPTS, ...Object.keys(counts).filter((d) => !DEPTS.includes(d))].filter((d) => counts[d])
  if (!depts.length) return null
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <div className="chips dept-chips">
      <button type="button" className={`chip ${!dept ? 'on' : ''}`} onClick={() => setDept('')}>All <small>{total}</small></button>
      {depts.map((d) => (
        <button key={d} type="button" className={`chip ${dept === d ? 'on' : ''}`} onClick={() => setDept(dept === d ? '' : d)}>{d} <small>{counts[d]}</small></button>
      ))}
    </div>
  )
}

/* On the project Overview an empty panel is noise, so it is asked to keep quiet until there is
   something in it: `hideEmpty` draws nothing while the project has no tasks, and `startSignal`
   (a counter the Overview bumps) opens the new-task form from a button out there. The Tasks tab
   itself passes neither and is unchanged. */
export default function Tasks({ hideEmpty = false, startSignal = 0 }) {
  const { project, edit, canEdit } = useProject()
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const editable = canEdit('tasks')
  const [draft, setDraft] = useState(null)
  const [filter, setFilter] = useState('open') // open | done | all
  const [dept, setDept] = useState('')
  const tasks = tasksFor(project.tasks || [], me)


  useEffect(() => { if (startSignal) setDraft(emptyTask({ projectId: project.id })) }, [startSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tell the assignee, but only when the task actually lands on someone new, and never yourself.
  const notifyAssignee = (next, before, where) => {
    if (!next.assignee || next.assignee === before?.assignee || next.status === 'done') return
    const target = userByName(state, next.assignee)
    if (!target || target.id === me?.id) return
    sendAutoNotice(update, {
      kind: 'taskAssigned', key: `task:${next.id}`,
      fromId: me?.id, fromName: me?.name, to: [target.id],
      title: 'New task for you',
      body: [next.title, where, next.due ? `due ${next.due}` : ''].filter(Boolean).join(' · '),
    })
  }

  const shown = tasks
    .filter((t) => (filter === 'all' ? true : filter === 'done' ? t.status === 'done' : t.status !== 'done'))
    .filter((t) => (dept ? t.dept === dept : true))
    .sort((a, b) => (a.due || '9').localeCompare(b.due || '9') || PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority))

  const save = () => {
    if (!draft.title.trim()) return toast('Give the task a title.', 'error')
    const before = tasks.find((t) => t.id === draft.id)
    edit((p) => {
      p.tasks = p.tasks || []
      const i = p.tasks.findIndex((t) => t.id === draft.id)
      const next = { ...draft, doneAt: draft.status === 'done' ? draft.doneAt || new Date().toISOString() : '' }
      if (i >= 0) p.tasks[i] = next
      else p.tasks.push(next)
    })
    notifyAssignee(draft, before, project.title)
    setDraft(null)
    toast('Task saved', 'ok')
  }
  const setStatus = (t, status) => edit((p) => {
    const x = (p.tasks || []).find((y) => y.id === t.id)
    if (x) { x.status = status; x.doneAt = status === 'done' ? new Date().toISOString() : '' }
  })
  const remove = (t) => edit((p) => { const x = (p.tasks || []).find((y) => y.id === t.id); if (x) binTask(x, me) })

  const open = tasks.filter((t) => t.status !== 'done').length
  const overdue = tasks.filter((t) => t.status !== 'done' && t.due && t.due < today()).length

  // Nothing to show yet: the form still has to be here, or the Add task button out on the
  // Overview would open nothing.
  if (hideEmpty && !tasks.length) {
    return draft ? <TaskModal draft={draft} setDraft={setDraft} onSave={save} onClose={() => setDraft(null)} /> : null
  }

  // On the Overview the panel is this component's own, so saving the first task does not move
  // it to a different place in the page and remount it mid-save.
  const Wrap = hideEmpty ? 'section' : Fragment
  return (
    <Wrap {...(hideEmpty ? { className: 'panel' } : {})}>
    <div className="tasks">
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>{open} open</strong>
          <span className="muted">{tasks.length - open} done{overdue ? ` · ${overdue} overdue` : ''}</span>
        </div>
        <div className="toolbar-actions">
          <div className="segmented small">
            {[['open', 'Open'], ['done', 'Done'], ['all', 'All']].map(([k, l]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          {editable && (
            <Button variant="primary" onClick={() => setDraft(emptyTask({ projectId: project.id }))}>Add task</Button>
          )}
        </div>
      </div>

      {tasks.length > 0 && <DeptChips tasks={tasks} dept={dept} setDept={setDept} filter={filter} />}

      {!tasks.length ? (
        <Empty title="No tasks yet">Permits, casting calls, gear pickups, client approvals. Assign each one to a person with a due date and it shows up on their Tasks page.</Empty>
      ) : !shown.length ? (
        <Empty title="Nothing here">Change the filter to see other tasks.</Empty>
      ) : (
        <TaskList tasks={shown} editable={editable} onEdit={(t) => setDraft({ ...t })} onStatus={setStatus} onDelete={remove} />
      )}

      {draft && <TaskModal draft={draft} setDraft={setDraft} onSave={save} onClose={() => setDraft(null)} />}
    </div>
    </Wrap>
  )
}
