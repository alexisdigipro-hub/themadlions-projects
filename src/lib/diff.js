// Line diff for script revisions. Trims the common start and end, then runs an
// LCS on the changed middle (capped, so a huge rewrite still renders quickly).

export const REVISION_COLORS = [
  ['White', '#f4f1ea'], ['Blue', '#8fb8e8'], ['Pink', '#f2a7c3'], ['Yellow', '#f3d95c'], ['Green', '#8fd19e'],
  ['Goldenrod', '#e2b23f'], ['Buff', '#e6d3a3'], ['Salmon', '#f2a689'], ['Cherry', '#e26d7a'], ['Tan', '#d2b48c'],
  ['Gray', '#b9b9b9'], ['Ivory', '#f7f3e3'],
]
export const nextRevisionColor = (used) => {
  const names = REVISION_COLORS.map(([n]) => n)
  const idx = used.length ? names.indexOf(used[used.length - 1]) + 1 : 0
  if (idx < names.length) return names[idx]
  return `Double ${names[idx % names.length]}`
}
export const revisionHex = (name) => {
  const base = (name || '').replace(/^Double /, '')
  return REVISION_COLORS.find(([n]) => n === base)?.[1] || '#f4f1ea'
}

export function diffLines(aText, bText, cap = 1800) {
  const a = (aText || '').split('\n'), b = (bText || '').split('\n')
  let s = 0
  while (s < a.length && s < b.length && a[s] === b[s]) s++
  let ea = a.length, eb = b.length
  while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb-- }
  const out = []
  for (let i = 0; i < s; i++) out.push({ t: ' ', l: a[i] })
  const ma = a.slice(s, ea), mb = b.slice(s, eb)
  if (ma.length * mb.length > cap * cap) {
    ma.forEach((l) => out.push({ t: '-', l }))
    mb.forEach((l) => out.push({ t: '+', l }))
  } else {
    const n = ma.length, m = mb.length
    const dp = new Array((n + 1) * (m + 1)).fill(0)
    const W = m + 1
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i * W + j] = ma[i] === mb[j] ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1])
    let i = 0, j = 0
    while (i < n && j < m) {
      if (ma[i] === mb[j]) { out.push({ t: ' ', l: ma[i] }); i++; j++ }
      else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) { out.push({ t: '-', l: ma[i] }); i++ }
      else { out.push({ t: '+', l: mb[j] }); j++ }
    }
    while (i < n) out.push({ t: '-', l: ma[i++] })
    while (j < m) out.push({ t: '+', l: mb[j++] })
  }
  for (let i = ea; i < a.length; i++) out.push({ t: ' ', l: a[i] })
  const added = out.filter((x) => x.t === '+').length, removed = out.filter((x) => x.t === '-').length
  return { lines: out, added, removed }
}

// Collapse unchanged runs so a long script shows only the changed regions with context.
export function hunks(lines, context = 3) {
  const keep = new Array(lines.length).fill(false)
  lines.forEach((x, i) => {
    if (x.t === ' ') return
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) keep[k] = true
  })
  const out = []
  let skipped = 0
  lines.forEach((x, i) => {
    if (keep[i]) {
      if (skipped) { out.push({ t: '…', n: skipped }); skipped = 0 }
      out.push(x)
    } else skipped++
  })
  if (skipped) out.push({ t: '…', n: skipped })
  return out
}
