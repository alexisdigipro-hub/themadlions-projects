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
export function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // Monday = 0
  const start = new Date(year, month, 1 - startOffset)
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    days.push({ iso: toISODate(d), inMonth: d.getMonth() === month, dow: (d.getDay() + 6) % 7 })
  }
  return days
}

export function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function weekdayShort() {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
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
