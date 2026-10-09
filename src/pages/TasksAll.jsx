import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Field, Input, Modal, useIsMobile, useToast } from '../components/ui.jsx'
import { can, today, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { TaskModal, binTask, emptyTask, statusColor, subCount, taskStatuses, tasksFor, visibleTasks } from './project/Tasks.jsx'
import { sendAutoNotice, userByName } from '../components/Notices.jsx'
import { fmtDate } from '../lib/dates.js'

/*
  Tasks, laid out like Microsoft To Do (Alex, 9 Oct; before that like Reminders). On the left:
  the smart lists as rows with a line icon and a count: My Tasks (assigned to me), All tasks
  (everything open, administrators only), Completed and Deleted (the bin, where a task can be
  restored); a teammate only ever sees the tasks assigned to them. My Day and Important were taken
  off (Alex, 9 Oct). Then Lists: the lists an administrator
  adds with an icon and a colour (settings.taskLists, a general task names its list in listId),
  with 👥 when others have tasks on it, and + New List. Projects have no list of their own here:
  their tasks show in All tasks and My Tasks with the project's name on them. On the right: the
  list's name large, the tasks as cards (round check, title, the list or project it is on, the date
  in blue or red, who), Completed folding under them, and "+ New Task…" at the foot. A click on a
  task opens the full form, with a Project and a List field. Company (tasks on no list) was taken off
  the side column too: such a task shows in My Tasks and All tasks.
  The data is unchanged: project tasks in project.tasks, general ones in state.todos.
  On a phone the lists are the first screen and a list the second.
*/

const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#5ac8fa', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#a2845e', '#8e8e93', '#C8503F']
const ICONS = ['☰', '📌', '⭐', '🎬', '📷', '💡', '🎤', '🎨', '🚚', '📍', '💰', '📞', '🛒', '🧾', '🗓', '✈️', '🏠', '❤️']
/* the line icons of the smart lists, drawn like To Do's */
const svg = (d) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const LINE = {
  urgent: svg(<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />),
  scheduled: svg(<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  mine: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
  all: svg(<><path d="M4 11.5 12 4l8 7.5V20H4z" /><path d="M10 20v-5h4v5" /></>),
  done: svg(<><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
  deleted: svg(<><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" /></>),
}
const SMART = [
  // Planned, My Day, then Important taken off the side menu (Alex, 9 Oct); All tasks is for
  // administrators, the others see My Tasks and their own Completed and Deleted
  ['mine', 'My Tasks', '#2e7d32', '#3d7a4a'],
  ['all', 'All tasks', '#5c6bc0', '#4a5aa8', true],
  ['done', 'Completed', '#78909c', '#5f7480'],
  ['deleted', 'Deleted', '#8d6e63', '#6d5a52'],
]
// a list that no longer exists in the side menu (My Day, Important, a project's list) opens My Tasks
const firstList = () => { try { const k = localStorage.getItem('tml_tasks_list'); return !k || k === 'today' || k === 'urgent' || k === 'general' || k.startsWith('p:') ? 'mine' : k } catch { return 'mine' } }
const GENERAL = 'general'

/* A round icon button that is also a picker (Alex, 9 Oct: like the chat's paperclip): its colour
   says what it holds, the value shows on hover, a tap opens the list of choices (a see-through
   select lies over it). Without the right to edit it is just the icon. */
const IC = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const PICK_ICONS = {
  list: <svg {...IC}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>,
  who: <svg {...IC}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  status: <svg {...IC}><path d="M5 21V4" /><path d="M5 4h12l-2.5 4L17 12H5" /></svg>,
}
// a person in a few letters under the icon: "Anastasia P."
const shortName = (name) => { const [first, ...rest] = String(name || '').trim().split(/\s+/); return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first || '' }
function IconPick({ kind, tint, unset, title, text, value, onChange, editable, children }) {
  return (
    <label className={`rem-ibtn${unset ? ' unset' : ''}${editable ? '' : ' rem-ibtn-static'}`} style={{ '--ic': tint }} title={title}>
      {PICK_ICONS[kind]}
      {text && <span className="rem-ibtn-text">{text}</span>}
      {editable && <select value={value} onChange={onChange} aria-label={title}>{children}</select>}
    </label>
  )
}

export default function TasksAll() {
  const { state, updateProject, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const mobile = useIsMobile()
  const [sel, setSel] = useState(firstList)
  const [screen, setScreen] = useState('home') // phone: home | list
  const [q, setQ] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [draft, setDraft] = useState(null)
  const [listForm, setListForm] = useState(null) // { id?, name, color, icon }
  const [quick, setQuick] = useState('')
  // where "+ New Task…" puts a task while a smart list (Important, All tasks…) is open
  const [quickList, setQuickList] = useState(GENERAL)
  const quickRef = useRef(null)
  useEffect(() => { try { localStorage.setItem('tml_tasks_list', sel) } catch {} }, [sel])
  useEffect(() => { setShowDone(false); setQuick('') }, [sel])

  const admin = user?.role === 'admin'
  const editable = can(user, 'tasks', 'edit')
  const projects = visibleProjects(state, user)
  const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]))
  const custom = state.settings?.taskLists || []
  const t0 = today()
  const meName = (user?.name || '').trim().toLowerCase()
  const isMine = (t) => (t.assigneeId ? t.assigneeId === user?.id : (t.assignee || '').trim().toLowerCase() === meName)

  // everything this person may see; a teammate only what is assigned to them
  const every = [
    ...projects.flatMap((p) => (p.tasks || []).map((t) => ({ ...t, projectId: p.id }))),
    ...(state.todos || []).map((t) => ({ ...t, projectId: '' })),
  ]
  const all = tasksFor(every, user)
  // the bin: deleted tasks this person may see, newest first
  const binned = visibleTasks(every.filter((t) => t.deletedAt), user).sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''))
  // A task's project and its list are separate (Alex, 9 Oct): a project's task can also sit on a list
  // (a department). Its list wins; a project task on no list belongs to its project only.
  const listOf = (t) => (t.listId && custom.some((l) => l.id === t.listId) ? `l:${t.listId}` : t.projectId ? `p:${t.projectId}` : GENERAL)
  const open = all.filter((t) => t.status !== 'done')

  // the lists: General, the administrators' own, then the projects (those with tasks, or still running)
  const lists = [
    // General was renamed Company (Alex, 9 Oct): the tasks of the company, outside any project
    { key: GENERAL, name: 'Company', color: '#8e8e93', icon: '☰' },
    ...custom.map((l) => ({ key: `l:${l.id}`, id: l.id, name: l.name, color: l.color, icon: l.icon, own: true })),
    // projects still running, and a delivered one only while it has something left open
    ...projects
      .filter((p) => p.status !== 'Delivered' || (p.tasks || []).some((t) => !t.deletedAt && t.status !== 'done'))
      .map((p) => ({ key: `p:${p.id}`, pid: p.id, name: p.title, color: p.color || '#5856d6', icon: '🎬', project: true })),
  ]
  // the side column shows only the lists an administrator made (departments); Company was taken off
  // too (Alex, 9 Oct): a task on no list and no project shows in My Tasks and All tasks
  // a teammate sees only the lists that hold something of theirs (Alex, 9 Oct); administrators all
  const ownLists = lists.filter((l) => l.own && (admin || all.some((t) => listOf(t) === l.key)))
  const listByKey = Object.fromEntries(lists.map((l) => [l.key, l]))
  const inList = (key, list = all) => list.filter((t) => listOf(t) === key)
  const shared = (key) => inList(key).some((t) => t.assignee && !isMine(t))

  const smartFilter = {
    scheduled: (t) => t.status !== 'done' && !!t.due,
    all: (t) => t.status !== 'done',
    urgent: (t) => t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high'),
    mine: (t) => t.status !== 'done' && isMine(t),
    done: (t) => t.status === 'done',
  }
  const countOf = (k) => (k === 'deleted' ? binned.length : all.filter(smartFilter[k]).length)
  const inBin = sel === 'deleted' && !q.trim()
  const smartLists = SMART.filter(([, , , , adminOnly]) => !adminOnly || admin)
  const smart = smartLists.find(([k]) => k === sel)
  const current = smart ? { key: sel, name: smart[1], color: smart[3], icon: LINE[sel], smart: true } : listByKey[sel] || listByKey[GENERAL]
  // projects have no list of their own in the side menu any more (Alex, 9 Oct: their tasks show in
  // All tasks with the project's name on them), so neither a project nor a vanished list stays open
  useEffect(() => { if (!smart && (!listByKey[sel] || listByKey[sel].project || sel === GENERAL || (listByKey[sel].own && !ownLists.some((l) => l.key === sel)))) setSel('mine') }, [sel, lists.length, ownLists.length, admin]) // eslint-disable-line react-hooks/exhaustive-deps

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const match = (t) => !words.length || words.every((w) => `${t.title} ${t.notes || ''} ${t.assignee || ''}`.toLowerCase().includes(w))
  const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.createdAt || '').localeCompare(b.createdAt || '')
  const searching = words.length > 0
  const base = searching ? all.filter(match) : inBin ? binned : current.smart ? all.filter(smartFilter[current.key]) : inList(current.key)
  // the order dragged by hand comes first (Alex, 9 Oct); tasks never placed follow, by date
  const byOrder = (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || byDue(a, b)
  const pending = inBin ? base : base.filter((t) => t.status !== 'done' || current.key === 'done').sort(current.key === 'done' ? byDue : byOrder)
  const completed = current.smart || searching ? [] : base.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''))
  // One run of tasks in every view, each with its list and project as tags: smart lists used to group
  // them by list, and a task alone in its group could not be dragged anywhere (Alex, 9 Oct)
  const sections = useMemo(() => [{ key: current.key, list: pending }], [pending, current.key])

  /* ---------- writes (the same as before: project tasks in the project, general ones in todos) ---------- */
  const persist = (t, fn) => {
    if (!t.projectId) return update((s) => { const x = (s.todos || []).find((y) => y.id === t.id); if (x) fn(x); return s })
    updateProject(t.projectId, (p) => { const x = (p.tasks || []).find((y) => y.id === t.id); if (x) fn(x, p) })
  }
  const toggle = (t) => persist(t, (x) => { x.status = x.status === 'done' ? 'todo' : 'done'; x.doneAt = x.status === 'done' ? new Date().toISOString() : '' })
  // the status on the right of a task, picked right there (Alex, 9 Oct); 'done' sends it to Completed
  const statuses = taskStatuses(state)
  const statusOf = (t) => statuses.find((x) => x.id === t.status) || statuses[0]
  const setStatus = (t, status) => persist(t, (x) => { x.status = status; x.doneAt = status === 'done' ? (x.doneAt || new Date().toISOString()) : '' })
  // taken out for good: a task moved to another project, or deleted forever from Deleted
  const remove = (t) => (t.projectId ? updateProject(t.projectId, (p) => { p.tasks = (p.tasks || []).filter((y) => y.id !== t.id) }) : update((s) => { s.todos = (s.todos || []).filter((y) => y.id !== t.id); return s }))
  // × on a task: to Deleted, from where it can come back
  const trash = (t) => persist(t, (x) => binTask(x, user))
  const restore = (t) => persist(t, (x) => { delete x.deletedAt; delete x.deletedBy })
  const forget = (t) => { if (confirm(`Delete "${t.title}" for good? It cannot be brought back.`)) remove(t) }
  const emptyBin = () => {
    if (!binned.length || !confirm(`Delete the ${binned.length} task${binned.length === 1 ? '' : 's'} in Deleted for good? They cannot be brought back.`)) return
    const ids = new Set(binned.map((t) => t.id))
    const byProject = [...new Set(binned.filter((t) => t.projectId).map((t) => t.projectId))]
    byProject.forEach((pid) => updateProject(pid, (p) => { p.tasks = (p.tasks || []).filter((t) => !ids.has(t.id)) }))
    if (binned.some((t) => !t.projectId)) update((s) => { s.todos = (s.todos || []).filter((t) => !ids.has(t.id)); return s })
    toast('Deleted emptied', 'ok')
  }
  const notify = (t, before) => {
    const target = t.assignee && t.assignee !== before?.assignee && t.status !== 'done' ? userByName(state, t.assignee) : undefined
    if (target && target.id !== user?.id) {
      sendAutoNotice(update, {
        kind: 'taskAssigned', key: `task:${t.id}`, fromId: user?.id, fromName: user?.name, to: [target.id],
        title: 'New task for you', body: [t.title, projectsById[t.projectId]?.title, t.due ? `due ${t.due}` : ''].filter(Boolean).join(' · '),
      })
    }
  }
  const write = (t, before) => {
    const done = { doneAt: t.status === 'done' ? t.doneAt || new Date().toISOString() : '' }
    notify(t, before)
    if (!t.projectId) {
      update((s) => {
        s.todos = s.todos || []
        const { projectId, ...rest } = { ...t, ...done } // eslint-disable-line no-unused-vars
        const i = s.todos.findIndex((y) => y.id === t.id)
        if (i >= 0) s.todos[i] = rest
        else s.todos.push(rest)
        return s
      })
    } else {
      updateProject(t.projectId, (p) => {
        p.tasks = p.tasks || []
        const { projectId, ...rest } = { ...t, ...done } // eslint-disable-line no-unused-vars
        const i = p.tasks.findIndex((y) => y.id === t.id)
        if (i >= 0) p.tasks[i] = rest
        else p.tasks.push(rest)
      })
    }
  }
  const save = () => {
    if (!draft.title.trim()) return toast('Give the task a title.', 'error')
    const before = all.find((t) => t.id === draft.id)
    // moved to another project or out of one: taken out of where it was first
    if (before && before.projectId !== draft.projectId) remove(before)
    write(draft, before && before.projectId === draft.projectId ? before : undefined)
    setDraft(null)
    toast('Task saved', 'ok')
  }
  /* "+ New task" at the foot of the list: straight in, with what the list implies */
  const where = () => {
    const k = current.smart ? (listByKey[quickList] ? quickList : GENERAL) : current.key
    return k.startsWith('p:') ? { projectId: k.slice(2) } : k.startsWith('l:') ? { projectId: '', listId: k.slice(2) } : { projectId: '' }
  }
  const addQuick = () => {
    const title = quick.trim()
    if (!title) return
    const extra = current.key === 'mine' ? { assignee: user?.name || '', assigneeId: user?.id || '' } : {}
    write(emptyTask({ ...where(), dept: 'Other', title, ...extra }))
    setQuick('')
    setTimeout(() => quickRef.current?.focus(), 0)
  }
  const clearDone = () => {
    if (!completed.length || !confirm(`Delete the ${completed.length} completed task${completed.length === 1 ? '' : 's'} of ${current.name}?`)) return
    // to Deleted, like a single ×
    const ids = new Set(completed.map((t) => t.id))
    if (current.key.startsWith('p:')) updateProject(current.key.slice(2), (p) => { (p.tasks || []).forEach((t) => { if (ids.has(t.id)) binTask(t, user) }) })
    else update((s) => { s.todos = (s.todos || []).map((t) => (ids.has(t.id) ? (() => { const x = { ...t }; binTask(x, user); return x })() : t)); return s })
    toast('Completed tasks moved to Deleted', 'ok')
  }

  /* ---------- the administrators' own lists ---------- */
  const saveList = () => {
    const name = listForm.name.trim()
    if (!name) return toast('Name the list.', 'error')
    update((s) => {
      const ls = [...(s.settings.taskLists || [])]
      const i = ls.findIndex((l) => l.id === listForm.id)
      const l = { id: listForm.id || uid(), name, color: listForm.color, icon: listForm.icon }
      if (i >= 0) ls[i] = l
      else ls.push(l)
      s.settings = { ...s.settings, taskLists: ls }
      if (!listForm.id) setTimeout(() => setSel(`l:${l.id}`), 0)
      return s
    })
    setListForm(null)
  }
  const deleteList = (l) => {
    const n = inList(l.key).length
    if (!confirm(n ? `Delete the list "${l.name}"? Its ${n} task${n === 1 ? '' : 's'} stay in My Tasks and All tasks, on no list.` : `Delete the list "${l.name}"?`)) return
    update((s) => {
      s.settings = { ...s.settings, taskLists: (s.settings.taskLists || []).filter((x) => x.id !== l.id) }
      s.todos = (s.todos || []).map((t) => (t.listId === l.id ? { ...t, listId: '' } : t))
      return s
    })
    setListForm(null)
    setSel(GENERAL)
  }

  const pick = (k) => { setSel(k); setQ(''); if (mobile) setScreen('list') }
  /* An administrator drags a list by its ⋮⋮ to reorder the side column (Alex, 9 Oct): the order of
     settings.taskLists, the same for everyone. Same pointer handling as the tasks. */
  const [listDrag, setListDrag] = useState(null) // { id, over, after }
  const startListDrag = (e, l) => {
    if (e.button > 0) return
    e.preventDefault()
    e.stopPropagation()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    setListDrag({ id: l.id, over: null, after: false })
  }
  const moveListDrag = (e) => {
    if (!listDrag) return
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-list-id]')
    const id = hit?.getAttribute('data-list-id')
    if (!id) return
    const r = hit.getBoundingClientRect()
    const after = e.clientY > r.top + r.height / 2
    if (id !== listDrag.over || after !== listDrag.after) setListDrag({ ...listDrag, over: id, after })
  }
  const endListDrag = () => {
    const d = listDrag
    setListDrag(null)
    if (!d || !d.over || d.over === d.id) return
    update((st) => {
      const ls = [...(st.settings.taskLists || [])]
      const moving = ls.find((x) => x.id === d.id)
      if (!moving) return st
      const rest = ls.filter((x) => x.id !== d.id)
      const at = rest.findIndex((x) => x.id === d.over) + (d.after ? 1 : 0)
      rest.splice(at, 0, moving)
      st.settings = { ...st.settings, taskLists: rest }
      return st
    })
  }
  const listRow = (l) => (
    <button key={l.key} type="button" data-list-id={l.id} className={`rem-row rem-row-sub ${sel === l.key && !searching ? 'on' : ''}${listDrag?.id === l.id ? ' dragging' : ''}${listDrag?.over === l.id && listDrag.id !== l.id ? (listDrag.after ? ' drop-after' : ' drop-before') : ''}`} style={{ '--lc': l.color }} onClick={() => pick(l.key)}>
      {admin && ownLists.length > 1 && <span className="rem-grip" role="button" aria-label="Drag to reorder" title="Drag to reorder" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => startListDrag(e, l)} onPointerMove={moveListDrag} onPointerUp={endListDrag} onPointerCancel={() => setListDrag(null)}>⋮⋮</span>}
      <span className="rem-row-emoji">{l.icon}</span>
      <span className="grow">{l.name}</span>
      {shared(l.key) && <span className="rem-shared" title="Others have tasks on this list">👥</span>}
      <span className="rem-count">{inList(l.key, open).length || ''}</span>
    </button>
  )
  const home = (
    <aside className="rem-side">
      <div className="rem-search-wrap">
        <span className="rem-search-ico" aria-hidden="true">⌕</span>
        <input className="rem-search" type="search" placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); if (mobile && e.target.value) setScreen('list') }} />
      </div>
      <nav className="rem-smart">
        {smartLists.map(([k, label, color]) => (
          <button key={k} type="button" className={`rem-row ${sel === k && !searching ? 'on' : ''}`} style={{ '--lc': color }} onClick={() => pick(k)}>
            <span className="rem-row-ico">{LINE[k]}</span>
            <span className="grow">{label}</span>
            <span className="rem-count">{countOf(k) || ''}</span>
          </button>
        ))}
      </nav>
      <hr className="rem-rule" />
      {/* Lists: the lists an administrator adds (departments); once also Company and
          projects, folded under their own heading (Alex, 9 Oct: tidy Tasks, one job per row) */}
      {(ownLists.length > 0 || admin) && <div className="rem-group-title">Lists</div>}
      {ownLists.length > 0 && (
        <nav className="rem-lists">
          {ownLists.map(listRow)}
        </nav>
      )}
      {admin && <button type="button" className="rem-add-list" onClick={() => setListForm({ name: '', color: COLORS[5], icon: ICONS[0] })}><span>＋</span> New List</button>}
    </aside>
  )

  /* Drag a task by its ⋮⋮ to put it where you want (Alex, 9 Oct). Pointer events, so it works with a
     mouse and with a finger; within one group of the list only. On release every task of that group
     gets its place (order) saved, which every view then follows. */
  const [drag, setDrag] = useState(null) // { id, ids, over, after }
  // tasks whose subtasks are folded open under them
  const [openSubs, setOpenSubs] = useState(() => new Set())
  const flipSubs = (id) => setOpenSubs((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const tickSub = (t, sid) => persist(t, (x) => { x.subtasks = (x.subtasks || []).map((y) => (y.id === sid ? { ...y, done: !y.done } : y)) })
  // subtasks added and removed right on the list, without opening the task (Alex, 9 Oct)
  const addSub = (t, title) => persist(t, (x) => { x.subtasks = [...(x.subtasks || []), { id: uid(), title, done: false }] })
  const dropSub = (t, sid) => persist(t, (x) => { x.subtasks = (x.subtasks || []).filter((y) => y.id !== sid) })
  const canSub = (t) => editable && !t.deletedAt
  // the list and the person as pills on the right, next to the status, each its own picker (Alex, 9 Oct)
  const team = (state.users || []).filter((u) => u.active !== false && u.name).sort((a, b) => a.name.localeCompare(b.name, ['el', 'en'], { sensitivity: 'base' }))
  const setList = (t, id) => persist(t, (x) => { if (id) x.listId = id; else delete x.listId })
  const setAssignee = (t, name) => {
    const who = team.find((u) => u.name === name)
    notify({ ...t, assignee: name }, t)
    persist(t, (x) => { x.assignee = name; x.assigneeId = who?.id || '' })
  }
  const startDrag = (e, t, ids) => {
    if (!editable || e.button > 0) return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    setDrag({ id: t.id, ids, over: null, after: false })
  }
  const moveDrag = (e) => {
    if (!drag) return
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-task-id]')
    const id = hit?.getAttribute('data-task-id')
    // near the top or the foot of the list, it scrolls along
    const box = e.currentTarget.closest('.rem-scroll')
    if (box) {
      const r = box.getBoundingClientRect()
      if (e.clientY < r.top + 48) box.scrollTop -= 12
      else if (e.clientY > r.bottom - 48) box.scrollTop += 12
    }
    if (!id || !drag.ids.includes(id)) return
    const r = hit.getBoundingClientRect()
    const after = e.clientY > r.top + r.height / 2
    if (id !== drag.over || after !== drag.after) setDrag({ ...drag, over: id, after })
  }
  const endDrag = () => {
    const d = drag
    setDrag(null)
    if (!d || !d.over || d.over === d.id) return
    const ids = d.ids.filter((x) => x !== d.id)
    const at = ids.indexOf(d.over) + (d.after ? 1 : 0)
    ids.splice(at, 0, d.id)
    ids.forEach((id, i) => {
      const t = all.find((x) => x.id === id)
      if (t && t.order !== i) persist(t, (x) => { x.order = i })
    })
  }
  const row = (t, group) => {
    const canDrag = editable && Array.isArray(group) && group.length > 1 && t.status !== 'done' && !t.deletedAt && !searching
    const late = t.due && t.due < t0 && t.status !== 'done'
    // the list it is on, or its project's name (a delivered project has no list row but keeps its tag)
    // its list (when it is not the one open) and its project, each as a tag
    const from = listOf(t).startsWith('l:') ? listByKey[listOf(t)] : null
    const proj = t.projectId && projectsById[t.projectId]
    return (
      <li key={t.id} data-task-id={t.id} className={`rem-task ${t.status === 'done' ? 'done' : ''}${t.deletedAt ? ' binned' : ''}${drag?.id === t.id ? ' dragging' : ''}${drag?.over === t.id && drag.id !== t.id ? (drag.after ? ' drop-after' : ' drop-before') : ''}`}>
        {canDrag && <span className="rem-grip" role="button" aria-label="Drag to reorder" title="Drag to reorder" onPointerDown={(e) => startDrag(e, t, group.map((x) => x.id))} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={() => setDrag(null)}>⋮⋮</span>}
        <button type="button" className="rem-check" aria-label={t.status === 'done' ? 'Mark as not done' : 'Mark as done'} disabled={!editable || !!t.deletedAt} onClick={() => toggle(t)} />
        <div className="rem-task-main" onClick={() => editable && !t.deletedAt && setDraft({ ...t })}>
          <div className="rem-task-title">
            {t.title}
          </div>
          <div className="rem-task-meta">
            {proj && <span>🎬 {proj.title}</span>}
            {subCount(t).all > 0 ? <button type="button" className={`rem-subs-btn${openSubs.has(t.id) ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); flipSubs(t.id) }} title={openSubs.has(t.id) ? 'Hide subtasks' : 'Show subtasks'}>☑ {subCount(t).done}/{subCount(t).all} <span aria-hidden="true">▾</span></button>
              : canSub(t) && t.status !== 'done' && !openSubs.has(t.id) && <button type="button" className="rem-subs-btn rem-subs-new" onClick={(e) => { e.stopPropagation(); flipSubs(t.id) }} title="Add a subtask">＋ Subtask</button>}
            {t.due && <span className={late ? 'late' : t.due === t0 ? 'today' : 'due'}>🗓 {t.due === t0 ? 'Today' : late ? `Overdue, ${fmtDate(t.due)}` : fmtDate(t.due)}</span>}
            {t.notes && <span className="rem-has-notes" title={t.notes}>📝 Note</span>}
            {t.deletedAt && <span>🗑 Deleted {fmtDate(t.deletedAt.slice(0, 10))}{t.deletedBy ? ` by ${t.deletedBy}` : ''}</span>}
          </div>
          {openSubs.has(t.id) && (subCount(t).all > 0 || canSub(t)) && (
            <ul className="rem-subs" onClick={(e) => e.stopPropagation()}>
              {(t.subtasks || []).map((x) => (
                <li key={x.id} className={x.done ? 'done' : ''}>
                  <button type="button" className="rem-check sm" aria-label={x.done ? 'Mark as not done' : 'Mark as done'} disabled={!canSub(t)} onClick={() => tickSub(t, x.id)} />
                  <span className="grow">{x.title}</span>
                  {canSub(t) && <button type="button" className="rem-sub-del" onClick={() => dropSub(t, x.id)} aria-label="Remove subtask" title="Remove subtask">×</button>}
                </li>
              ))}
              {canSub(t) && (
                <li className="rem-sub-add">
                  <span className="rem-sub-plus" aria-hidden="true">＋</span>
                  {/* Enter adds it and leaves the line ready for the next; Escape (or empty and away) closes */}
                  <input className="rem-sub-input" placeholder="Add a subtask" autoFocus={!subCount(t).all} aria-label="Add a subtask"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value.trim(); if (v) { addSub(t, v); e.currentTarget.value = '' } }
                      if (e.key === 'Escape') { e.currentTarget.value = ''; flipSubs(t.id) }
                    }}
                    onBlur={(e) => { const v = e.currentTarget.value.trim(); if (v) { addSub(t, v); e.currentTarget.value = '' } else if (!subCount(t).all) flipSubs(t.id) }} />
                </li>
              )}
            </ul>
          )}
        </div>
        {!t.deletedAt && (
          <div className="rem-pills">
            <IconPick kind="list" editable={editable} tint={from?.color || 'var(--muted)'} unset={!from} title={`List: ${from ? from.name : 'none'}`} value={from?.id || ''} onChange={(e) => setList(t, e.target.value)}>
              <option value="">No list</option>
              {custom.map((l) => <option key={l.id} value={l.id}>{l.icon ? `${l.icon} ` : ''}{l.name}</option>)}
            </IconPick>
            <IconPick kind="who" editable={editable} tint="var(--text)" unset={!t.assignee} text={t.assignee ? shortName(t.assignee) : 'Nobody'} title={`Assigned to: ${t.assignee || 'nobody yet'}`} value={t.assignee || ''} onChange={(e) => setAssignee(t, e.target.value)}>
              <option value="">Nobody yet</option>
              {team.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
              {t.assignee && !team.some((u) => u.name === t.assignee) && <option value={t.assignee}>{t.assignee}</option>}
            </IconPick>
            <IconPick kind="status" editable={editable} tint={statusColor(statusOf(t))} text={statusOf(t).label} title={`Status: ${statusOf(t).label}`} value={statusOf(t).id} onChange={(e) => setStatus(t, e.target.value)}>
              {statuses.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </IconPick>
          </div>
        )}
        {t.deletedAt ? (editable && (
          <>
            <button type="button" className="rem-restore" onClick={() => restore(t)}>Restore</button>
            <button type="button" className="rem-del" title="Delete for good" onClick={() => forget(t)}>×</button>
          </>
        )) : (
          <>
            {editable && <button type="button" className="rem-del" title="Delete" onClick={() => trash(t)}>×</button>}
          </>
        )}
      </li>
    )
  }

  const listPane = (
    <section className="rem-main" style={{ '--lc': searching ? 'var(--accent)' : current.color }}>
      <div className="rem-head">
        {mobile && <button type="button" className="rem-back" onClick={() => { setQ(''); setScreen('home') }}>‹ Lists</button>}
        <div className="grow">
          <h1>{!current.smart && !searching && <span className="rem-head-emoji">{current.icon}</span>}{searching ? `Searching for "${q.trim()}"` : current.name}</h1>
          {inBin && <div className="rem-head-date">Deleted tasks wait here until you restore them or delete them for good</div>}
        </div>
        {current.own && admin && <button type="button" className="rem-head-btn" onClick={() => setListForm({ id: current.id, name: current.name, color: current.color, icon: current.icon })}>Edit list</button>}
        {editable && inBin && binned.length > 0 && <button type="button" className="rem-head-btn" onClick={emptyBin}>Empty</button>}
        {editable && !inBin && <button type="button" className="rem-head-btn" onClick={() => setDraft(emptyTask({ ...where(), dept: 'Other' }))}>New Task</button>}
      </div>
      <div className="rem-scroll">
        {sections.map((s) => (
          <div key={s.key} className="rem-section">
            <ul className="rem-tasks">{s.list.map((t) => row(t, s.list))}</ul>
          </div>
        ))}
        {!pending.length && <p className="rem-empty">{searching ? 'No task matches.' : current.key === 'done' ? 'Nothing completed yet.' : inBin ? 'Nothing deleted.' : 'No tasks here yet.'}</p>}
        {completed.length > 0 && (
          <>
            <div className="rem-done-bar">
              <button type="button" className="rem-done-toggle" onClick={() => setShowDone((v) => !v)}>{showDone ? '⌄' : '›'} Completed <span>{completed.length}</span></button>
              {editable && showDone && <button type="button" className="rem-done-clear" onClick={clearDone}>Clear</button>}
            </div>
            {showDone && <ul className="rem-tasks rem-completed">{completed.map((t) => row(t))}</ul>}
          </>
        )}
      </div>
      {editable && !searching && current.key !== 'done' && !inBin && (
        <div className="rem-quick">
          <span className="rem-quick-plus" aria-hidden="true">＋</span>
          <input ref={quickRef} className="rem-quick-input" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addQuick(); if (e.key === 'Escape') setQuick('') }} placeholder="New Task…" />
          {/* in a smart list a new task goes on no list unless one is picked here */}
          {current.smart && ownLists.length > 0 && (
            <select className="rem-quick-list" value={listByKey[quickList] ? quickList : GENERAL} onChange={(e) => setQuickList(e.target.value)} aria-label="List for the new task">
              <option value={GENERAL}>No list</option>
              {ownLists.map((l) => <option key={l.key} value={l.key}>{`${l.icon} ${l.name}`}</option>)}
            </select>
          )}
        </div>
      )}
    </section>
  )

  return (
    <div className={`rem-app ${mobile ? `m-${screen}` : ''}`}>
      {mobile ? (screen === 'home' ? home : listPane) : (<>{home}{listPane}</>)}
      {draft && <TaskModal draft={draft} setDraft={setDraft} onSave={save} onClose={() => setDraft(null)} projects={projects.filter((p) => p.status !== 'Delivered' || p.id === draft.projectId)} />}
      {listForm && (
        <Modal open title={listForm.id ? 'Edit list' : 'New list'} onClose={() => setListForm(null)} footer={
          <>
            {listForm.id && <Button variant="ghost" onClick={() => deleteList({ id: listForm.id, key: `l:${listForm.id}`, name: listForm.name })}>Delete list</Button>}
            <span className="grow" />
            <Button variant="ghost" onClick={() => setListForm(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveList}>{listForm.id ? 'Save' : 'Add list'}</Button>
          </>
        }>
          <div className="rem-list-form" style={{ '--lc': listForm.color }}>
            <div className="rem-list-preview">{listForm.icon}</div>
            <Field label="Name"><Input autoFocus value={listForm.name} onChange={(e) => setListForm({ ...listForm, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && saveList()} placeholder="Shopping for the shoot" /></Field>
            <div className="rem-swatches">{COLORS.map((c) => <button key={c} type="button" className={listForm.color === c ? 'on' : ''} style={{ background: c }} onClick={() => setListForm({ ...listForm, color: c })} aria-label={c} />)}</div>
            <div className="rem-icons">{ICONS.map((i) => <button key={i} type="button" className={listForm.icon === i ? 'on' : ''} onClick={() => setListForm({ ...listForm, icon: i })}>{i}</button>)}</div>
          </div>
        </Modal>
      )}
    </div>
  )
}
