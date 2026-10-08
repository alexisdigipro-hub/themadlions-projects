import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Field, Input, Modal, useIsMobile, useToast } from '../components/ui.jsx'
import { can, today, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { TaskModal, emptyTask, seesAllTasks, tasksFor } from './project/Tasks.jsx'
import { sendAutoNotice, userByName } from '../components/Notices.jsx'
import { fmtDate } from '../lib/dates.js'

/*
  Tasks, laid out like Microsoft To Do (Alex, 9 Oct; before that like Reminders). On the left:
  the smart lists as rows with a line icon and a count (My Day = due today or late, Important =
  urgent or high, Assigned to me, Tasks = everything open, Completed), then
  the lists: General (tasks outside projects), lists an administrator adds with an icon and a
  colour (settings.taskLists, a general task names its list in listId) and one list per project,
  with 👥 when others have tasks on it, and + New List. On the right: the list's name large over
  a backdrop in its colour (My Day also the date), the tasks as white cards (round check, title,
  the list it is on, the date in blue or red, who, ☆ to mark it important), Completed folding
  under them, and "+ New Task…" at the foot. A click on a task opens the full form.
  The data is unchanged: project tasks in project.tasks, general ones in state.todos.
  On a phone the lists are the first screen and a list the second.
*/

const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#5ac8fa', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#a2845e', '#8e8e93', '#C8503F']
const ICONS = ['☰', '📌', '⭐', '🎬', '📷', '💡', '🎤', '🎨', '🚚', '📍', '💰', '📞', '🛒', '🧾', '🗓', '✈️', '🏠', '❤️']
/* the line icons of the smart lists, drawn like To Do's */
const svg = (d) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const LINE = {
  today: svg(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  urgent: svg(<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />),
  scheduled: svg(<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  mine: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
  all: svg(<><path d="M4 11.5 12 4l8 7.5V20H4z" /><path d="M10 20v-5h4v5" /></>),
  done: svg(<><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
}
const SMART = [
  ['today', 'My Day', '#4a7a80', '#2f6f8f'],
  ['urgent', 'Important', '#c2185b', '#b03a6b'],
  // Planned taken off the side menu (Alex, 9 Oct)
  ['mine', 'Assigned to me', '#2e7d32', '#3d7a4a'],
  ['all', 'Tasks', '#5c6bc0', '#4a5aa8'],
  ['done', 'Completed', '#78909c', '#5f7480'],
]
const GENERAL = 'general'

export default function TasksAll() {
  const { state, updateProject, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const mobile = useIsMobile()
  const [sel, setSel] = useState(() => { try { return localStorage.getItem('tml_tasks_list') || 'today' } catch { return 'today' } })
  const [screen, setScreen] = useState('home') // phone: home | list
  const [q, setQ] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [draft, setDraft] = useState(null)
  const [listForm, setListForm] = useState(null) // { id?, name, color, icon }
  const [quick, setQuick] = useState('')
  // the lists under General start folded; the choice is remembered on this device
  const [listsOpen, setListsOpen] = useState(() => { try { return localStorage.getItem('tml_tasks_lists_open') === '1' } catch { return false } })
  useEffect(() => { try { localStorage.setItem('tml_tasks_lists_open', listsOpen ? '1' : '0') } catch {} }, [listsOpen])
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
  const all = tasksFor([
    ...projects.flatMap((p) => (p.tasks || []).map((t) => ({ ...t, projectId: p.id }))),
    ...(state.todos || []).map((t) => ({ ...t, projectId: '' })),
  ], user)
  const listOf = (t) => (t.projectId ? `p:${t.projectId}` : t.listId && custom.some((l) => l.id === t.listId) ? `l:${t.listId}` : GENERAL)
  const open = all.filter((t) => t.status !== 'done')

  // the lists: General, the administrators' own, then the projects (those with tasks, or still running)
  const lists = [
    { key: GENERAL, name: 'General', color: '#8e8e93', icon: '☰' },
    ...custom.map((l) => ({ key: `l:${l.id}`, id: l.id, name: l.name, color: l.color, icon: l.icon, own: true })),
    ...projects
      .filter((p) => (p.tasks || []).length || p.status !== 'Delivered')
      .map((p) => ({ key: `p:${p.id}`, pid: p.id, name: p.title, color: p.color || '#5856d6', icon: '🎬' })),
  ]
  const listByKey = Object.fromEntries(lists.map((l) => [l.key, l]))
  const inList = (key, list = all) => list.filter((t) => listOf(t) === key)
  const shared = (key) => inList(key).some((t) => t.assignee && !isMine(t))

  const smartFilter = {
    today: (t) => t.status !== 'done' && t.due && t.due <= t0,
    scheduled: (t) => t.status !== 'done' && !!t.due,
    all: (t) => t.status !== 'done',
    urgent: (t) => t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high'),
    mine: (t) => t.status !== 'done' && isMine(t),
    done: (t) => t.status === 'done',
  }
  const smart = SMART.find(([k]) => k === sel)
  const current = smart ? { key: sel, name: smart[1], color: smart[3], icon: LINE[sel], smart: true } : listByKey[sel] || listByKey[GENERAL]
  useEffect(() => { if (!smart && !listByKey[sel]) setSel('today') }, [sel, lists.length]) // eslint-disable-line react-hooks/exhaustive-deps
  // a list chosen before (or a new one) stays in sight
  useEffect(() => { if (!smart && sel !== GENERAL && listByKey[sel]) setListsOpen(true) }, [sel]) // eslint-disable-line react-hooks/exhaustive-deps

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const match = (t) => !words.length || words.every((w) => `${t.title} ${t.notes || ''} ${t.assignee || ''}`.toLowerCase().includes(w))
  const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.createdAt || '').localeCompare(b.createdAt || '')
  const searching = words.length > 0
  const base = searching ? all.filter(match) : current.smart ? all.filter(smartFilter[current.key]) : inList(current.key)
  const pending = base.filter((t) => t.status !== 'done' || current.key === 'done').sort(byDue)
  const completed = current.smart || searching ? [] : base.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''))
  // smart lists and search show their tasks under the list each comes from, as Reminders does
  const sections = useMemo(() => {
    if (!current.smart && !searching) return [{ key: current.key, list: pending }]
    const out = []
    pending.forEach((t) => { const k = listOf(t); let s = out.find((x) => x.key === k); if (!s) out.push(s = { key: k, list: [] }); s.list.push(t) })
    return out
  }, [pending, current.key, searching]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- writes (the same as before: project tasks in the project, general ones in todos) ---------- */
  const persist = (t, fn) => {
    if (!t.projectId) return update((s) => { const x = (s.todos || []).find((y) => y.id === t.id); if (x) fn(x); return s })
    updateProject(t.projectId, (p) => { const x = (p.tasks || []).find((y) => y.id === t.id); if (x) fn(x, p) })
  }
  const star = (t) => persist(t, (x) => { x.priority = x.priority === 'urgent' || x.priority === 'high' ? 'normal' : 'high' })
  const toggle = (t) => persist(t, (x) => { x.status = x.status === 'done' ? 'todo' : 'done'; x.doneAt = x.status === 'done' ? new Date().toISOString() : '' })
  const remove = (t) => (t.projectId ? updateProject(t.projectId, (p) => { p.tasks = (p.tasks || []).filter((y) => y.id !== t.id) }) : update((s) => { s.todos = (s.todos || []).filter((y) => y.id !== t.id); return s }))
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
    const k = current.smart ? GENERAL : current.key
    return k.startsWith('p:') ? { projectId: k.slice(2) } : k.startsWith('l:') ? { projectId: '', listId: k.slice(2) } : { projectId: '' }
  }
  const addQuick = () => {
    const title = quick.trim()
    if (!title) return
    const extra = current.key === 'today' ? { due: t0 } : current.key === 'urgent' ? { priority: 'high' } : current.key === 'mine' ? { assignee: user?.name || '', assigneeId: user?.id || '' } : {}
    write(emptyTask({ ...where(), dept: 'Other', title, ...extra }))
    setQuick('')
    setTimeout(() => quickRef.current?.focus(), 0)
  }
  const clearDone = () => {
    if (!completed.length || !confirm(`Delete the ${completed.length} completed task${completed.length === 1 ? '' : 's'} of ${current.name}?`)) return
    const ids = new Set(completed.map((t) => t.id))
    if (current.key.startsWith('p:')) updateProject(current.key.slice(2), (p) => { p.tasks = (p.tasks || []).filter((t) => !ids.has(t.id)) })
    else update((s) => { s.todos = (s.todos || []).filter((t) => !ids.has(t.id)); return s })
    toast('Completed tasks cleared', 'ok')
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
    if (!confirm(n ? `Delete the list "${l.name}"? Its ${n} task${n === 1 ? '' : 's'} move to General.` : `Delete the list "${l.name}"?`)) return
    update((s) => {
      s.settings = { ...s.settings, taskLists: (s.settings.taskLists || []).filter((x) => x.id !== l.id) }
      s.todos = (s.todos || []).map((t) => (t.listId === l.id ? { ...t, listId: '' } : t))
      return s
    })
    setListForm(null)
    setSel(GENERAL)
  }

  const pick = (k) => { setSel(k); setQ(''); if (mobile) setScreen('list') }
  const home = (
    <aside className="rem-side">
      <div className="rem-search-wrap">
        <span className="rem-search-ico" aria-hidden="true">⌕</span>
        <input className="rem-search" type="search" placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); if (mobile && e.target.value) setScreen('list') }} />
      </div>
      <nav className="rem-smart">
        {SMART.map(([k, label, color]) => (
          <button key={k} type="button" className={`rem-row ${sel === k && !searching ? 'on' : ''}`} style={{ '--lc': color }} onClick={() => pick(k)}>
            <span className="rem-row-ico">{LINE[k]}</span>
            <span className="grow">{label}</span>
            <span className="rem-count">{all.filter(smartFilter[k]).length || ''}</span>
          </button>
        ))}
      </nav>
      <hr className="rem-rule" />
      {/* General on top; the other lists folded under it, opened with its ☰ (Alex, 9 Oct) */}
      <nav className="rem-lists">
        {lists.slice(0, 1).map((l) => (
          <div key={l.key} className={`rem-row rem-row-general ${sel === l.key && !searching ? 'on' : ''}`}>
            <button type="button" className={`rem-fold ${listsOpen ? 'open' : ''}`} onClick={() => setListsOpen((v) => !v)} aria-expanded={listsOpen} title={listsOpen ? 'Hide the lists' : 'Show the lists'}>
              <span aria-hidden="true">☰</span>
            </button>
            <button type="button" className="rem-row-pick" onClick={() => pick(l.key)}>
              <span className="grow">{l.name}</span>
              {shared(l.key) && <span className="rem-shared" title="Others have tasks on this list">👥</span>}
              <span className="rem-count">{inList(l.key, open).length || ''}</span>
            </button>
            <span className="rem-fold-chev" aria-hidden="true" onClick={() => setListsOpen((v) => !v)}>{listsOpen ? '⌄' : '›'}</span>
          </div>
        ))}
        {listsOpen && lists.slice(1).map((l) => (
          <button key={l.key} type="button" className={`rem-row rem-row-sub ${sel === l.key && !searching ? 'on' : ''}`} style={{ '--lc': l.color }} onClick={() => pick(l.key)}>
            <span className="rem-row-emoji">{l.icon}</span>
            <span className="grow">{l.name}</span>
            {shared(l.key) && <span className="rem-shared" title="Others have tasks on this list">👥</span>}
            <span className="rem-count">{inList(l.key, open).length || ''}</span>
          </button>
        ))}
      </nav>
      {admin && <button type="button" className="rem-add-list" onClick={() => setListForm({ name: '', color: COLORS[5], icon: ICONS[0] })}><span>＋</span> New List</button>}
    </aside>
  )

  const row = (t) => {
    const late = t.due && t.due < t0 && t.status !== 'done'
    const from = listByKey[listOf(t)]
    const important = t.priority === 'urgent' || t.priority === 'high'
    return (
      <li key={t.id} className={`rem-task ${t.status === 'done' ? 'done' : ''}`}>
        <button type="button" className="rem-check" aria-label={t.status === 'done' ? 'Mark as not done' : 'Mark as done'} disabled={!editable} onClick={() => toggle(t)} />
        <div className="rem-task-main" onClick={() => editable && setDraft({ ...t })}>
          <div className="rem-task-title">
            {t.title}
            {t.status === 'doing' && <span className="pill doing">in progress</span>}
            {t.status === 'blocked' && <span className="pill blocked">blocked</span>}
          </div>
          <div className="rem-task-meta">
            {(current.smart || searching || from?.key !== current.key) && from && <span>{from.icon} {from.name}</span>}
            {t.due && <span className={late ? 'late' : t.due === t0 ? 'today' : 'due'}>🗓 {t.due === t0 ? 'Today' : late ? `Overdue, ${fmtDate(t.due)}` : fmtDate(t.due)}</span>}
            {t.assignee && <span>👤 {t.assignee}</span>}
            {t.notes && <span className="rem-has-notes" title={t.notes}>📝 Note</span>}
          </div>
        </div>
        <button type="button" className={`rem-star ${important ? 'on' : ''}`} disabled={!editable || t.status === 'done'} onClick={() => star(t)} title={important ? 'Not important' : 'Mark as important'} aria-label="Important">{important ? '★' : '☆'}</button>
        {editable && <button type="button" className="rem-del" title="Delete" onClick={() => remove(t)}>×</button>}
      </li>
    )
  }

  const dateLine = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const listPane = (
    <section className="rem-main" style={{ '--lc': searching ? 'var(--accent)' : current.color }}>
      <div className="rem-head">
        {mobile && <button type="button" className="rem-back" onClick={() => { setQ(''); setScreen('home') }}>‹ Lists</button>}
        <div className="grow">
          <h1>{!current.smart && !searching && <span className="rem-head-emoji">{current.icon}</span>}{searching ? `Searching for "${q.trim()}"` : current.name}</h1>
          {current.key === 'today' && !searching && <div className="rem-head-date">{dateLine}</div>}
        </div>
        {current.own && admin && <button type="button" className="rem-head-btn" onClick={() => setListForm({ id: current.id, name: current.name, color: current.color, icon: current.icon })}>Edit list</button>}
        {editable && <button type="button" className="rem-head-btn" onClick={() => setDraft(emptyTask({ ...where(), dept: 'Other' }))}>Details…</button>}
      </div>
      <div className="rem-scroll">
        {sections.map((s) => (
          <div key={s.key} className="rem-section">
            <ul className="rem-tasks">{s.list.map(row)}</ul>
          </div>
        ))}
        {!pending.length && <p className="rem-empty">{searching ? 'No task matches.' : current.key === 'done' ? 'Nothing completed yet.' : current.key === 'today' ? 'Nothing due today. Enjoy the day.' : 'No tasks here yet.'}</p>}
        {completed.length > 0 && (
          <>
            <div className="rem-done-bar">
              <button type="button" className="rem-done-toggle" onClick={() => setShowDone((v) => !v)}>{showDone ? '⌄' : '›'} Completed <span>{completed.length}</span></button>
              {editable && showDone && <button type="button" className="rem-done-clear" onClick={clearDone}>Clear</button>}
            </div>
            {showDone && <ul className="rem-tasks rem-completed">{completed.map(row)}</ul>}
          </>
        )}
      </div>
      {editable && !searching && current.key !== 'done' && (
        <div className="rem-quick">
          <span className="rem-quick-plus" aria-hidden="true">＋</span>
          <input ref={quickRef} className="rem-quick-input" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addQuick(); if (e.key === 'Escape') setQuick('') }} placeholder="New Task…" />
        </div>
      )}
    </section>
  )

  return (
    <div className={`rem-app ${mobile ? `m-${screen}` : ''}`}>
      {mobile ? (screen === 'home' ? home : listPane) : (<>{home}{listPane}</>)}
      {draft && <TaskModal draft={draft} setDraft={setDraft} onSave={save} onClose={() => setDraft(null)} />}
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
