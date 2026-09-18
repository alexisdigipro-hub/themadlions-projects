import { useMemo, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { departmentsOf, today, uid, useStore } from '../../lib/store.jsx'
import { fmtDate } from '../../lib/dates.js'

export const TASK_STATUS = [
  ['todo', 'To do'],
  ['doing', 'In progress'],
  ['blocked', 'Blocked'],
  ['done', 'Done'],
]
export const PRIORITIES = ['low', 'normal', 'high', 'urgent']
export const TASK_DEPTS = ['Production', 'Direction', 'Camera', 'Lighting', 'Sound', 'Art', 'Wardrobe', 'Makeup & hair', 'Locations', 'Casting', 'Post', 'Client', 'Legal', 'Other']

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

export function TaskModal({ draft, setDraft, onSave, onClose, people }) {
  const { state } = useStore()
  const TASK_DEPTS = [...new Set([...departmentsOf(state), 'Legal'])]
  const set = (k, v) => setDraft({ ...draft, [k]: v })
  return (
    <Modal
      open
      title={draft.title ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSave}>Save task</Button>
        </>
      }
    >
      <Field label="Task"><Input autoFocus value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Lock the rooftop permit" /></Field>
      <div className="row-3">
        <Field label="Assignee">
          <Input list="task-people" value={draft.assignee} onChange={(e) => set('assignee', e.target.value)} placeholder="Name" />
          <datalist id="task-people">{people.map((p) => <option key={p} value={p} />)}</datalist>
        </Field>
        <Field label="Department"><Select value={draft.dept} onChange={(e) => set('dept', e.target.value)} options={TASK_DEPTS} /></Field>
        <Field label="Due"><Input type="date" value={draft.due} onChange={(e) => set('due', e.target.value)} /></Field>
      </div>
      <div className="row-2">
        <Field label="Priority"><Select value={draft.priority} onChange={(e) => set('priority', e.target.value)} options={PRIORITIES} /></Field>
        <Field label="Status"><Select value={draft.status} onChange={(e) => set('status', e.target.value)} options={TASK_STATUS} /></Field>
      </div>
      <Field label="Notes"><Textarea rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
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

export default function Tasks() {
  const { project, edit, canEdit } = useProject()
  const { state } = useStore()
  const toast = useToast()
  const editable = canEdit('tasks')
  const [draft, setDraft] = useState(null)
  const [filter, setFilter] = useState('open') // open | done | all
  const [dept, setDept] = useState('')
  const tasks = project.tasks || []

  const people = useMemo(() => [...new Set([...state.users.map((u) => u.name), ...project.contacts.map((c) => c.name)])].filter(Boolean), [state.users, project.contacts])

  const shown = tasks
    .filter((t) => (filter === 'all' ? true : filter === 'done' ? t.status === 'done' : t.status !== 'done'))
    .filter((t) => (dept ? t.dept === dept : true))
    .sort((a, b) => (a.due || '9').localeCompare(b.due || '9') || PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority))

  const save = () => {
    if (!draft.title.trim()) return toast('Give the task a title.', 'error')
    edit((p) => {
      p.tasks = p.tasks || []
      const i = p.tasks.findIndex((t) => t.id === draft.id)
      const next = { ...draft, doneAt: draft.status === 'done' ? draft.doneAt || new Date().toISOString() : '' }
      if (i >= 0) p.tasks[i] = next
      else p.tasks.push(next)
    })
    setDraft(null)
    toast('Task saved', 'ok')
  }
  const setStatus = (t, status) => edit((p) => {
    const x = (p.tasks || []).find((y) => y.id === t.id)
    if (x) { x.status = status; x.doneAt = status === 'done' ? new Date().toISOString() : '' }
  })
  const remove = (t) => edit((p) => (p.tasks = (p.tasks || []).filter((y) => y.id !== t.id)))

  const open = tasks.filter((t) => t.status !== 'done').length
  const overdue = tasks.filter((t) => t.status !== 'done' && t.due && t.due < today()).length

  return (
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

      {draft && <TaskModal draft={draft} setDraft={setDraft} onSave={save} onClose={() => setDraft(null)} people={people} />}
    </div>
  )
}
