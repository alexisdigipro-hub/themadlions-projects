import { addDays } from './dates.js'
import { today, uid } from './store.jsx'

/* A shoot day, the thing a call sheet belongs to. One place for its shape so the stripboard, the
   run of show and New call sheet all make the same thing. An Event's day carries the run of
   show's blocks and ends late; every other project's day carries scenes and ends at seven. */
export const emptyShootDay = (date, d = {}) => ({ id: uid(), date, unit: 'Main unit', callTime: d.callTime || '07:00', wrapTime: d.wrapTime || '19:00', locationId: d.locationId || '', notes: '', sceneIds: [] })
export const emptyEventDay = (date, d = {}) => ({ id: uid(), date, callTime: d.callTime || '07:00', wrapTime: d.wrapTime || '23:59', unit: 'Main stage', locationId: d.locationId || '', sceneIds: [], blocks: [], notes: '' })
export const newDayFor = (project, date, d) => (project?.category === 'Event' ? emptyEventDay(date, d) : emptyShootDay(date, d))

/* The date a new day most likely is: the day after the last one, else the project's start, else
   today. */
export const nextDayDate = (project) => {
  const days = (project?.shootingDays || []).map((x) => x.date).filter(Boolean).sort()
  return days.length ? addDays(days[days.length - 1], 1) : project?.startDate || today()
}

/* The dates a project's ordino is for (Alex, 10 Oct: "no shoot day to add, the date is a given"): the
   shoot days this project has in the Calendar, a range counted day by day; with none there and no
   ordino yet, the project's start date. Ordino & Program makes the day behind each date by itself. */
export const ordinoDates = (project, events = []) => {
  const out = new Set()
  events.filter((e) => e.projectId === project?.id && e.type === 'shoot' && e.date).forEach((e) => {
    const last = e.endDate && e.endDate > e.date ? e.endDate : e.date
    for (let d = e.date, i = 0; d <= last && i < 62; d = addDays(d, 1), i += 1) out.add(d)
  })
  if (!out.size && !(project?.shootingDays || []).length && project?.startDate) out.add(project.startDate)
  return [...out].sort()
}
