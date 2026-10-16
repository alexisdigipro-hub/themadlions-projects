import { uid } from './store.jsx'

/* Tasks a new project brings with it (Alex, 16 Oct): a Music Video gets "Edit || <title>" on the Editing
   list, given to Αναστασία Πουπουλίδου, like the one he made by hand for Ζένια Δούκα. The list and the
   person are found by name, so a renamed list or a missing person leaves that part empty instead of
   failing. Built from the state as it is (React runs update() later), then pushed with pushProjectTasks. */
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export function projectTasksFor(state, project) {
  if (norm(project?.category) !== 'music video' || !project.title?.trim()) return null
  const title = `Edit || ${project.title.trim()}`
  if ((state.todos || []).some((t) => norm(t.title) === norm(title))) return null
  const list = (state.settings?.taskLists || []).find((l) => norm(l.name) === 'editing')
  const who = (state.users || []).find((u) => u.active !== false && norm(u.name) === norm('Αναστασία Πουπουλίδου'))
  const task = {
    id: uid(), title, notes: '', assigneeId: who?.id || '', assignee: who?.name || '', dept: 'Production', due: '', priority: 'normal',
    status: 'todo', createdAt: new Date().toISOString(), doneAt: '',
    ...(list ? { listId: list.id, listInfo: { name: list.name, color: list.color, icon: list.icon } } : {}),
  }
  return { task, who }
}

// inside update(): adds the task unless one with the same title is already there
export function pushProjectTasks(s, auto) {
  if (!auto) return
  s.todos = s.todos || []
  if (!s.todos.some((t) => norm(t.title) === norm(auto.task.title))) s.todos.push(auto.task)
}
