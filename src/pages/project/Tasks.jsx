import { Fragment, useEffect, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { departmentsOf, today, uid, useCurrentUser, useStore } from '../../lib/store.jsx'
import { sendAutoNotice, userByName } from '../../components/Notices.jsx'
import { fmtDate } from '../../lib/dates.js'
import { Grip, moveItem, useDragSort } from '../../components/DragSort.jsx'

export const TASK_STATUS = [
  ['todo', 'To do'],
  ['doing', 'In progress'],
  ['blocked', 'Blocked'],
  ['done', 'Done'],
]
/* The statuses a task can have, which an administrator edits (Alex, 9 Oct: Status > Edit statuses…),
   kept in settings.taskStatuses. The first ('todo') is where a new task starts and the last ('done')
   means done, which sends it to Completed: both can be renamed, not removed. The ones in between are
   free. A task left on a status that was removed reads as the first one. */
const DEFAULT_STATUSES = TASK_STATUS.map(([id, label]) => ({ id, label }))
export function taskStatuses(state) {
  const saved = state?.settings?.taskStatuses
  const list = Array.isArray(saved) && saved.length ? saved : DEFAULT_STATUSES
  const todo = list.find((x) => x.id === 'todo') || DEFAULT_STATUSES[0]
  const done = list.find((x) => x.id === 'done') || DEFAULT_STATUSES[3]
  return [todo, ...list.filter((x) => x.id !== 'todo' && x.id !== 'done' && x.label), done]
}
/* Each status's colour: the one picked in Edit statuses (Alex, 9 Oct), else grey for the first,
   green for done, red for Blocked and blue for the rest */
export function statusColor(st) {
  if (st?.color) return st.color
  return st?.id === 'todo' ? '#8e8e93' : st?.id === 'done' ? '#3fa66b' : st?.id === 'blocked' ? '#e5484d' : '#6c9bd1'
}
/* The small tag on a task for a status other than the first and the last */
export function StatusPill({ status }) {
  const { state } = useStore()
  if (!status || status === 'todo' || status === 'done') return null
  const st = taskStatuses(state).find((x) => x.id === status)
  if (!st) return null
  return <span className="pill" style={{ color: statusColor(st) }}>{st.label}</span>
}
export function StatusesModal({ onClose }) {
  const { state, update } = useStore()
  const [rows, setRows] = useState(() => taskStatuses(state).map((x) => ({ ...x })))
  const setLabel = (i, label) => setRows(rows.map((r, j) => (j === i ? { ...r, label } : r)))
  const setColor = (i, color) => setRows(rows.map((r, j) => (j === i ? { ...r, color } : r)))
  // drag a status by its ⋮⋮ (Alex, 10 Oct: no more arrows); the first and the last stay where they are
  const sort = useDragSort((from, to) => setRows((list) => moveItem(list, from, Math.min(Math.max(to, 1), list.length - 2))))
  const add = () => setRows([...rows.slice(0, -1), { id: uid(), label: '' }, rows[rows.length - 1]])
  const remove = (i) => setRows(rows.filter((_, j) => j !== i))
  const save = () => {
    const clean = rows
      .map((r) => ({ id: r.id, label: r.label.trim() || (r.id === 'todo' ? 'To do' : r.id === 'done' ? 'Done' : ''), ...(r.color ? { color: r.color } : {}) }))
      .filter((r) => r.label)
    update((s) => { s.settings = { ...s.settings, taskStatuses: clean }; return s })
    onClose()
  }
  return (
    <Modal open title="Statuses" onClose={onClose} footer={<><Button variant="ghost" onClick={() => setRows(DEFAULT_STATUSES.map((x) => ({ ...x })))}>Reset</Button><span className="grow" /><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <p className="small muted">The first is where a new task starts and the last means done (the task moves to Completed): rename them as you like. Add, rename, reorder or remove the ones in between. The dot on the left picks each one's colour. A task on a removed status goes back to the first.</p>
      <div className="status-edit">
        {rows.map((r, i) => {
          const fixed = i === 0 || i === rows.length - 1
          return (
            <div key={r.id} {...sort.row('st', i)} className={`status-edit-row ${fixed ? '' : sort.cls('st', i)}`}>
              <input type="color" className="status-color" value={statusColor(r)} onChange={(e) => setColor(i, e.target.value)} aria-label="Colour" title="Colour" />
              <Input value={r.label} onChange={(e) => setLabel(i, e.target.value)} placeholder={fixed ? (i === 0 ? 'To do' : 'Done') : 'Waiting for client'} autoFocus={!r.label && !fixed} />
              {fixed ? <span className="small muted status-edit-note">{i === 0 ? 'start' : 'done'}</span> : (
                <span className="row-actions">
                  <Grip {...sort.grip('st', i)} />
                  <button type="button" className="link danger" onClick={() => remove(i)} aria-label="Remove">×</button>
                </span>
              )}
            </div>
          )
        })}
      </div>
      <Button variant="ghost" onClick={add}>+ Add status</Button>
    </Modal>
  )
}

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
                <StatusPill status={t.status} />
              </div>
              <div className="task-meta muted small">
                {showProject && (projectsById?.[t.projectId] ? <span className="task-proj" style={{ '--pc': projectsById[t.projectId].color }}>{projectsById[t.projectId].title}</span> : <span className="task-proj" style={{ '--pc': 'var(--muted)' }}>General</span>)}
                <span>{t.dept}</span>
                {subCount(t).all > 0 && <span>☑ {subCount(t).done}/{subCount(t).all}</span>}
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
/* Two separate fields (Alex, 9 Oct): List, the administrators' lists (departments) a task can sit on,
   shown wherever such lists exist; and Project, the project it is linked to, offered on the Tasks
   page (`projects`). A project's own Tasks tab passes no projects: its tasks are that project's. */
/* Tasks inside a task (Alex, 9 Oct): task.subtasks = [{ id, title, done }], a checklist edited in
   the task form and ticked straight from the Tasks page. They are steps of the task, so they share
   its assignee, list and project; the task itself is still ticked on its own. */
export const subCount = (t) => {
  const s = Array.isArray(t?.subtasks) ? t.subtasks : []
  return { done: s.filter((x) => x.done).length, all: s.length }
}
function Subtasks({ items, onChange }) {
  const [text, setText] = useState('')
  const add = () => {
    const title = text.trim()
    if (!title) return
    onChange([...items, { id: uid(), title, done: false }])
    setText('')
  }
  const patch = (id, v) => onChange(items.map((x) => (x.id === id ? { ...x, ...v } : x)))
  return (
    <div className="field">
      <span className="field-label">Subtasks{items.length ? ` · ${items.filter((x) => x.done).length}/${items.length}` : ''}</span>
      <div className="subtasks">
        {items.map((x) => (
          <div key={x.id} className={`subtask${x.done ? ' done' : ''}`}>
            <input type="checkbox" checked={!!x.done} onChange={(e) => patch(x.id, { done: e.target.checked })} aria-label="Done" />
            <input className="subtask-title" value={x.title} onChange={(e) => patch(x.id, { title: e.target.value })} />
            <button type="button" className="link danger" onClick={() => onChange(items.filter((y) => y.id !== x.id))} aria-label="Remove subtask">×</button>
          </div>
        ))}
        <input className="input subtask-new" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} onBlur={add} placeholder="+ Add a subtask, then Enter" />
      </div>
    </div>
  )
}

export function TaskModal({ draft, setDraft, onSave, onClose, projects }) {
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
  const ownLists = state.settings?.taskLists || []
  const listId = ownLists.some((l) => l.id === draft.listId) ? draft.listId : ''
  const statuses = taskStatuses(state)
  const isAdmin = useCurrentUser()?.role === 'admin'
  const [editStatuses, setEditStatuses] = useState(false)
  return (
    <>
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
        <Subtasks items={Array.isArray(draft.subtasks) ? draft.subtasks : []} onChange={(v) => set('subtasks', v)} />
        {(projects || ownLists.length > 0) && (
          <div className="row-2">
            {projects && <Field label="Project"><Select value={draft.projectId || ''} onChange={(e) => set('projectId', e.target.value)} options={[['', 'No project'], ...projects.map((p) => [p.id, p.title])]} /></Field>}
            {ownLists.length > 0 && <Field label="List"><Select value={listId} onChange={(e) => set('listId', e.target.value)} options={[['', 'No list'], ...ownLists.map((l) => [l.id, `${l.icon || '☰'} ${l.name}`])]} /></Field>}
          </div>
        )}
        <div className="row-2">
          <Field label="Assignee"><Select value={draft.assignee || ''} onChange={(e) => pickAssignee(e.target.value)} options={assigneeOptions} /></Field>
          <Field label="Deadline"><Input type="date" value={draft.due} onChange={(e) => set('due', e.target.value)} /></Field>
        </div>
        <div className="row-3">
          <Field label="Department"><Select value={draft.dept} onChange={(e) => set('dept', e.target.value)} options={TASK_DEPTS} /></Field>
          <Field label="Priority"><Select value={draft.priority} onChange={(e) => set('priority', e.target.value)} options={PRIORITY_OPTIONS} /></Field>
          <Field label="Status"><Select value={statuses.some((x) => x.id === draft.status) ? draft.status : 'todo'} onChange={(e) => (e.target.value === '__edit' ? setEditStatuses(true) : set('status', e.target.value))} options={[...statuses.map((x) => [x.id, x.label]), ...(isAdmin ? [['__edit', 'Edit statuses…']] : [])]} /></Field>
        </div>
        <Field label="Notes"><Textarea rows={6} value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Who to call, what was agreed, links" /></Field>
      </div>
    </Modal>
    {editStatuses && <StatusesModal onClose={() => setEditStatuses(false)} />}
    </>
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
