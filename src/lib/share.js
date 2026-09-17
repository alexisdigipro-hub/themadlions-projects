import { fmtLong } from './dates.js'
import { formatPages } from './breakdown.js'
import { ATHENS, coordsFromText, sunTimes } from './sun.js'

// Greek mobiles: 69X XXX XXXX -> +30. Anything already international is kept.
export function waNumber(phone) {
  let d = String(phone || '').replace(/[^\d+]/g, '')
  if (!d) return ''
  if (d.startsWith('+')) d = d.slice(1)
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 10 && d.startsWith('69')) d = '30' + d
  if (d.length === 10 && d.startsWith('2')) d = '30' + d
  return d
}
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`
export const waShareLink = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`
export const mailLink = ({ to = [], bcc = [], subject, body }) =>
  `mailto:${to.join(',')}?${bcc.length ? `bcc=${bcc.join(',')}&` : ''}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
export const mapsLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

const addMin = (hhmm, m) => {
  if (!hhmm) return ''
  const [h, mm] = hhmm.split(':').map(Number)
  const t = h * 60 + mm + (m || 0)
  return `${String(Math.floor(((t % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((t % 60) + 60) % 60).padStart(2, '0')}`
}

/* Full call sheet as a WhatsApp-friendly message. */
export function callSheetText({ project, day, dayIndex, dayCount, scenes, loc, cast, crew, sheet }) {
  const coords = (loc?.lat && loc?.lon) ? { lat: Number(loc.lat), lon: Number(loc.lon) } : coordsFromText(loc?.address) || null
  const sun = sunTimes(day.date, coords?.lat ?? ATHENS.lat, coords?.lon ?? ATHENS.lon)
  const L = []
  L.push(`*${project.title.toUpperCase()}* · CALL SHEET`)
  L.push(`Day ${dayIndex + 1} of ${dayCount} · ${fmtLong(day.date)}${day.unit && day.unit !== 'Main unit' ? ` · ${day.unit}` : ''}`)
  L.push('')
  L.push(`*General call: ${day.callTime}*   Est. wrap: ${day.wrapTime}`)
  if (loc) {
    L.push(`*Location:* ${loc.name}`)
    if (loc.address) L.push(`${loc.address}\n${mapsLink(loc.address)}`)
    if (loc.parking || loc.notes) L.push(loc.notes || '')
  }
  if (sun) L.push(`Sunrise ${sun.sunrise} · Sunset ${sun.sunset}`)
  if (sheet?.forecast) L.push(`Weather: ${sheet.forecast.summary}, ${sheet.forecast.tmin}° to ${sheet.forecast.tmax}°C${sheet.forecast.rain != null ? `, rain ${sheet.forecast.rain}%` : ''}`)
  L.push('')
  if ((day.blocks || []).length) {
    L.push('*Run of show*')
    day.blocks.forEach((b) => L.push(`${b.time}${b.end ? `–${b.end}` : ''} ${b.item}${b.owner ? ` · ${b.owner}` : ''}`))
    L.push('')
  }
  if (scenes.length) {
    L.push('*Scenes*')
    scenes.forEach((s) => L.push(`${s.number}. ${s.intExt} ${s.location || s.heading}${s.timeOfDay ? ` · ${s.timeOfDay}` : ''} · ${formatPages(s.eighths)} pg${s.characters?.length ? ` · ${s.characters.join(', ')}` : ''}`))
    L.push('')
  }
  if (cast.length) {
    L.push('*Cast*')
    cast.forEach((r) => L.push(`${r.character}${r.actor ? ` · ${r.actor.name}` : ''} · call ${r.call}`))
    L.push('')
  }
  if (crew.length) {
    L.push('*Crew*')
    crew.forEach((c) => L.push(`${c.name} · ${c.role || c.dept} · call ${c.call}`))
    L.push('')
  }
  if (sheet?.weather) L.push(`Safety / hospital: ${sheet.weather}`)
  if (sheet?.notes) L.push(`Notes: ${sheet.notes}`)
  L.push('')
  L.push('Please reply "OK" to confirm you received this.')
  return L.join('\n')
}

/* One person's message: just what they need. */
export function personalCallText({ project, day, dayIndex, loc, person, call, scenes }) {
  const L = []
  L.push(`Hi ${person.name.split(' ')[0]}, call sheet for *${project.title}*, Day ${dayIndex + 1}, ${fmtLong(day.date)}.`)
  L.push(`*Your call: ${call}*${person.kind === 'cast' && person.character ? ` (${person.character})` : person.role ? ` (${person.role})` : ''}`)
  if (loc) L.push(`Location: ${loc.name}${loc.address ? `, ${loc.address}\n${mapsLink(loc.address)}` : ''}`)
  if (scenes?.length) L.push(`Scenes: ${scenes.map((s) => s.number).join(', ')}`)
  L.push(`Est. wrap ${day.wrapTime}.`)
  L.push('Please reply "OK" to confirm.')
  return L.join('\n')
}

export const callFor = (day, person) => addMin(day.callTime, person.callOffset || 0)
