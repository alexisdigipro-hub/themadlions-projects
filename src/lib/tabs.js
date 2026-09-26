// The tabs a project workspace can show. One list, used by the tab bar itself and by the
// "Tabs" picker in the project form, so the two never drift apart.
//
// A project stores the tabs it does NOT want in `hiddenTabs` (route names). Hide-list, not a
// show-list, on purpose: old projects have nothing stored and keep every tab, and a tab added to
// the app later shows up everywhere without a migration. Overview cannot be hidden.

export function projectTabs(project) {
  const cat = project?.category
  return [
    { to: '', label: 'Overview', end: true, key: 'projects', icon: 'overview', fixed: true },
    ...(cat === 'Music Video' ? [{ to: 'music', label: 'Music', key: 'music', icon: 'music' }] : []),
    ...(cat === 'Event' ? [] : [
      { to: 'script', label: 'Script', key: 'script', icon: 'script' },
      { to: 'breakdown', label: 'Breakdown', key: 'breakdown', icon: 'breakdown' },
      { to: 'shots', label: 'Shot list', key: 'shots', icon: 'shots' },
    ]),
    { to: 'schedule', label: cat === 'Event' ? 'Run of show' : 'Schedule', key: 'schedule', icon: 'schedule' },
    { to: 'callsheets', label: 'Call sheets', key: 'callsheets', icon: 'callsheets' },
    { to: 'tasks', label: 'Tasks', key: 'tasks', icon: 'tasks' },
    { to: 'reports', label: 'Reports', key: 'reports', icon: 'reports' },
    { to: 'budget', label: 'Budget', key: 'budget', icon: 'budget' },
    { to: 'gear', label: 'Equipment', key: 'gear', icon: 'gear' },
    { to: 'post', label: 'Post', key: 'post', icon: 'post' },
    { to: 'calendar', label: 'Calendar', key: 'calendar', icon: 'calendar' },
    { to: 'locations', label: 'Locations', key: 'locations', icon: 'locations' },
    { to: 'people', label: cat === 'Event' ? 'Crew & talent' : 'Cast & crew', key: 'contacts', icon: 'people' },
    { to: 'notes', label: 'Files & notes', key: 'files', icon: 'notes' },
  ]
}

export function tabHidden(project, to) {
  return Array.isArray(project?.hiddenTabs) && project.hiddenTabs.includes(to)
}

/* Every tab a project of this category could hide: all but Overview. A new project starts with
   this list, so it opens with Overview alone and the rest are switched on one by one. */
export function allHideable(project) {
  return projectTabs(project).filter((t) => !t.fixed).map((t) => t.to)
}

/* When the category changes, tabs that only exist in the new category (Music for a music video,
   Script for anything but an event) start hidden too, so nothing appears unasked. */
export function hiddenAfterCategory(project, nextCategory) {
  const before = new Set(projectTabs(project).map((t) => t.to))
  const hidden = new Set(Array.isArray(project?.hiddenTabs) ? project.hiddenTabs : [])
  for (const t of projectTabs({ ...project, category: nextCategory })) if (!before.has(t.to) && !t.fixed) hidden.add(t.to)
  return [...hidden]
}
