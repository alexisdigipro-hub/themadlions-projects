export const lineEstimate = (l) => (l.estimate !== '' && l.estimate != null ? Number(l.estimate) : Number(l.qty || 0) * Number(l.rate || 0))
export const linePaid = (l) => (l.payments || []).reduce((a, p) => a + Number(p.amount || 0), 0)
export const lineBalance = (l) => Math.max(0, lineEstimate(l) - linePaid(l))
