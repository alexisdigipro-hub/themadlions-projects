export function pad(n) {
  return String(n).padStart(2, '0')
}

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISODate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, n) {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function fmtDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return ''
  return fromISODate(iso).toLocaleDateString('en-GB', opts)
}

export function fmtLong(iso) {
  return fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Returns 6 weeks x 7 days grid starting on Monday for the month containing `iso`. */
export function monthGrid(year, month, weekStart = 'monday') {
  const shift = weekStart === 'sunday' ? 0 : 6
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + shift) % 7
  const start = new Date(year, month, 1 - startOffset)
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    // dow: 5 and 6 are always the weekend columns' indices for Monday start; for Sunday start weekend is 0 and 6
    days.push({ iso: toISODate(d), inMonth: d.getMonth() === month, dow: (d.getDay() + shift) % 7, weekend: d.getDay() === 0 || d.getDay() === 6 })
  }
  return days
}

export function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function weekdayShort(weekStart = 'monday') {
  return weekStart === 'sunday' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
}

export function buildICS(events, calName = 'THEMADLIONS') {
  const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//THEMADLIONS//Projects//EN', `X-WR-CALNAME:${esc(calName)}`]
  for (const e of events) {
    const date = e.date.replace(/-/g, '')
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${e.id}@themadlions`)
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`)
    if (e.start) {
      lines.push(`DTSTART:${date}T${e.start.replace(':', '')}00`)
      lines.push(`DTEND:${date}T${(e.end || e.start).replace(':', '')}00`)
    } else {
      lines.push(`DTSTART;VALUE=DATE:${date}`)
    }
    lines.push(`SUMMARY:${esc(e.title)}`)
    if (e.locationText) lines.push(`LOCATION:${esc(e.locationText)}`)
    if (e.notes) lines.push(`DESCRIPTION:${esc(e.notes)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- Greek public holidays ---------- */

// Orthodox Easter, Meeus Julian algorithm shifted onto the Gregorian calendar.
// Verified against 2023-2030. The drift is 13 days until 2100.
export function orthodoxEaster(year) {
  const a = year % 4, b = year % 7, c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31)
  const day = ((d + e + 114) % 31) + 1
  // Read back in UTC, not local time: toISODate() reads local fields, which lands a day early
  // for anyone west of Greenwich and would move every movable holiday with it.
  const easter = new Date(Date.UTC(year, month - 1, day) + (year < 2100 ? 13 : 14) * 86400000)
  return `${easter.getUTCFullYear()}-${pad(easter.getUTCMonth() + 1)}-${pad(easter.getUTCDate())}`
}

// The days Greece does not work. Movable ones hang off Easter.
export function greekHolidays(year) {
  const easter = orthodoxEaster(year)
  const off = (n) => addDays(easter, n)
  return {
    [`${year}-01-01`]: 'New Year',
    [`${year}-01-06`]: 'Epiphany',
    [off(-48)]: 'Clean Monday',
    [`${year}-03-25`]: 'Independence Day',
    [off(-2)]: 'Good Friday',
    [easter]: 'Easter Sunday',
    [off(1)]: 'Easter Monday',
    [`${year}-05-01`]: 'Labour Day',
    [off(50)]: 'Holy Spirit Monday',
    [`${year}-08-15`]: 'Assumption',
    [`${year}-10-28`]: 'Ohi Day',
    [`${year}-12-25`]: 'Christmas',
    [`${year}-12-26`]: 'Boxing Day',
  }
}

// Holiday name for one date, or '' when it is an ordinary day.
export function holidayName(iso, on = true) {
  if (!on || !/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return ''
  return greekHolidays(Number(iso.slice(0, 4)))[iso] || ''
}
