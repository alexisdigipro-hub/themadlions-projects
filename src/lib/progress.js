import { lineEstimate } from './budget.js'

const clamp = (n) => Math.max(0, Math.min(1, n))

/* Weighted stages per project category. Each stage returns 0..1. */
export const PROGRESS_STAGE_KEYS = {
  Event: ['brief', 'venue', 'crew', 'ros', 'event', 'post'],
  Editing: ['brief', 'cut', 'approve', 'deliver'],
  default: ['doc', 'breakdown', 'budget', 'cast', 'locations', 'shots', 'schedule', 'shoot', 'post'],
}
export const stageKeysFor = (category) => PROGRESS_STAGE_KEYS[category] || PROGRESS_STAGE_KEYS.default

export function projectProgress(p, settings) {
  const scenes = p.scenes || []
  const days = p.shootingDays || []
  const scheduled = scenes.filter((s) => days.some((d) => d.sceneIds.includes(s.id))).length
  const reported = days.filter((d) => d.report?.wrap).length
  const chars = [...new Set(scenes.flatMap((s) => s.characters || []))]
  const castDone = chars.length ? chars.filter((c) => (p.contacts || []).some((x) => x.kind === 'cast' && x.character?.toUpperCase() === c.toUpperCase())).length / chars.length : 0
  const locDone = days.length ? days.filter((d) => d.locationId).length / days.length : (p.locations || []).length ? 1 : 0
  const shotsScenes = scenes.length ? scenes.filter((s) => (p.shots || []).some((sh) => sh.sceneId === s.id)).length / scenes.length : 0
  const cuts = p.post?.cuts || []
  const deliv = p.post?.deliverables || []
  const cutStage = cuts.some((c) => ['approved', 'locked'].includes(c.status)) ? 1 : cuts.some((c) => c.status === 'review' || c.status === 'notes') ? 0.6 : cuts.length ? 0.3 : 0
  const delivDone = deliv.length ? deliv.filter((d) => d.status === 'delivered').length / deliv.length : 0
  const budgetDone = (p.budget?.lines || []).some((l) => lineEstimate(l) > 0) ? 1 : 0
  const isMv = p.category === 'Music Video'
  const hasDoc = !!(p.script?.text || (p.concept && scenes.length) || (isMv && (p.music?.sections || []).length))

  let stages
  if (p.category === 'Event') {
    const withBlocks = days.length ? days.filter((d) => (d.blocks || []).length).length / days.length : 0
    stages = [
      { key: 'brief', label: 'Brief and budget', weight: 15, done: clamp(((p.notes || p.concept) ? 0.5 : 0) + budgetDone * 0.5), to: 'budget' },
      { key: 'venue', label: 'Venue set', weight: 15, done: clamp(locDone), to: 'locations' },
      { key: 'crew', label: 'Crew and talent', weight: 15, done: (p.contacts || []).length ? 1 : 0, to: 'people' },
      { key: 'ros', label: 'Run of show', weight: 20, done: clamp(withBlocks), to: 'schedule' },
      { key: 'event', label: 'Event days done', weight: 20, done: days.length ? clamp(reported / days.length) : 0, to: 'reports' },
      { key: 'post', label: 'Recap and deliverables', weight: 15, done: clamp(cutStage * 0.4 + delivDone * 0.6), to: 'post' },
    ]
  } else if (p.category === 'Editing') {
    stages = [
      { key: 'brief', label: 'Brief and materials in', weight: 10, done: hasDoc || (p.files || []).length > 0 ? 1 : 0, to: 'notes' },
      { key: 'cut', label: 'First cut', weight: 25, done: cuts.length ? 1 : 0, to: 'post' },
      { key: 'approve', label: 'Client approval', weight: 30, done: cutStage, to: 'post' },
      { key: 'deliver', label: 'Deliverables out', weight: 35, done: delivDone, to: 'post' },
    ]
  } else {
    stages = [
      { key: 'doc', label: isMv ? 'Song and treatment in' : 'Script or treatment in', weight: 8, done: hasDoc ? 1 : 0, to: isMv ? 'music' : 'script' },
      { key: 'breakdown', label: 'Breakdown', weight: 10, done: scenes.length ? (p.breakdownStatus === 'ai' ? 1 : 0.7) : 0, to: 'breakdown' },
      { key: 'budget', label: 'Budget', weight: 6, done: budgetDone, to: 'budget' },
      { key: 'cast', label: 'Cast attached', weight: 8, done: chars.length ? castDone : (p.contacts || []).some((c) => c.kind === 'cast') ? 1 : 0, to: 'people' },
      { key: 'locations', label: 'Locations set', weight: 8, done: clamp(locDone), to: 'locations' },
      { key: 'shots', label: 'Shot list', weight: 8, done: clamp(shotsScenes), to: 'shots' },
      { key: 'schedule', label: 'Schedule', weight: 12, done: scenes.length ? clamp(scheduled / scenes.length) : days.length ? 1 : 0, to: 'schedule' },
      { key: 'shoot', label: 'Shoot', weight: 25, done: days.length ? clamp(reported / days.length) : 0, to: 'reports' },
      { key: 'post', label: 'Post and delivery', weight: 15, done: clamp(cutStage * 0.5 + delivDone * 0.5), to: 'post' },
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
