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
