import { Button } from './ui.jsx'
import { RoarMeProjectSwitch } from './RoarMeLink.jsx'
import { canAccessProject, useStore } from '../lib/store.jsx'

/* A project's RoarMe group, on its Overview, administrators only (Alex, 20 Oct: Hub Chat is gone, the chat is RoarMe).
   The switch (projects.data.roarme) and who is in it. Everyone who can see the project is in, unless taken out here
   (data.chatExcluded; a project that keeps data.chatMembers uses that list instead). Administrators are always in.
   The hub keeps the RoarMe group in step by itself (supabase/roarme_sync.sql). */
export default function ProjectRoarMe({ projectId }) {
  const { state, updateProject } = useStore()
  const project = state.projects.find((p) => p.id === projectId)
  if (!project) return null
  const listed = Array.isArray(project.chatMembers)
  const excluded = listed
    ? state.users.filter((u) => !project.chatMembers.includes(u.id)).map((u) => u.id)
    : Array.isArray(project.chatExcluded) ? project.chatExcluded : []
  const people = state.users.filter((u) => u.active !== false && canAccessProject(u, projectId))
  const isOut = (u) => excluded.includes(u.id) && u.role !== 'admin'
  const toggle = (id) => updateProject(projectId, (p) => {
    if (Array.isArray(p.chatMembers)) { p.chatMembers = p.chatMembers.includes(id) ? p.chatMembers.filter((x) => x !== id) : [...p.chatMembers, id]; return }
    const cur = Array.isArray(p.chatExcluded) ? p.chatExcluded : []
    p.chatExcluded = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
  })
  return (
    <section className="panel project-roarme">
      <h2>RoarMe group</h2>
      <RoarMeProjectSwitch projectId={projectId} people={people.filter((u) => !isOut(u))} />
      {project.roarme === true && (
        <ul className="plain project-roarme-people">
          {people.map((u) => (
            <li key={u.id} className={isOut(u) ? 'out' : ''}>
              <span><strong>{u.name}</strong><small className="muted">{u.role === 'admin' ? 'Administrator, always in' : isOut(u) ? 'Not in the group' : 'In the group'}</small></span>
              {u.role !== 'admin' && <Button size="sm" variant={isOut(u) ? 'primary' : 'ghost'} onClick={() => toggle(u.id)}>{isOut(u) ? 'Add' : 'Remove'}</Button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
