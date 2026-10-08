import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Field, Input, Modal, useIsMobile, useToast } from '../components/ui.jsx'
import { can, today, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { TaskModal, emptyTask, seesAllTasks, tasksFor } from './project/Tasks.jsx'
import { sendAutoNotice, userByName } from '../components/Notices.jsx'
import { fmtDate } from '../lib/dates.js'

/*
  Tasks, laid out like Apple's Reminders (Alex, 8 Oct). On the left: smart cards with their counts
  (Today, Scheduled, All, Urgent, Assigned to me, Completed) and My Lists: General (the tasks
  outside projects), lists an administrator makes with a colour and an icon (settings.taskLists,
  a general task names its list in listId), and one list per project in the project's colour,
  with 👥 when people other than you have tasks on it. On the right: the list, round checkboxes in
  the list's colour, the title, notes, date, who, !!! for urgent; "+ New task" at the foot adds one
  straight into the list; "N Completed · Clear / Show". A click on a task opens the full form.
  The data is unchanged: project tasks in project.tasks, general ones in state.todos.
  On a phone the cards and lists are the first screen and a list the second.
*/

const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#5ac8fa', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#a2845e', '#8e8e93', '#C8503F']
const ICONS = ['☰', '📌', '⭐', '🎬', '📷', '💡', '🎤', '🎨', '🚚', '📍', '💰', '📞', '🛒', '🧾', '🗓', '✈️', '🏠', '❤️']
const SMART = [
  ['today', 'Today', '#007aff', '📅'],
  ['scheduled', 'Scheduled', '#ff3b30', '🗓'],
  ['all', 'All', '#3a3a3c', '☰'],
  ['urgent', 'Urgent', '#ff9500', '!'],
  ['mine', 'Assigned to me', '#34c759', '👤'],
  ['done', 'Completed', '#8e8e93', '✓'],
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
  const current = smart ? { key: sel, name: smart[1], color: smart[2], icon: smart[3], smart: true } : listByKey[sel] || listByKey[GENERAL]
  useEffect(() => { if (!smart && !listByKey[sel]) setSel('today') }, [sel, lists.length]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const extra = current.key === 'today' ? { due: t0 } : current.key === 'urgent' ? { priority: 'urgent' } : current.key === 'mine' ? { assignee: user?.name || '', assigneeId: user?.id || '' } : {}
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
      <input className="input rem-search" type="search" placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); if (mobile && e.target.value) setScreen('list') }} />
      <div className="rem-cards">
        {SMART.map(([k, label, color, icon]) => (
          <button key={k} type="button" className={`rem-card ${sel === k && !searching ? 'on' : ''}`} style={{ '--lc': color }} onClick={() => pick(k)}>
            <span className="rem-card-ico">{icon}</span>
            <strong>{all.filter(smartFilter[k]).length}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="rem-lists-head">My Lists</div>
      <div className="rem-lists">
        {lists.map((l) => (
          <button key={l.key} type="button" className={`rem-list ${sel === l.key && !searching ? 'on' : ''}`} style={{ '--lc': l.color }} onClick={() => pick(l.key)}>
            <span className="rem-list-ico">{l.icon}</span>
            <span className="grow">{l.name}</span>
            {shared(l.key) && <span className="rem-shared" title="Others have tasks on this list">👥</span>}
            <span className="rem-count">{inList(l.key, open).length}</span>
          </button>
        ))}
      </div>
      {admin && <button type="button" className="rem-add-list" onClick={() => setListForm({ name: '', color: COLORS[5], icon: ICONS[0] })}>＋ Add List</button>}
    </aside>
  )

  const row = (t) => {
    const late = t.due && t.due < t0 && t.status !== 'done'
    const lc = listByKey[listOf(t)]?.color || current.color
    return (
      <li key={t.id} className={`rem-task ${t.status === 'done' ? 'done' : ''}`} style={{ '--lc': lc }}>
        <button type="button" className="rem-check" aria-label={t.status === 'done' ? 'Mark as not done' : 'Mark as done'} disabled={!editable} onClick={() => toggle(t)} />
        <div className="rem-task-main" onClick={() => editable && setDraft({ ...t })}>
          <div className="rem-task-title">
            {t.priority === 'urgent' && <b className="rem-bang">!!!</b>}
            {t.priority === 'high' && <b className="rem-bang">!!</b>}
            {t.title}
            {t.status === 'doing' && <span className="pill doing">in progress</span>}
            {t.status === 'blocked' && <span className="pill blocked">blocked</span>}
          </div>
          {t.notes && <div className="rem-task-notes">{t.notes}</div>}
          {(t.due || t.assignee) && (
            <div className="rem-task-meta">
              {t.due && <span className={late ? 'late' : ''}>{t.due === t0 ? 'Today' : fmtDate(t.due)}</span>}
              {t.assignee && <span>👤 {t.assignee}</span>}
            </div>
          )}
        </div>
        {editable && <button type="button" className="rem-del" title="Delete" onClick={() => remove(t)}>×</button>}
      </li>
    )
  }

  const listPane = (
    <section className="rem-main" style={{ '--lc': searching ? 'var(--accent)' : current.color }}>
      <div className="rem-head">
        {mobile && <button type="button" className="rem-back" onClick={() => { setQ(''); setScreen('home') }}>‹ Lists</button>}
        <h1 className="grow">{searching ? `Results for "${q.trim()}"` : current.name}</h1>
        {!current.smart && !searching && <span className="rem-head-count">{pending.length}</span>}
        {current.own && admin && <button type="button" className="rem-edit-list" onClick={() => setListForm({ id: current.id, name: current.name, color: current.color, icon: current.icon })}>Edit list</button>}
        {editable && <Button size="sm" variant="ghost" onClick={() => setDraft(emptyTask({ ...where(), dept: 'Other' }))}>Details…</Button>}
      </div>
      {!current.smart && !searching && (completed.length > 0) && (
        <div className="rem-done-bar">
          <span>{completed.length} Completed</span>
          {editable && <button type="button" onClick={clearDone}>Clear</button>}
          <span className="grow" />
          <button type="button" onClick={() => setShowDone((v) => !v)}>{showDone ? 'Hide' : 'Show'}</button>
        </div>
      )}
      <div className="rem-scroll">
        {sections.map((s) => (
          <div key={s.key} className="rem-section">
            {(current.smart || searching) && <div className="rem-section-head" style={{ color: listByKey[s.key]?.color }}>{listByKey[s.key]?.name || 'General'}</div>}
            <ul className="rem-tasks">{s.list.map(row)}</ul>
          </div>
        ))}
        {!pending.length && <p className="rem-empty muted">{searching ? 'No task matches.' : current.key === 'done' ? 'Nothing completed yet.' : 'No tasks.'}</p>}
        {editable && !searching && current.key !== 'done' && (
          <div className="rem-quick">
            <span className="rem-check ghost" aria-hidden="true" />
            <input ref={quickRef} className="rem-quick-input" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addQuick(); if (e.key === 'Escape') setQuick('') }} onBlur={addQuick} placeholder="New task" />
          </div>
        )}
        {showDone && completed.length > 0 && <ul className="rem-tasks rem-completed">{completed.map(row)}</ul>}
      </div>
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
