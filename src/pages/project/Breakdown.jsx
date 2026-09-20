import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { ELEMENT_CATEGORIES, useStore } from '../../lib/store.jsx'
import { formatPages, keywordHints, parseScript, stripColor } from '../../lib/breakdown.js'
import { aiBreakdown, aiDocumentBreakdown } from '../../lib/ai.js'
import { uid } from '../../lib/store.jsx'
import { songMapText } from '../../lib/audio.js'
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
  const [groupBy, setGroupBy] = useState('set')
  const [doc, setDoc] = useState(null) // { files, notes, useText, wantShots, mode, paste }
  const [docBusy, setDocBusy] = useState('')
  const [paste, setPaste] = useState('') // text pasted straight into the page
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteOpts, setPasteOpts] = useState({ wantShots: true, mode: 'append' })
  const editable = canEdit('breakdown')
  const concept = project.concept

  const runDocument = async (d = doc) => {
    if (!state.settings.aiKey) return toast('Add your Anthropic API key in Settings first.', 'error')
    const files = d.files || []
    const pasted = (d.paste || '').trim()
    if (!files.length && !pasted && !(d.useText && project.script.text)) return toast('Paste some text, or add a PDF or images first.', 'error')
    setDocBusy('Preparing…')
    try {
      const res = await aiDocumentBreakdown({
        settings: state.settings,
        category: project.category,
        text: [pasted, d.useText ? project.script.text : '', (project.music?.sections || []).length ? `SONG MAP (music video):\n${songMapText(project.music, project.scenes)}` : ''].filter(Boolean).join('\n\n'),
        files,
        notes: d.notes,
        wantShots: d.wantShots,
        onProgress: setDocBusy,
      })
      if (!res.setups.length) throw new Error('The AI returned no setups. Try adding a short description in the notes field.')
      edit((p) => {
        const scenes = res.setups.map((st, i) => ({
          id: uid(), number: st.number || String(i + 1), heading: st.heading, intExt: st.intExt, location: st.location, timeOfDay: st.timeOfDay,
          synopsis: st.synopsis, body: st.body, look: st.look, durationHint: st.durationHint, songSection: st.songSection || '', eighths: 4, characters: st.characters,
          elements: st.elements, elementsSource: 'ai', flags: st.flags, notes: '', dayId: '', order: i, source: 'document',
        }))
        if (d.mode === 'replace') {
          p.scenes = scenes
          p.shootingDays.forEach((d) => (d.sceneIds = []))
          p.shots = []
        } else {
          const start = p.scenes.length
          scenes.forEach((sc, i) => { sc.number = String(start + i + 1); sc.order = start + i })
          p.scenes = [...p.scenes, ...scenes]
        }
        if (d.wantShots) {
          p.shots = p.shots || []
          res.setups.forEach((st, i) => {
            const scene = scenes[i]
            st.shots.forEach((sh, k) => p.shots.push({ id: uid(), sceneId: scene.id, number: `${scene.number}${String.fromCharCode(65 + (k % 26))}`, size: sh.size, angle: 'Eye level', movement: sh.movement, lens: '', camera: 'A', fps: '25', gear: /drone/i.test(sh.movement) ? 'Drone' : /handheld/i.test(sh.movement) ? 'Handheld' : /steadicam/i.test(sh.movement) ? 'Steadicam' : 'Tripod', description: sh.description, subject: '', audio: '', duration: '', status: 'planned', notes: '', frame: '', frameUrl: '' }))
          })
        }
        // link setups to song sections named in song_section
        if (p.music?.sections?.length) {
          scenes.forEach((sc) => {
            if (!sc.songSection) return
            p.music.sections.forEach((sec) => {
              if (sc.songSection.toLowerCase().includes(sec.name.toLowerCase())) sec.sceneIds = [...new Set([...(sec.sceneIds || []), sc.id])]
            })
          })
        }
        p.concept = { title: res.title, summary: res.summary, locations: res.locations, talent: res.talent, notes: res.notes, source: files.map((f) => f.name).join(', ') || (pasted ? 'pasted text' : 'script text'), at: new Date().toISOString() }
        p.breakdownStatus = 'ai'
        if (!p.script.text && d.useText === false) p.script = { ...p.script, docType: 'document' }
      })
      setDoc(null)
      if (pasted && !files.length) { setPaste(''); setPasteOpen(false) }
      toast(`${res.setups.length} setups created from the ${pasted && !files.length ? 'text' : 'document'}${d.wantShots ? ', with a draft shot list' : ''}`, 'ok')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setDocBusy('')
    }
  }
  const addConceptLocations = () => {
    if (!concept?.locations?.length) return
    edit((p) => {
      concept.locations.forEach((l) => {
        if (!p.locations.some((x) => x.name.toLowerCase() === l.name.toLowerCase())) p.locations.push({ id: uid(), name: l.name, address: '', type: 'Other', notes: l.notes, contact: '', phone: '', sceneLocations: [] })
      })
    })
    toast('Locations added to the Locations tab', 'ok')
  }

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

  /* The production sheet: scenes down the page, characters across it. Grouping is the whole point.
     On a board you want everything that happens in one set together, not the order the script tells
     it in, which is why this was being redone by hand in a spreadsheet. */
  const sheet = useMemo(() => {
    const chars = summary.chars.map(([name]) => name)
    const days = [...(project.shootingDays || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    const dayLabel = new Map(days.map((d, i) => [d.id, `Day ${i + 1}${d.date ? ` · ${d.date}` : ''}`]))
    const keyOf = (sc) => {
      if (groupBy === 'set') return sc.location || 'No set'
      if (groupBy === 'day') return dayLabel.get(sc.dayId) || 'Not scheduled yet'
      if (groupBy === 'dn') return sc.timeOfDay || 'No time of day'
      return ''
    }
    const order = new Map()
    const map = new Map()
    for (const sc of project.scenes) {
      const k = keyOf(sc)
      if (!map.has(k)) { map.set(k, []); order.set(k, order.size) }
      map.get(k).push(sc)
    }
    let groups = [...map.entries()].map(([label, rows]) => ({
      label,
      rows,
      eighths: rows.reduce((a, x) => a + (x.eighths || 0), 0),
    }))
    // Whatever has no group of its own belongs at the bottom, not wherever the script first hit it.
    if (groupBy !== 'none') {
      const loose = (g) => /^(No set|Not scheduled yet|No time of day)$/.test(g.label)
      groups = [...groups.filter((g) => !loose(g)), ...groups.filter(loose)]
    }
    if (groupBy === 'day') {
      const rank = new Map([...dayLabel.values()].map((l, i) => [l, i]))
      groups.sort((a, b) => (rank.get(a.label) ?? 9999) - (rank.get(b.label) ?? 9999))
    }
    const per = chars.map((c) => project.scenes.filter((sc) => (sc.characters || []).includes(c)).length)
    return { chars, groups, per, dayLabel }
  }, [project.scenes, project.shootingDays, summary.chars, groupBy])

  const sheetCsv = () => {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const head = ['Group', 'Scene', 'INT/EXT', 'Set', 'D/N', 'Pages', 'Day', ...sheet.chars]
    const lines = [head.map(q).join(',')]
    for (const g of sheet.groups) {
      for (const sc of g.rows) {
        lines.push([
          g.label, sc.number, sc.intExt || '', sc.location || '', sc.timeOfDay || '',
          formatPages(sc.eighths), sheet.dayLabel.get(sc.dayId) || '',
          ...sheet.chars.map((c) => ((sc.characters || []).includes(c) ? 'X' : '')),
        ].map(q).join(','))
      }
    }
    lines.push(['Scenes each', '', '', '', '', '', '', ...sheet.per].map(q).join(','))
    // BOM first, or Excel opens Greek names as gibberish.
    download(`${project.title || 'production'}-sheet.csv`, '\ufeff' + lines.join('\r\n'), 'text/csv')
  }


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
            <Button onClick={() => setPasteOpen((v) => !v)} disabled={!!docBusy}>
              {pasteOpen ? 'Hide paste box' : 'Paste text'}
            </Button>
            <Button onClick={() => setDoc({ files: [], notes: '', paste: '', useText: !!project.script.text && parseScript(project.script.text).scenes.length < 2, wantShots: project.category !== 'Visuals', mode: project.scenes.length ? 'append' : 'replace' })}>
              From treatment / moodboard
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

      {pasteOpen && editable && (
        <section className="panel paste-panel">
          <div className="panel-head">
            <h2>Paste text</h2>
            <span className="muted small">Treatment, concept, scene list, notes. The AI turns it into setups with their materials.</span>
          </div>
          <Textarea
            rows={8}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={'Paste here.\n\nWorks with a director\'s treatment, a concept in plain words, a scene list, or notes: "Day 1, rooftop at sunset, the artist alone, black coat, wind machine…"'}
          />
          <div className="paste-actions">
            <label className="check">
              <input type="checkbox" checked={pasteOpts.wantShots} onChange={(e) => setPasteOpts({ ...pasteOpts, wantShots: e.target.checked })} />
              Also draft a first shot list
            </label>
            {project.scenes.length > 0 && (
              <Select
                value={pasteOpts.mode}
                onChange={(e) => setPasteOpts({ ...pasteOpts, mode: e.target.value })}
                options={[['append', 'Add after the existing scenes'], ['replace', 'Replace the existing scenes']]}
              />
            )}
            <span className="spacer" />
            <span className="muted small">{(paste.match(/\S+/g) || []).length} words</span>
            <Button variant="primary" disabled={!!docBusy || !paste.trim()} onClick={() => runDocument({ files: [], notes: '', paste, useText: false, wantShots: pasteOpts.wantShots, mode: project.scenes.length ? pasteOpts.mode : 'replace' })}>
              {docBusy || 'AI breakdown'}
            </Button>
          </div>
        </section>
      )}

      {concept && (
        <section className="panel concept">
          <div className="panel-head">
            <h2>{concept.title || 'Concept'} <span className="muted small">from {concept.source}</span></h2>
            {editable && <Confirm label="Remove notes" onConfirm={() => edit((p) => delete p.concept)} />}
          </div>
          {concept.summary && <p>{concept.summary}</p>}
          <div className="concept-grid">
            {concept.talent?.length > 0 && (
              <div>
                <h3>Talent</h3>
                <ul className="plain">{concept.talent.map((t, i) => <li key={i}><strong>{t.role}</strong>{t.count > 1 ? ` ×${t.count}` : ''}{t.notes ? <span className="muted"> · {t.notes}</span> : null}</li>)}</ul>
              </div>
            )}
            {concept.locations?.length > 0 && (
              <div>
                <h3>Locations {editable && <button className="link small" onClick={addConceptLocations}>Add to Locations</button>}</h3>
                <ul className="plain">{concept.locations.map((l, i) => <li key={i}><strong>{l.name}</strong>{l.notes ? <span className="muted"> · {l.notes}</span> : null}</li>)}</ul>
              </div>
            )}
            {concept.notes?.length > 0 && (
              <div>
                <h3>Producer notes</h3>
                <ul className="plain">{concept.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </div>
            )}
          </div>
        </section>
      )}

      {project.scenes.length === 0 ? (
        <Empty
          title="No scenes yet"
          action={editable && !pasteOpen && <Button variant="primary" onClick={() => setPasteOpen(true)}>Paste text</Button>}
        >
          {project.script.text
            ? 'Detect scenes to build the list from the headings, then run the AI breakdown to tag props, wardrobe, vehicles and everything else per scene.'
            : 'Import a screenplay in Script, paste the text straight in here, or use "From treatment / moodboard" for a concept, treatment or moodboard (PDF, images).'}
        </Empty>
      ) : (
        <>
          <div className="segmented">
            {['scenes', 'characters', 'elements', 'sheet'].map((v) => (
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
                    <span className="strip-loc">{s.location || s.heading}{s.shot ? <span className="strip-done" title="Shot"> ✓</span> : null}{(project.music?.sections || []).filter((sec) => (sec.sceneIds || []).includes(s.id)).map((sec) => <span key={sec.id} className="song-badge" title="Song section">♪ {sec.name}</span>)}</span>
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

          {view === 'sheet' && (
            sheet.chars.length === 0 ? (
              <Empty title="No characters yet">Detect scenes first, or run the AI breakdown. The sheet is built from who appears in each scene.</Empty>
            ) : (
              <section className="panel prod-panel">
                <div className="panel-head">
                  <h2>Production sheet <span className="muted small">{project.scenes.length} scenes · {sheet.chars.length} characters</span></h2>
                  <div className="row-actions">
                    <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} options={[['set', 'Group by set'], ['day', 'Group by shooting day'], ['dn', 'Group by day / night'], ['none', 'Script order']]} />
                    <Button variant="ghost" onClick={sheetCsv}>Download .csv</Button>
                  </div>
                </div>
                <div className="prod-scroll">
                  <table className="prod-sheet">
                    <thead>
                      <tr>
                        <th className="prod-sc">Sc.</th>
                        <th className="prod-set">Set</th>
                        <th>D/N</th>
                        <th>Pages</th>
                        {sheet.chars.map((c) => <th key={c} className="prod-char"><span>{c}</span></th>)}
                      </tr>
                    </thead>
                    {sheet.groups.map((g) => (
                      <tbody key={g.label || 'all'}>
                        {groupBy !== 'none' && (
                          <tr className="prod-group">
                            <th colSpan={4 + sheet.chars.length}>
                              {/* sticky inside the row, so the group name stays readable when the
                                  table is scrolled right to reach the far characters */}
                              <span className="prod-glabel">
                                {g.label} <span className="muted">· {g.rows.length} {g.rows.length === 1 ? 'scene' : 'scenes'} · {formatPages(g.eighths)}</span>
                              </span>
                            </th>
                          </tr>
                        )}
                        {g.rows.map((sc) => (
                          <tr key={sc.id}>
                            <td className="prod-sc">{sc.number}</td>
                            <td className="prod-set">{[sc.intExt, sc.location || sc.heading].filter(Boolean).join(' ')}</td>
                            <td>{sc.timeOfDay}</td>
                            <td>{formatPages(sc.eighths)}</td>
                            {sheet.chars.map((c) => (
                              <td key={c} className={(sc.characters || []).includes(c) ? 'on' : ''}>
                                {(sc.characters || []).includes(c) ? '\u25cf' : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    ))}
                    <tfoot>
                      <tr>
                        <th className="prod-sc" colSpan={4}>Scenes each</th>
                        {sheet.per.map((n, i) => <th key={sheet.chars[i]}>{n}</th>)}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )
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
      <Modal open={!!doc} title="Breakdown from a treatment, concept or moodboard" onClose={() => !docBusy && setDoc(null)}
        footer={<><Button variant="ghost" onClick={() => setDoc(null)} disabled={!!docBusy}>Cancel</Button><Button variant="primary" onClick={() => runDocument(doc)} disabled={!!docBusy}>{docBusy || 'Run AI breakdown'}</Button></>}>
        {doc && (
          <div className="stack">
            <p className="small muted">Works with a director's treatment, a concept in plain words, a PDF moodboard with images, or a set of reference photos. The AI groups everything into shootable setups with location, time of day, talent, wardrobe, props, art, effects and equipment.</p>
            <Field label="Files" hint="PDF (with text and images), JPG / PNG, DOCX, TXT. Several at once is fine.">
              <input type="file" multiple accept=".pdf,.docx,.txt,.md,image/*" className="input" onChange={(e) => setDoc({ ...doc, files: Array.from(e.target.files || []) })} />
            </Field>
            {doc.files?.length > 0 && <div className="small muted">{doc.files.map((f) => f.name).join(', ')}</div>}
            <Field label="Or paste the text here" hint="A treatment, a concept, a scene list, notes from a meeting. Files and pasted text can be used together.">
              <Textarea rows={5} value={doc.paste || ''} onChange={(e) => setDoc({ ...doc, paste: e.target.value })} placeholder="Paste the treatment or the concept…" />
            </Field>
            {project.script.text && (
              <label className="check">
                <input type="checkbox" checked={doc.useText} onChange={(e) => setDoc({ ...doc, useText: e.target.checked })} />
                Also use the text in the Script tab ({(project.script.text.match(/\S+/g) || []).length} words)
              </label>
            )}
            <Field label="Notes for the AI (optional)"><Textarea rows={2} value={doc.notes} onChange={(e) => setDoc({ ...doc, notes: e.target.value })} placeholder="e.g. one shooting day, artist plus 4 dancers, budget is tight, no drone" /></Field>
            <label className="check">
              <input type="checkbox" checked={doc.wantShots} onChange={(e) => setDoc({ ...doc, wantShots: e.target.checked })} />
              Also draft a first shot list per setup
            </label>
            {project.scenes.length > 0 && (
              <Field label="Existing scenes">
                <Select value={doc.mode} onChange={(e) => setDoc({ ...doc, mode: e.target.value })} options={[['append', 'Keep them and add the new setups after'], ['replace', 'Replace them (schedule and shots are reset)']]} />
              </Field>
            )}
            <p className="fineprint">Cost: roughly 0.05 to 0.30 € per document with Claude Sonnet, more for long moodboards with many pages.</p>
          </div>
        )}
      </Modal>
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
          {(draft.flags?.length > 0 || editable) && (
            <div className="field">
              <span className="field-label">Flags</span>
              <div className="chips-static">
                {(draft.flags || []).map((f) => (
                  <Badge key={f} color="#D9A441">
                    {f}{editable && <button className="chip-x" onClick={() => setDraft({ ...draft, flags: draft.flags.filter((x) => x !== f) })} aria-label="Remove">×</button>}
                  </Badge>
                ))}
                {editable && <Input className="input sm" placeholder="Add flag, Enter" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { setDraft({ ...draft, flags: [...new Set([...(draft.flags || []), e.target.value.trim()])] }); e.target.value = '' } }} />}
              </div>
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
        {editable && draft.source === 'document' ? (
          <div className="stack scene-text">
            <Field label="Heading"><Input value={draft.heading || ''} onChange={set('heading')} /></Field>
            <Field label="What we see and what must happen"><Textarea rows={6} value={draft.body || ''} onChange={set('body')} /></Field>
            <Field label="Look (light, colour, camera, mood)"><Textarea rows={3} value={draft.look || ''} onChange={set('look')} /></Field>
            <div className="row-2">
              <Field label="Shooting time estimate"><Input value={draft.durationHint || ''} onChange={set('durationHint')} placeholder="3 hours, half day…" /></Field>
              <Field label="Song section"><Input value={draft.songSection || ''} onChange={set('songSection')} placeholder="Chorus 1, Bridge…" /></Field>
            </div>
          </div>
        ) : (
          <pre className="script-view compact">{draft.heading + '\n\n' + (draft.body || '') + (draft.look ? '\n\nLOOK: ' + draft.look : '')}</pre>
        )}
      </div>
    </Modal>
  )
}
