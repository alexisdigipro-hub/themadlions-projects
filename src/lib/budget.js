import { today, uid } from './store.jsx'

export const lineEstimate = (l) => (l.estimate !== '' && l.estimate != null ? Number(l.estimate) : Number(l.qty || 0) * Number(l.rate || 0))
export const linePaid = (l) => (l.payments || []).reduce((a, p) => a + Number(p.amount || 0), 0)
export const lineBalance = (l) => Math.max(0, lineEstimate(l) - linePaid(l))

// Finance pays with 'Bank' / 'Cash' / 'Card' / 'Other'; My work says 'Bank transfer' / 'Cash' / 'Invoice' / 'Other'.
const WL_METHOD = { Bank: 'Bank transfer', Cash: 'Cash', Card: 'Other', Other: 'Other' }

/*
 * A budget line paid to a team member is mirrored as one job in that member's My work, so they
 * see what they are owed without typing it, and see it turn to paid when Finance pays it.
 * The job carries budgetLineId; that is the link. Call this after any change to the line or
 * its payments. Pass a line with no memberId (or a deleted line) and the mirrored job goes.
 *
 * Status: while the budget holds no payment on the line, whatever the member set stays (they
 * may mark themselves paid by hand). Once a payment exists, the line decides: settled = paid.
 */
export function syncLineWorklog(s, project, line) {
  s.worklog = s.worklog || []
  const i = s.worklog.findIndex((e) => e.budgetLineId === line?.id)
  if (!line || !line.memberId || lineEstimate(line) <= 0) {
    if (i >= 0) s.worklog.splice(i, 1)
    return
  }
  const prev = i >= 0 ? s.worklog[i] : null
  const pays = line.payments || []
  const last = pays[pays.length - 1]
  const settled = pays.length > 0 && lineBalance(line) === 0
  const next = {
    id: prev?.id || uid(),
    createdAt: prev?.createdAt || new Date().toISOString(),
    userId: line.memberId,
    budgetLineId: line.id,
    projectId: project.id,
    date: line.date || prev?.date || today(),
    client: project.client || project.title,
    description: project.client ? `${project.title} · ${line.description}` : line.description,
    amount: lineEstimate(line),
    notes: prev?.notes || '',
    method: pays.length ? WL_METHOD[last.method] || prev?.method || 'Bank transfer' : prev?.method || 'Bank transfer',
    status: pays.length ? (settled ? 'paid' : 'pending') : prev?.status || 'pending',
    paidDate: pays.length ? (settled ? last.date : '') : prev?.paidDate || '',
  }
  if (i >= 0) s.worklog[i] = next
  else s.worklog.push(next)
}

export function dropLineWorklog(s, lineId) {
  if (!s.worklog) return
  s.worklog = s.worklog.filter((e) => e.budgetLineId !== lineId)
}
