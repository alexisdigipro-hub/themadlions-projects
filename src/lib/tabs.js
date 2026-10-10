// The tabs a project workspace can show. One list, used by the tab bar itself and by the
// "Tabs" picker in the project form, so the two never drift apart.
//
// A project stores the tabs it does NOT want in `hiddenTabs` (route names). Hide-list, not a
// show-list, on purpose: old projects have nothing stored and keep every tab, and a tab added to
// the app later shows up everywhere without a migration. Overview cannot be hidden.

export function projectTabs(project) {
  const cat = project?.category
  return [
    // Overview carries the project's own Tasks, and the song player for a Music Video, so both
    // modules stay reachable (gated on their own permission) without a tab of their own.
    { to: '', label: 'Overview', end: true, key: 'projects', icon: 'overview', fixed: true },
    // second, right after Overview (Alex, 9 Oct). Someone without Budget sees it as "Add Receipt" (Project.jsx)
    { to: 'budget', label: 'Budget', key: 'budget', icon: 'budget' },
    // Breakdown is framed inside Script now (its own permission still gates that section)
    ...(cat === 'Event' ? [] : [
      { to: 'script', label: 'Script & Breakdown', key: 'script', icon: 'script' },
      { to: 'shots', label: 'Shot list', key: 'shots', icon: 'shots' },
    ]),
    // Call sheets is framed inside Schedule now (its own permission still gates that section)
    { to: 'schedule', label: cat === 'Event' ? 'Run of show & Sheets' : 'Schedule & Sheets', key: 'schedule', icon: 'schedule' },
    // opt-in: Alex doesn't use Post day to day; switch it on per project from Edit details > Tabs
    { to: 'post', label: 'Post', key: 'post', icon: 'post', optIn: true },
    { to: 'people', label: 'Project Database', key: ['contacts', 'locations', 'gear'], icon: 'people' },
    // opt-in: the moodboard / treatment deck, switched on per project from Edit details > Tabs
    { to: 'presentation', label: 'Presentation', key: 'projects', icon: 'deck', optIn: true },
    // Files & notes is framed on Overview now (its own permission still gates that section)
  ]
}

const OPT_IN = new Set(['post', 'presentation'])
export function tabHidden(project, to) {
  if (Array.isArray(project?.hiddenTabs) && project.hiddenTabs.includes(to)) return true
  // an opt-in tab is hidden unless the project lists it in `shownTabs`, so it never appears unasked
  if (OPT_IN.has(to)) return !(Array.isArray(project?.shownTabs) && project.shownTabs.includes(to))
  return false
}

/* The change to store when a tab chip is toggled: opt-in tabs live in shownTabs, the rest in hiddenTabs. */
export function toggleTab(project, to) {
  if (OPT_IN.has(to)) {
    const shown = Array.isArray(project?.shownTabs) ? project.shownTabs : []
    return { shownTabs: shown.includes(to) ? shown.filter((t) => t !== to) : [...shown, to] }
  }
  const hidden = Array.isArray(project?.hiddenTabs) ? project.hiddenTabs : []
  return { hiddenTabs: hidden.includes(to) ? hidden.filter((t) => t !== to) : [...hidden, to] }
}

/* Every tab a project of this category could hide: all but Overview. A new project starts with
   this list, so it opens with Overview alone and the rest are switched on one by one. */
export function allHideable(project) {
  return projectTabs(project).filter((t) => !t.fixed && !t.optIn).map((t) => t.to)
}

/* When the category changes, tabs that only exist in the new category (Script for anything but an
   event) start hidden too, so nothing appears unasked. */
export function hiddenAfterCategory(project, nextCategory) {
  const before = new Set(projectTabs(project).map((t) => t.to))
  const hidden = new Set(Array.isArray(project?.hiddenTabs) ? project.hiddenTabs : [])
  for (const t of projectTabs({ ...project, category: nextCategory })) if (!before.has(t.to) && !t.fixed && !t.optIn) hidden.add(t.to)
  return [...hidden]
}
