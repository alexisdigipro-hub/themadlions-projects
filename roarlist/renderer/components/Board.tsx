// The storyboard view: every shot as a big frame with its number, framing and what we see.
import type { Project, Shot } from '../../shared/api'
import { fmtDur, ratio, shotNo } from '../../shared/print'
import { t, val } from '../i18n'
import type { Ops } from '../App'
import { shown } from '../settings'
import { useSettings } from '../useSettings'
import { Frame } from './Frame'
import { Icon } from './Icon'

export function Board({ p, ops }: { p: Project; ops: Ops }) {
  const r = ratio(p.aspect)
  useSettings() // redraw when the columns change
  const set = (id: string, patch: Partial<Shot>, history = false) => ops.edit((x) => ({
    ...x, scenes: x.scenes.map((sc) => ({ ...sc, shots: sc.shots.map((y) => (y.id === id ? { ...y, ...patch } : y)) })),
  }), history)

  return (
    <div className="scenes">
      {p.scenes.map((sc) => (
        <section key={sc.id} className="scene">
          <div className="scene-head static">
            <span className="scene-tag">{t.scene}</span><b className="scene-no-text">{sc.number}</b>
            <span className="grow ellipsis">{sc.heading}</span>
          </div>
          <div className={`board${r < 1 ? ' tall' : ''}`}>
            {sc.shots.map((s, i) => (
              <figure key={s.id} data-shot={s.id} className={`card${s.done ? ' is-done' : ''}`} onFocus={() => ops.setActive(s.id)}>
                <Frame projectId={p.id} image={s.image} ratio={r} big onImage={(f) => ops.setImage(s.id, f)} onClear={() => set(s.id, { image: '' }, true)} />
                <figcaption>
                  <div className="row">
                    <b className="no">{shotNo(sc.number, i)}</b>
                    <span className="tech grow ellipsis">{[shown('size') && s.size, shown('angle') && val(s.angle), shown('move') && val(s.move), shown('lens') && s.lens, shown('duration') && fmtDur(s.duration)].filter(Boolean).join(' · ')}</span>
                    <label className="done" title={t.done}><input type="checkbox" checked={s.done} onChange={(e) => set(s.id, { done: e.target.checked })} /><span><Icon name="check" size={13} /></span></label>
                  </div>
                  <textarea rows={2} value={s.description} placeholder={t.descPh} onChange={(e) => set(s.id, { description: e.target.value })} />
                </figcaption>
              </figure>
            ))}
            <button className="card add-card" style={{ aspectRatio: r }} onClick={() => ops.addShot(sc.id)}><Icon name="plus" size={22} />{t.addShot}</button>
          </div>
        </section>
      ))}
    </div>
  )
}
