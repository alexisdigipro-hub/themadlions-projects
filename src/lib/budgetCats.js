// Budget categories: the list a budget line is filed under, in groups, each with the Finance
// expense column a payment on it lands in. Editable in Settings > Budget (administrators); stored
// as settings.budgetCategories = [{ name, cats: [{ name, fin }] }]. Nothing stored = the standard
// list below, so a workspace that never touched it behaves as before.

export const DEFAULT_GROUPS = [
  { name: 'Above the line', cats: [
    { name: 'Story & rights', fin: 'Music & rights' }, { name: 'Producer', fin: 'Crew' }, { name: 'Director', fin: 'Crew' }, { name: 'Cast', fin: 'Cast' }, { name: 'Casting', fin: 'Cast' },
  ] },
  { name: 'Production', cats: [
    { name: 'Production staff', fin: 'Crew' }, { name: 'Extras', fin: 'Cast' }, { name: 'Camera', fin: 'Crew' }, { name: 'Lighting', fin: 'Crew' }, { name: 'Grip', fin: 'Crew' }, { name: 'Sound', fin: 'Crew' },
    { name: 'Art & set', fin: 'Art & props' }, { name: 'Props', fin: 'Art & props' }, { name: 'Wardrobe', fin: 'Wardrobe & makeup' }, { name: 'Makeup & hair', fin: 'Wardrobe & makeup' },
    { name: 'Locations', fin: 'Locations & permits' }, { name: 'Studio', fin: 'Locations & permits' }, { name: 'Transport', fin: 'Transport' }, { name: 'Catering', fin: 'Catering' },
    { name: 'Equipment rental', fin: 'Equipment rental' }, { name: 'Production office', fin: 'Office rent' }, { name: 'Travel & accommodation', fin: 'Travel' },
  ] },
  { name: 'Post-production', cats: [
    { name: 'Editing', fin: 'Post-production' }, { name: 'Color', fin: 'Post-production' }, { name: 'Sound post', fin: 'Post-production' }, { name: 'Music', fin: 'Music & rights' },
    { name: 'VFX', fin: 'Post-production' }, { name: 'Titles & graphics', fin: 'Post-production' }, { name: 'Deliverables', fin: 'Post-production' }, { name: 'Subtitles', fin: 'Post-production' },
  ] },
  { name: 'Other', cats: [
    { name: 'Insurance', fin: 'Insurance' }, { name: 'Legal & accounting', fin: 'Accounting & legal' }, { name: 'Marketing', fin: 'Marketing' }, { name: 'Festival & distribution', fin: 'Marketing' },
    { name: 'Contingency', fin: 'Other expense' }, { name: 'Misc', fin: 'Other expense' },
  ] },
]

const clone = (g) => g.map((x) => ({ name: x.name, cats: x.cats.map((c) => ({ name: c.name, fin: c.fin || 'Other expense' })) }))

/* The groups in force: what Settings holds, or the standard list. Always a fresh copy. */
export function budgetGroups(settings) {
  const g = settings?.budgetCategories
  if (!Array.isArray(g) || !g.length) return clone(DEFAULT_GROUPS)
  return clone(g.filter((x) => x && typeof x.name === 'string' && Array.isArray(x.cats)))
}

/* [[groupName, [cat, cat, …]], …], the shape the Budget page reads. Lines filed under a category
   that is no longer in the list are not lost: they show under an extra "Unlisted" group. */
export function groupPairs(settings, lines = []) {
  const groups = budgetGroups(settings)
  const known = new Set(groups.flatMap((g) => g.cats.map((c) => c.name)))
  const stray = [...new Set(lines.map((l) => l.category).filter((c) => c && !known.has(c)))]
  const pairs = groups.map((g) => [g.name, g.cats.map((c) => c.name)])
  if (stray.length) pairs.push(['Unlisted', stray])
  return pairs
}

export const budgetCategories = (settings) => budgetGroups(settings).flatMap((g) => g.cats.map((c) => c.name))

/* Where a payment on this budget category lands in Finance. */
export function finCatFor(settings, cat) {
  for (const g of budgetGroups(settings)) for (const c of g.cats) if (c.name === cat) return c.fin || 'Other expense'
  return 'Other expense'
}

/* The other way: a Finance expense mirrored into a budget picks the first category that maps to
   its column, else Misc, else the last category there is. */
export function budgetCatForFin(settings, finCat) {
  const groups = budgetGroups(settings)
  for (const g of groups) for (const c of g.cats) if (c.fin === finCat) return c.name
  const all = groups.flatMap((g) => g.cats.map((c) => c.name))
  return all.includes('Misc') ? 'Misc' : all[all.length - 1] || 'Misc'
}

/* How many budget lines, over how many projects, sit under this category. */
export function categoryUses(state, cat) {
  let lines = 0, projects = 0
  for (const p of state.projects || []) {
    const n = (p.budget?.lines || []).filter((l) => l.category === cat).length
    if (n) { lines += n; projects += 1 }
  }
  return { lines, projects }
}

/* Move every line under `from` to `to`, in every project. Returns how many moved. */
export function moveLines(s, from, to) {
  let n = 0
  for (const p of s.projects || []) {
    let here = 0
    for (const l of p.budget?.lines || []) if (l.category === from) { l.category = to; here += 1 }
    if (here) { p.updatedAt = new Date().toISOString(); n += here }
  }
  return n
}

/* Rename a category in the list and in every project's lines, so nothing goes unlisted. */
export function renameCategory(s, from, to) {
  const groups = budgetGroups(s.settings)
  for (const g of groups) for (const c of g.cats) if (c.name === from) c.name = to
  s.settings = { ...s.settings, budgetCategories: groups }
  return moveLines(s, from, to)
}
