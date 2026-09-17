import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { ELEMENT_CATEGORIES, useStore } from '../../lib/store.jsx'
import { formatPages, keywordHints, parseScript, stripColor } from '../../lib/breakdown.js'
import { aiBreakdown } from '../../lib/ai.js'
import { download } from '../../lib/dates.js'
import { revisionHex } from '../../lib/diff.js'

const TIMES = ['', 'DAY', 'NIGHT', 'DAWN', 'DUSK', 'CONTINUOUS']

export default function Breakdown() {
  const { project, edit, canEdit } = useProject()
  const { state } = useStore()
  const toast = useToast()
  const [open, setOpen] = useState(null)
  const [progress, setProgress] = useState(null)
  const [view, setView] = useState('scenes')
  const editable = canEdit('breakdown')

  const runRules = () => {
    if (!project.script.text) return toast('Import a script first.', 'error')
    const res = parseScript(project.script.text)
    if (!res.scenes.length) return toast('No scene headings found. Check the script uses INT./EXT. or ΕΣΩΤ./ΕΞΩΤ. headings.', 'error')
    let kept = 0, changed = 0
    edit((p) => {
      // Re-detection after a revision: match scenes by heading so breakdown tags,
      // shots and schedule survive. Scenes whose text changed get flagged.
      const norm = (h) => (h || '').toUpperCase().replace(/^\d+[A-Z]?[.)]?\s+/, '').replace(/\s+/g, ' ').trim()
      const pool = [...p.scenes]
      const rev = p.script.revision || 'White'
      const merged = res.scenes.map((n) => {
        const i = pool.findIndex((o) => norm(o.heading) === norm(n.heading))
        if (i === -1) return { ...n, elements: keywordHints(n.body), elementsSource: 'hints', revisedIn: p.scenes.length ? rev : '' }
        const o = pool.splice(i, 1)[0]
        kept += 1
        const textChanged = (o.body || '').trim() !== (n.body || '').trim()
        if (textChanged) changed += 1
        return {
          ...n,
          id: o.id,
          number: o.number && !/^\d+$/.test(o.number) ? o.number : n.number,
          elements: Object.keys(o.elements || {}).length ? o.elements : keywordHints(n.body),
          elementsSource: Object.keys(o.elements || {}).length ? o.elementsSource : 'hints',
          flags: o.flags || [],
          notes: o.notes || '',
          dayId: o.dayId || '',
          shot: o.shot,
          synopsis: p.breakdownStatus === 'ai' && !textChanged ? o.synopsis : n.synopsis,
          eighths: textChanged ? n.eighths : o.eighths,
          characters: textChanged ? n.characters : [...new Set([...(o.characters || []), ...n.characters])],
          revisedIn: textChanged ? rev : o.revisedIn || '',
        }
      })
      const ids = new Set(merged.map((s) => s.id))
      p.shootingDays.forEach((d) => (d.sceneIds = d.sceneIds.filter((id) => ids.has(id))))
      p.shots = (p.shots || []).filter((sh) => ids.has(sh.sceneId))
      p.scenes = merged
      if (!p.breakdownStatus || p.breakdownStatus === 'none') p.breakdownStatus = 'rules'
    })
    toast(kept ? `${res.scenes.length} scenes · ${kept} matched · ${changed} changed · ${res.scenes.length - kept} new` : `${res.scenes.length} scenes, ${res.characters.length} characters found`, 'ok')
  }

  const runAI = async () => {
    if (!state.settings.aiKey) return toast('Add your Anthropic API key in Settings first.', 'error')
    let scenes = project.scenes
    if (!scenes.length) {
      if (!project.script.text) return toast('Import a script first.', 'error')
      scenes = parseScript(project.script.text).scenes
      if (!scenes.length) return toast('No scene headings found.', 'error')
      edit((p) => {
        p.scenes = scenes
        p.breakdownStatus = 'rules'
      })
    }
    setProgress({ done: 0, total: scenes.length })
    try {
      const result = await aiBreakdown({ scenes, settings: state.settings, onProgress: (done, total) => setProgress({ done, total }) })
      edit((p) => {
        for (const s of p.scenes) {
          const r = result[s.id]
          if (!r) continue
          if (r.intExt) s.intExt = r.intExt
          if (r.location) s.location = r.location
          if (r.timeOfDay !== undefined) s.timeOfDay = r.timeOfDay
          if (r.synopsis) s.synopsis = r.synopsis
          if (r.characters?.length) s.characters = [...new Set([...s.characters, ...r.characters])]
          if (r.eighths) s.eighths = r.eighths
          s.elements = { ...s.elements, ...r.elements }
          if (r.flags?.length) s.flags = r.flags
        }
        p.breakdownStatus = 'ai'
      })
      toast('AI breakdown complete. Review the tags before scheduling.', 'ok')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setProgress(null)
    }
  }

  const summary = useMemo(() => {
    const chars = {}
    const locs = {}
    const els = {}
    for (const s of project.scenes) {
      for (const c of s.characters) chars[c] = (chars[c] || 0) + 1
      if (s.location) locs[s.location] = (locs[s.location] || 0) + 1
      for (const [cat, items] of Object.entries(s.elements || {})) {
        els[cat] = els[cat] || {}
        for (const it of items) els[cat][it] = (els[cat][it] || 0) + 1
      }
    }
    const sortObj = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])
    return { chars: sortObj(chars), locs: sortObj(locs), els: Object.entries(els).map(([cat, o]) => [cat, sortObj(o)]) }
  }, [project.scenes])

  const exportCSV = () => {
    const head = ['Scene', 'INT/EXT', 'Location', 'Time', 'Pages', 'Characters', ...ELEMENT_CATEGORIES, 'Synopsis']
    const rows = project.scenes.map((s) => [
      s.number, s.intExt, s.location, s.timeOfDay, formatPages(s.eighths), s.characters.join('; '),
      ...ELEMENT_CATEGORIES.map((c) => (s.elements?.[c] || []).join('; ')), s.synopsis,
    ])
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    download(`${project.title} - breakdown.csv`, '\uFEFF' + csv, 'text/csv')
  }

  const totalEighths = project.scenes.reduce((a, s) => a + (s.eighths || 0), 0)

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-info">
          {project.scenes.length ? (
            <>
              <strong>{project.scenes.length} scenes</strong>
              <span className="muted">
                {formatPages(totalEighths)} pages · {summary.chars.length} characters · {summary.locs.length} locations ·{' '}
                {project.breakdownStatus === 'ai' ? 'AI tagged' : 'rule-based, not AI tagged yet'}
              </span>
            </>
          ) : (
            <span className="muted">No breakdown yet</span>
          )}
        </div>
        {editable && (
          <div className="toolbar-actions">
            <Button onClick={runRules} disabled={!!progress}>
              {project.scenes.length ? 'Re-run scene detection' : 'Detect scenes'}
            </Button>
            <Button variant="primary" onClick={runAI} disabled={!!progress}>
              {progress ? `AI tagging ${progress.done}/${progress.total}` : 'AI breakdown'}
            </Button>
            {project.scenes.length > 0 && (
              <Button variant="ghost" onClick={exportCSV}>
                Export CSV
              </Button>
            )}
          </div>
        )}
      </div>

      {!state.settings.aiKey && editable && (
        <p className="notice">
          Without an Anthropic API key you get scene detection, characters and keyword hints. The full element breakdown (props, wardrobe, vehicles, extras, effects per scene) is done by the AI pass: add the key in <Link to="/settings">Settings</Link>.
        </p>
      )}
      {project.scenes.length > 0 && project.scenes.every((s) => !s.characters?.length) && editable && (
        <p className="notice">
          No characters were found. Character names are detected when they stand alone in capitals above the dialogue, or as <em>NAME:</em> before the line. If your script uses another layout, open a scene and add the characters by hand, or send the file to have the detection adjusted.
        </p>
      )}

      {project.scenes.length === 0 ? (
        <Empty title="No scenes yet">
          {project.script.text ? 'Detect scenes to build the list from the headings, then run the AI breakdown to tag props, wardrobe, vehicles and everything else per scene.' : 'Import a script first, then come back here.'}
        </Empty>
      ) : (
        <>
          <div className="segmented">
            {['scenes', 'characters', 'elements'].map((v) => (
              <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {view === 'scenes' && (
            <div className="strips">
              {project.scenes.map((s) => (
                <button key={s.id} className={`strip ${stripColor(s)}`} onClick={() => setOpen({ ...s })}>
                  <span className="strip-num">{s.number}{s.revisedIn && s.revisedIn !== 'White' ? <i className="rev-mark" title={`Changed in the ${s.revisedIn} revision`} style={{ background: revisionHex(s.revisedIn) }} /> : null}</span>
                  <span className="strip-ie">
                    {s.intExt}
                    <small>{s.timeOfDay}</small>
                  </span>
                  <span className="strip-main">
                    <span className="strip-loc">{s.location || s.heading}{s.shot ? <span className="strip-done" title="Shot"> ✓</span> : null}</span>
                    <span className="strip-syn">{s.synopsis}</span>
                  </span>
                  <span className="strip-chars">{s.characters.slice(0, 4).join(', ')}{s.characters.length > 4 ? ` +${s.characters.length - 4}` : ''}</span>
                  <span className="strip-pages">{formatPages(s.eighths)}</span>
                  <span className="strip-tags">
                    {Object.values(s.elements || {}).reduce((a, b) => a + b.length, 0) || ''}
                    {s.flags?.length ? <em title={s.flags.join(', ')}>!</em> : null}
                  </span>
                </button>
              ))}
            </div>
          )}

          {view === 'characters' && (
            <div className="cols">
              <section className="panel">
                <h2>Speaking characters</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Character</th>
                      <th>Scenes</th>
                      <th>Cast</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.chars.map(([c, n]) => {
                      const actor = project.contacts.find((x) => x.kind === 'cast' && x.character?.toUpperCase() === c.toUpperCase())
                      return (
                        <tr key={c}>
                          <td>{c}</td>
                          <td>{n}</td>
                          <td className="muted">{actor ? actor.name : 'Not cast'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
              <section className="panel">
                <h2>Locations in script</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Set</th>
                      <th>Scenes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.locs.map(([l, n]) => (
                      <tr key={l}>
                        <td>{l}</td>
                        <td>{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {view === 'elements' &&
            (summary.els.length === 0 ? (
              <Empty title="No elements tagged">Run the AI breakdown or open a scene and add elements by hand.</Empty>
            ) : (
              <div className="element-grid">
                {summary.els.map(([cat, items]) => (
                  <section className="panel" key={cat}>
                    <h2>
                      {cat} <small className="muted">{items.length}</small>
                    </h2>
                    <ul className="plain">
                      {items.map(([it, n]) => (
                        <li key={it}>
                          {it} <small className="muted">×{n}</small>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ))}
        </>
      )}

      <SceneModal key={open?.id || 'none'} scene={open} onClose={() => setOpen(null)} editable={editable} project={project} edit={edit} />
    </div>
  )
}

function SceneModal({ scene, onClose, editable, project, edit }) {
  const [draft, setDraft] = useState(scene)
  const [cat, setCat] = useState('Props')
  const [item, setItem] = useState('')
  const [newChar, setNewChar] = useState('')
  const toast = useToast()

  if (!scene || !draft) return null

  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value })
  const addItem = () => {
    const v = item.trim()
    if (!v) return
    const els = { ...draft.elements, [cat]: [...new Set([...(draft.elements?.[cat] || []), v])] }
    setDraft({ ...draft, elements: els })
    setItem('')
  }
  const removeItem = (c, v) => {
    const els = { ...draft.elements, [c]: draft.elements[c].filter((x) => x !== v) }
    if (!els[c].length) delete els[c]
    setDraft({ ...draft, elements: els })
  }
  const save = () => {
    edit((p) => {
      const i = p.scenes.findIndex((s) => s.id === draft.id)
      if (i >= 0) p.scenes[i] = { ...p.scenes[i], ...draft }
    })
    toast(`Scene ${draft.number} saved`, 'ok')
    onClose()
  }
  const remove = () => {
    edit((p) => {
      p.scenes = p.scenes.filter((s) => s.id !== draft.id)
      p.shootingDays.forEach((d) => (d.sceneIds = d.sceneIds.filter((x) => x !== draft.id)))
    })
    onClose()
  }
  const day = project.shootingDays.find((d) => d.id === draft.dayId)

  return (
    <Modal
      open
      wide
      title={`Scene ${draft.number}`}
      onClose={onClose}
      footer={
        editable ? (
          <>
            <Confirm onConfirm={remove} label="Delete scene" />
            <span className="spacer" />
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Save scene
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="scene-modal">
        <div className="stack">
          <div className="row-3">
            <Field label="Number">
              <Input value={draft.number} onChange={set('number')} disabled={!editable} />
            </Field>
            <Field label="INT / EXT">
              <Select value={draft.intExt} onChange={set('intExt')} options={['INT', 'EXT', 'INT/EXT']} disabled={!editable} />
            </Field>
            <Field label="Time">
              <Select value={draft.timeOfDay} onChange={set('timeOfDay')} options={TIMES.map((t) => [t, t || 'Unset'])} disabled={!editable} />
            </Field>
          </div>
          <Field label="Set / location">
            <Input value={draft.location} onChange={set('location')} disabled={!editable} />
          </Field>
          <div className="row-2">
            <Field label="Pages (eighths)">
              <Input type="number" min={1} value={draft.eighths} onChange={(e) => setDraft({ ...draft, eighths: Number(e.target.value) || 1 })} disabled={!editable} />
            </Field>
            <Field label="Scheduled">
              <Input value={day ? `${day.date} · ${day.unit || 'Main unit'}` : 'Not yet'} disabled />
            </Field>
          </div>
          <Field label="Synopsis">
            <Textarea rows={2} value={draft.synopsis} onChange={set('synopsis')} disabled={!editable} />
          </Field>
          <Field label="Notes for departments">
            <Textarea rows={2} value={draft.notes || ''} onChange={set('notes')} disabled={!editable} />
          </Field>
          {draft.flags?.length > 0 && (
            <div className="chips-static">
              {draft.flags.map((f) => (
                <Badge key={f} color="#D9A441">
                  {f}
                </Badge>
              ))}
            </div>
          )}
          <div className="field">
            <span className="field-label">Characters</span>
            <div className="chips-static">
              {draft.characters.map((c) => (
                <Badge key={c}>
                  {c}
                  {editable && (
                    <button className="chip-x" onClick={() => setDraft({ ...draft, characters: draft.characters.filter((x) => x !== c) })} aria-label={`Remove ${c}`}>
                      ×
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            {editable && (
              <div className="inline-add">
                <Input
                  placeholder="Add character"
                  value={newChar}
                  onChange={(e) => setNewChar(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChar.trim()) {
                      setDraft({ ...draft, characters: [...new Set([...draft.characters, newChar.trim().toUpperCase()])] })
                      setNewChar('')
                    }
                  }}
                />
              </div>
            )}
          </div>
          <div className="field">
            <span className="field-label">Elements</span>
            {Object.keys(draft.elements || {}).length === 0 && <p className="muted small">Nothing tagged yet.</p>}
            {Object.entries(draft.elements || {}).map(([c, items]) => (
              <div key={c} className="el-row">
                <strong>{c}</strong>
                <div className="chips-static">
                  {items.map((v) => (
                    <Badge key={v}>
                      {v}
                      {editable && (
                        <button className="chip-x" onClick={() => removeItem(c, v)} aria-label={`Remove ${v}`}>
                          ×
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            {editable && (
              <div className="inline-add">
                <Select value={cat} onChange={(e) => setCat(e.target.value)} options={ELEMENT_CATEGORIES} />
                <Input placeholder="Item, press Enter" value={item} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} />
                <Button size="sm" onClick={addItem}>
                  Add
                </Button>
              </div>
            )}
          </div>
        </div>
        <pre className="script-view compact">{draft.heading + '\n\n' + (draft.body || '')}</pre>
      </div>
    </Modal>
  )
}
