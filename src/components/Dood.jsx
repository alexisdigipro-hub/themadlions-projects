import { fmtDate } from '../lib/dates.js'

/*
  Day Out of Days. Rows are characters, columns are shoot days.
  SW start work · W work · WF work finish · SWF start and finish · H hold (idle between work days).
*/
export function computeDood(project) {
  const days = [...project.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
  const sceneById = Object.fromEntries(project.scenes.map((s) => [s.id, s]))
  const chars = [...new Set(project.scenes.flatMap((s) => s.characters || []))]
  const rows = chars.map((name) => {
    const works = days.map((d) => d.sceneIds.some((id) => (sceneById[id]?.characters || []).includes(name)))
    const first = works.indexOf(true)
    const last = works.lastIndexOf(true)
    const cells = days.map((_, i) => {
      if (first === -1) return ''
      if (i < first || i > last) return ''
      if (works[i]) {
        if (first === last) return 'SWF'
        if (i === first) return 'SW'
        if (i === last) return 'WF'
        return 'W'
      }
      return 'H'
    })
    const work = cells.filter((c) => c && c !== 'H').length
    const hold = cells.filter((c) => c === 'H').length
    const actor = project.contacts.find((c) => c.kind === 'cast' && c.character?.toUpperCase() === name.toUpperCase())
    return { name, actor: actor?.name || '', cells, work, hold, total: work + hold }
  })
  rows.sort((a, b) => b.work - a.work || a.name.localeCompare(b.name))
  return { days, rows }
}

export default function Dood({ project }) {
  const { days, rows } = computeDood(project)
  if (!days.length) return <p className="muted">Add shoot days and assign scenes to see the Day Out of Days.</p>
  const perDay = days.map((_, i) => rows.filter((r) => r.cells[i] && r.cells[i] !== 'H').length)
  return (
    <div className="table-wrap">
      <table className="table dood">
        <thead>
          <tr>
            <th className="sticky">Character</th>
            {days.map((d, i) => (
              <th key={d.id} className="dood-day">
                <div>Day {i + 1}</div>
                <small className="muted">{fmtDate(d.date, { day: 'numeric', month: 'short' })}</small>
              </th>
            ))}
            <th>Work</th>
            <th>Hold</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="sticky">
                <strong>{r.name}</strong>
                {r.actor && <div className="muted small">{r.actor}</div>}
              </td>
              {r.cells.map((c, i) => (
                <td key={i} className={`dood-cell ${c ? 'c-' + c : ''}`}>{c}</td>
              ))}
              <td>{r.work}</td>
              <td>{r.hold}</td>
              <td>{r.total}</td>
            </tr>
          ))}
          <tr className="dood-total">
            <td className="sticky">Cast on set</td>
            {perDay.map((n, i) => <td key={i}>{n}</td>)}
            <td /><td /><td />
          </tr>
        </tbody>
      </table>
      <p className="muted small">SW start work · W work · WF work finish · SWF one day only · H hold between work days.</p>
    </div>
  )
}
