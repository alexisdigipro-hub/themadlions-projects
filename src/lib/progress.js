import { lineEstimate } from './budget.js'

const clamp = (n) => Math.max(0, Math.min(1, n))

export function projectProgress(p, settings) {
  const scenes = p.scenes || []
  const days = p.shootingDays || []
  // Reports, where a shoot day was wrapped, was taken out with its Shoot / Event days done stage
  // (Alex, 10 Oct); the other stages share the bar by their weights
  const chars = [...new Set(scenes.flatMap((s) => s.characters || []))]
  const castDone = chars.length ? chars.filter((c) => (p.contacts || []).some((x) => x.kind === 'cast' && x.character?.toUpperCase() === c.toUpperCase())).length / chars.length : 0
  const locDone = days.length ? days.filter((d) => d.locationId).length / days.length : (p.locations || []).length ? 1 : 0
  const shotsScenes = scenes.length ? scenes.filter((s) => (p.shots || []).some((sh) => sh.sceneId === s.id)).length / scenes.length : 0
  // Post (cuts and deliverables) was taken out with its stages (Alex, 10 Oct). An Editing job's
  // first cut, approval and delivery are now boxes ticked by hand on the Overview.
  const tick = (k, label, weight) => ({ key: 'custom:' + k, label, weight, done: p.customStages?.[k] ? 1 : 0, manual: true, to: '' })
  const budgetDone = (p.budget?.lines || []).some((l) => lineEstimate(l) > 0) ? 1 : 0
  const isMv = p.category === 'Music Video'
  const hasDoc = !!(p.script?.text || (p.concept && scenes.length) || (isMv && (p.music?.sections || []).length))

  let stages
  if (p.category === 'Event') {
    const withBlocks = days.length ? days.filter((d) => (d.blocks || []).length).length / days.length : 0
    stages = [
      { key: 'brief', label: 'Brief and budget', weight: 15, done: clamp(((p.notes || p.concept) ? 0.5 : 0) + budgetDone * 0.5), to: 'budget' },
      { key: 'venue', label: 'Venue set', weight: 15, done: clamp(locDone), to: 'people?tab=locations' },
      { key: 'crew', label: 'Crew and talent', weight: 15, done: (p.contacts || []).length ? 1 : 0, to: 'people' },
      { key: 'ros', label: 'Run of show', weight: 20, done: clamp(withBlocks), to: 'schedule' },
    ]
  } else if (p.category === 'Editing') {
    stages = [
      { key: 'brief', label: 'Brief and materials in', weight: 10, done: hasDoc || (p.files || []).length > 0 ? 1 : 0, to: '' },
      tick('cut', 'First cut', 25),
      tick('approve', 'Client approval', 30),
      tick('deliver', 'Delivered', 35),
    ]
  } else {
    stages = [
      { key: 'doc', label: isMv ? 'Song and treatment in' : 'Script or treatment in', weight: 8, done: hasDoc ? 1 : 0, to: 'script' },
      { key: 'breakdown', label: 'Breakdown', weight: 10, done: scenes.length ? (p.breakdownStatus === 'ai' ? 1 : 0.7) : 0, to: 'script' },
      { key: 'budget', label: 'Budget', weight: 6, done: budgetDone, to: 'budget' },
      { key: 'cast', label: 'Cast attached', weight: 8, done: chars.length ? castDone : (p.contacts || []).some((c) => c.kind === 'cast') ? 1 : 0, to: 'people' },
      { key: 'locations', label: 'Locations set', weight: 8, done: clamp(locDone), to: 'people?tab=locations' },
      { key: 'shots', label: 'Shot list', weight: 8, done: clamp(shotsScenes), to: 'shots' },
      // the stripboard was taken out (Alex, 10 Oct): the stage is done once the project has its ordino
      { key: 'schedule', label: 'Ordino', weight: 12, done: days.length ? 1 : 0, to: 'schedule' },
    ]
  }
  // settings.progress[category] = { off: [keys], weights: {key: n}, custom: [{ key, label, weight }] }
  const conf = settings?.progress?.[p.category]
  if (conf) {
    stages = stages.filter((s) => !(conf.off || []).includes(s.key)).map((s) => ({ ...s, weight: conf.weights?.[s.key] ?? s.weight }))
    ;(conf.custom || []).forEach((c) => stages.push({ key: 'custom:' + c.key, label: c.label, weight: c.weight || 10, done: p.customStages?.[c.key] ? 1 : 0, manual: true, to: '' }))
  }
  if (!stages.length) return { pct: 0, stages: [] }
  if (p.status === 'Delivered') return { pct: 100, stages: stages.map((s) => ({ ...s, done: 1 })) }
  const total = stages.reduce((a, s) => a + s.weight, 0)
  const pct = Math.round(stages.reduce((a, s) => a + s.weight * s.done, 0) / total * 100)
  return { pct, stages }
}
