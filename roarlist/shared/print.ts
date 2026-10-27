// The printed shot list: one HTML page that becomes the PDF (A4 landscape) or the shareable .html file.
import type { PrintLabels, PrintMode, Project, Shot } from './api'

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const br = (s: string) => esc(s).replace(/\n/g, '<br>')

export const ratio = (aspect: string) => {
  const m = /^([\d.]+):([\d.]+)$/.exec(aspect || '')
  const r = m ? Number(m[1]) / Number(m[2]) : 16 / 9
  return r > 0 && isFinite(r) ? r : 16 / 9
}

// 1A, 1B… (no I and O, they read as 1 and 0 on set)
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const shotNo = (scene: string, i: number) =>
  `${scene || ''}${i < LETTERS.length ? LETTERS[i] : LETTERS[Math.floor(i / LETTERS.length) - 1] + LETTERS[i % LETTERS.length]}`

export const fmtDur = (s: number) => (s > 0 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '')

export function totals(p: Project) {
  let shots = 0, done = 0, secs = 0
  for (const sc of p.scenes) for (const s of sc.shots) { shots++; if (s.done) done++; secs += s.duration || 0 }
  return { shots, done, secs }
}

export function printHtml(p: Project, mode: PrintMode, L: PrintLabels, img: (file: string) => string, forScreen = false) {
  const v = (k: string) => (k ? L.values[k] || k : '')
  const on = (col: string) => !(L.hide || []).includes(col)
  const cell = (col: string, html: string, cls = '') => (on(col) ? `<td${cls ? ` class="${cls}"` : ''}>${html}</td>` : '')
  const th = (col: string, label: string, cls = '') => (on(col) ? `<th${cls ? ` class="${cls}"` : ''}>${esc(label)}</th>` : '')
  const t = totals(p)
  const meta = [
    p.client && `<span><i>${esc(L.client)}</i>${esc(p.client)}</span>`,
    p.director && `<span><i>${esc(L.director)}</i>${esc(p.director)}</span>`,
    p.dop && `<span><i>${esc(L.dop)}</i>${esc(p.dop)}</span>`,
    p.date && `<span><i>${esc(L.date)}</i>${esc(new Date(p.date + 'T12:00').toLocaleDateString())}</span>`,
    `<span><i>${esc(L.shots)}</i>${t.shots}${t.secs ? ` · ${fmtDur(t.secs)}` : ''}</span>`,
  ].filter(Boolean).join('')
  const frame = (s: Shot) => s.image ? `<img src="${esc(img(s.image))}" alt="">` : ''
  const tech = (s: Shot) => [on('size') && s.size, on('angle') && v(s.angle), on('move') && v(s.move), on('lens') && s.lens].filter(Boolean).map((x) => esc(String(x))).join(' · ')

  const body = p.scenes.map((sc) => {
    const head = `<h2><b>${esc(L.scene)} ${esc(sc.number)}</b>${sc.heading ? ` ${esc(sc.heading)}` : ''}</h2>`
    if (mode === 'board') {
      return `<section>${head}<div class="board">${sc.shots.map((s, i) => `
        <figure class="${s.done ? 'is-done' : ''}">
          <div class="frame">${frame(s)}</div>
          <figcaption><b>${esc(shotNo(sc.number, i))}</b> <span class="tech">${tech(s)}${on('duration') && s.duration ? ` · ${fmtDur(s.duration)}` : ''}</span>
          ${s.description ? `<p>${br(s.description)}</p>` : ''}${on('cast') && s.cast ? `<p class="cast">${esc(s.cast)}</p>` : ''}</figcaption>
        </figure>`).join('')}</div></section>`
    }
    return `<section>${head}<table>
      <thead><tr><th class="c-no">${esc(L.shot)}</th>${th('frame', L.frame, 'c-fr')}${th('size', L.size)}${th('angle', L.angle)}${th('move', L.move)}
      ${th('lens', L.lens)}<th class="c-desc">${esc(L.description)}</th>${th('cast', L.cast)}${th('duration', L.duration)}${th('notes', L.notes, 'c-notes')}<th class="c-ok"></th></tr></thead>
      <tbody>${sc.shots.map((s, i) => `<tr class="${s.done ? 'is-done' : ''}">
        <td class="c-no"><b>${esc(shotNo(sc.number, i))}</b></td>${cell('frame', s.image ? `<div class="frame">${frame(s)}</div>` : '', 'c-fr')}
        ${cell('size', esc(s.size))}${cell('angle', esc(v(s.angle)))}${cell('move', esc(v(s.move)))}${cell('lens', esc(s.lens))}
        <td class="c-desc">${br(s.description)}</td>${cell('cast', esc(s.cast))}${cell('duration', fmtDur(s.duration))}${cell('notes', br(s.notes), 'c-notes')}
        <td class="c-ok">${s.done ? '✓' : '<span class="box"></span>'}</td></tr>`).join('')}</tbody></table></section>`
  }).join('')

  const r = ratio(p.aspect)
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title || 'RoarList')}</title><style>
@page { size: ${L.paper === 'Letter' ? 'letter' : 'A4'} landscape; margin: 12mm 12mm 14mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 9.5pt/1.4 Jost, Futura, 'Avenir Next', 'Century Gothic', 'Segoe UI', Helvetica, Arial, sans-serif; color: #151412; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
${forScreen ? 'body { padding: 32px; max-width: 1400px; margin: 0 auto; }' : ''}
header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding-bottom: 10px; border-bottom: 2px solid #151412; margin-bottom: 14px; }
h1 { margin: 0; font-size: 20pt; font-weight: 500; letter-spacing: .01em; }
.mark { font-size: 9pt; letter-spacing: .2em; white-space: nowrap; }
.mark b { font-weight: 300; } .mark i { font-style: normal; font-weight: 700; color: #d40000; }
.meta { display: flex; flex-wrap: wrap; gap: 4px 18px; margin-top: 6px; color: #3c3a35; }
.meta i { font-style: normal; color: #8a857b; margin-right: 5px; text-transform: uppercase; font-size: 7.5pt; letter-spacing: .08em; }
.notes { margin: -4px 0 14px; color: #3c3a35; }
section { margin-bottom: 14px; }
h2 { font-size: 10.5pt; font-weight: 400; margin: 0 0 6px; padding: 5px 10px; background: #f1ede4; border-left: 3px solid #d40000; break-after: avoid; }
h2 b { font-weight: 700; margin-right: 6px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-weight: 500; font-size: 7.5pt; letter-spacing: .08em; text-transform: uppercase; color: #8a857b; padding: 4px 6px; border-bottom: 1px solid #d8d3c8; }
td { padding: 6px; border-bottom: 1px solid #ebe7dd; vertical-align: top; }
tr { break-inside: avoid; }
.c-no { width: 42px; } .c-fr { width: 128px; } .c-desc { width: 26%; } .c-notes { width: 15%; color: #3c3a35; } .c-ok { width: 22px; text-align: center; }
.c-fr .frame { width: 116px; }
.frame { aspect-ratio: ${r}; background: #f1ede4; border-radius: 3px; overflow: hidden; display: grid; place-items: center; }
.frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
.box { display: inline-block; width: 10px; height: 10px; border: 1px solid #b9b3a6; border-radius: 2px; }
.is-done td, .is-done figcaption { color: #8a857b; }
.board { display: grid; grid-template-columns: repeat(${r < 1 ? 5 : 3}, 1fr); gap: 12px 14px; }
figure { margin: 0; break-inside: avoid; }
figcaption { padding-top: 5px; }
figcaption p { margin: 2px 0 0; }
.tech { color: #8a857b; font-size: 8.5pt; }
.cast { color: #8a857b; font-size: 8.5pt; }
footer { margin-top: 18px; color: #8a857b; font-size: 7.5pt; letter-spacing: .08em; }
</style></head><body>
<header><div><h1>${esc(p.title || 'RoarList')}</h1><div class="meta">${meta}</div></div><div class="mark"><b>ROAR</b><i>LIST</i></div></header>
${p.notes ? `<p class="notes">${br(p.notes)}</p>` : ''}
${body}
${forScreen ? '<footer>ROARLIST · THEMADLIONS LAB</footer>' : ''}
</body></html>`
}
