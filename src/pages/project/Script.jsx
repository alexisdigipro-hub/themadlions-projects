import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { ACCEPTED, extractText } from '../../lib/scriptImport.js'
import { isHeading } from '../../lib/breakdown.js'
import { download, fmtDate } from '../../lib/dates.js'
import { uid } from '../../lib/store.jsx'
import { diffLines, hunks, nextRevisionColor, revisionHex } from '../../lib/diff.js'

/* Saves the current script as a revision before replacing it. Colours follow the
   industry order: White, Blue, Pink, Yellow, Green, Goldenrod, Buff, Salmon, Cherry… */
export function archiveCurrent(p, note = '') {
  if (!p.script?.text) return
  p.scriptVersions = p.scriptVersions || []
  p.scriptVersions.push({
    id: uid(),
    color: p.script.revision || 'White',
    text: p.script.text,
    fileName: p.script.fileName,
    savedAt: p.script.importedAt || new Date().toISOString(),
    note,
  })
}
export function nextColorFor(p) {
  const used = [...(p.scriptVersions || []).map((v) => v.color), p.script?.revision || 'White']
  return p.script?.text ? nextRevisionColor(used) : 'White'
}

export default function Script() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const fileRef = useRef()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(project.script.text)
  const [view, setView] = useState('script') // script | revisions
  const [compare, setCompare] = useState(null) // version id
  const [show, setShow] = useState(null) // version id
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(null) // { text, fileName, format }
  const editable = canEdit('script')
  const versions = project.scriptVersions || []
  const current = project.script.revision || 'White'

  const headings = useMemo(() => project.script.text.split('\n').filter((l) => isHeading(l)).length, [project.script.text])
  const words = useMemo(() => (project.script.text.match(/\S+/g) || []).length, [project.script.text])

  const onFile = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const { text: t, format } = await extractText(file)
      if (project.script.text) setPending({ text: t, fileName: file.name, format })
      else commit({ text: t, fileName: file.name, format }, '')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const commit = (next, revNote) => {
    edit((p) => {
      const isRevision = !!p.script.text && p.script.text !== next.text
      const color = isRevision ? nextColorFor(p) : p.script.revision || 'White'
      if (isRevision) archiveCurrent(p, '')
      p.script = { text: next.text, fileName: next.fileName, format: next.format, importedAt: new Date().toISOString(), revision: color, note: revNote }
    })
    setText(next.text)
    setEditing(false)
    setPending(null)
    setNote('')
    toast(project.script.text && project.script.text !== next.text ? `Saved as the ${nextColorFor(project)} revision` : `Imported ${next.fileName}`, 'ok')
  }

  const saveText = () => commit({ text, fileName: project.script.fileName || 'pasted.txt', format: project.script.format || 'txt' }, '')

  const restore = (v) => {
    edit((p) => {
      archiveCurrent(p, 'Replaced by restore')
      p.script = { ...p.script, text: v.text, fileName: v.fileName, importedAt: new Date().toISOString(), revision: nextColorFor(p), note: `Restored ${v.color} revision` }
    })
    setText(v.text)
    toast(`Restored the ${v.color} revision as the current script`, 'ok')
  }
  const removeVersion = (id) => edit((p) => (p.scriptVersions = (p.scriptVersions || []).filter((v) => v.id !== id)))

  const transcriptText = () => {
    const t = project.music?.transcript
    if (!t) return ''
    if (t.segments?.length) return t.segments.map((sg) => `[${Math.floor(sg.start / 60)}:${String(Math.floor(sg.start % 60)).padStart(2, '0')}] ${sg.text}`).join('\n')
    return t.text || ''
  }
  const cmpVersion = versions.find((v) => v.id === compare)
  const diff = useMemo(() => (cmpVersion ? diffLines(cmpVersion.text, project.script.text) : null), [cmpVersion, project.script.text])
  const shown = versions.find((v) => v.id === show)

  return (
    <div className="script-page">
      <div className="toolbar">
        <div className="toolbar-info">
          {project.script.fileName ? (
            <>
              <strong>
                <span className="rev-dot" style={{ background: revisionHex(current) }} /> {current} revision
                <span className="muted"> · {project.script.fileName}</span>
              </strong>
              <span className="muted">
                {words} words · {headings} scene headings · {project.script.importedAt ? fmtDate(project.script.importedAt.slice(0, 10)) : ''}
                {project.script.note ? ` · ${project.script.note}` : ''}
              </span>
            </>
          ) : (
            <span className="muted">No script yet</span>
          )}
        </div>
        <div className="toolbar-actions">
          {(versions.length > 0 || project.script.text) && (
            <div className="segmented small">
              <button className={view === 'script' ? 'on' : ''} onClick={() => setView('script')}>Script</button>
              <button className={view === 'revisions' ? 'on' : ''} onClick={() => setView('revisions')}>Revisions {versions.length ? `(${versions.length})` : ''}</button>
            </div>
          )}
          {editable && (
            <>
              <input ref={fileRef} type="file" accept={ACCEPTED} hidden onChange={(e) => onFile(e.target.files?.[0])} />
              <Button onClick={() => fileRef.current?.click()} disabled={busy}>
                {busy ? 'Reading…' : project.script.text ? 'Upload new revision' : 'Upload file'}
              </Button>
              {project.script.text && !editing && view === 'script' && <Button variant="ghost" onClick={() => setEditing(true)}>Edit text</Button>}
              {!project.script.text && !editing && <Button variant="ghost" onClick={() => setEditing(true)}>Paste text</Button>}
            </>
          )}
          {project.script.text && (
            <Button variant="ghost" onClick={() => download(`${project.title} - ${current}.txt`, project.script.text)}>Download .txt</Button>
          )}
          {project.script.text && (
            <Link className="btn btn-primary btn-md" to="../breakdown">Go to breakdown</Link>
          )}
        </div>
      </div>

      {project.category === 'Music Video' && project.music?.transcript?.text && view === 'script' && (
        <section className="panel transcript">
          <div className="panel-head">
            <h2>Transcript from the audio <span className="muted small">Whisper · {project.music.transcript.language || 'auto'} · {fmtDate((project.music.transcript.at || '').slice(0, 10))}</span></h2>
            <div className="row-actions">
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(transcriptText()).then(() => toast('Copied', 'ok'))}>Copy</Button>
              {editable && <Button size="sm" onClick={() => { setText(transcriptText()); setEditing(true); setView('script') }}>Use as script text</Button>}
            </div>
          </div>
          <pre className="script transcript-text">{transcriptText()}</pre>
        </section>
      )}

      {view === 'revisions' ? (
        <div className="revisions">
          {!versions.length ? (
            <Empty title="No earlier revisions">Every time you upload a new file or save edited text over an existing script, the previous version is kept here with its revision colour.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Revision</th><th>File</th><th>Saved</th><th>Words</th><th>Note</th><th /></tr>
              </thead>
              <tbody>
                <tr className="rev-current">
                  <td><span className="rev-dot" style={{ background: revisionHex(current) }} /> {current} <span className="muted small">(current)</span></td>
                  <td>{project.script.fileName}</td>
                  <td>{project.script.importedAt ? fmtDate(project.script.importedAt.slice(0, 10)) : ''}</td>
                  <td>{words}</td>
                  <td className="muted small">{project.script.note}</td>
                  <td />
                </tr>
                {[...versions].reverse().map((v) => (
                  <tr key={v.id}>
                    <td><span className="rev-dot" style={{ background: revisionHex(v.color) }} /> {v.color}</td>
                    <td>{v.fileName}</td>
                    <td>{fmtDate((v.savedAt || '').slice(0, 10))}</td>
                    <td>{(v.text.match(/\S+/g) || []).length}</td>
                    <td className="muted small">{v.note}</td>
                    <td className="row-actions">
                      <button onClick={() => setShow(v.id)}>View</button>
                      <button onClick={() => setCompare(v.id)}>Compare with current</button>
                      {editable && <button onClick={() => restore(v)}>Restore</button>}
                      {editable && <Confirm onConfirm={() => removeVersion(v.id)} label="Delete">×</Confirm>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : editing ? (
        <div className="stack">
          <Field label="Screenplay text" hint="Scene headings like INT. KITCHEN - DAY or ΕΣΩΤ. ΚΟΥΖΙΝΑ - ΜΕΡΑ, character names in capitals above dialogue.">
            <Textarea className="input textarea script-editor" value={text} onChange={(e) => setText(e.target.value)} rows={28} />
          </Field>
          <div className="row-actions">
            <Button variant="ghost" onClick={() => { setText(project.script.text); setEditing(false) }}>Cancel</Button>
            <Button variant="primary" onClick={saveText}>{project.script.text && text !== project.script.text ? `Save as ${nextColorFor(project)} revision` : 'Save script'}</Button>
          </div>
        </div>
      ) : project.script.text ? (
        <pre className="script-view">
          {project.script.text.split('\n').map((l, i) => (
            <span key={i} className={isHeading(l) ? 'sh' : ''}>
              {l || ' '}
              {'\n'}
            </span>
          ))}
        </pre>
      ) : (
        <Empty title="Bring in the script">
          Upload a PDF, Word (.docx), Final Draft (.fdx), Fountain or plain text file, or paste the text. Pages files should be exported to PDF first.
        </Empty>
      )}

      {/* new revision confirmation */}
      <Modal
        open={!!pending}
        title={`Save as the ${nextColorFor(project)} revision`}
        onClose={() => setPending(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => commit(pending, note)}>Save revision</Button>
          </>
        }
      >
        {pending && (
          <div className="stack">
            <p className="small">The current <strong>{current}</strong> script is kept in Revisions. Scenes keep their breakdown, shots and schedule when you re-run scene detection: matching is by scene heading, and changed scenes get flagged.</p>
            <Field label="What changed (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rooftop scene rewritten, sc. 12 cut" autoFocus /></Field>
          </div>
        )}
      </Modal>

      {/* view a revision */}
      <Modal open={!!shown} wide title={shown ? `${shown.color} revision · ${shown.fileName}` : ''} onClose={() => setShow(null)}>
        {shown && <pre className="script-view in-modal">{shown.text}</pre>}
      </Modal>

      {/* compare */}
      <Modal open={!!cmpVersion} wide title={cmpVersion ? `${cmpVersion.color} → ${current}` : ''} onClose={() => setCompare(null)}>
        {diff && (
          <>
            <p className="small muted">
              <span className="diff-add">{diff.added} lines added</span> · <span className="diff-del">{diff.removed} lines removed</span>
              {!diff.added && !diff.removed && ' · identical'}
            </p>
            <pre className="script-view in-modal diff">
              {hunks(diff.lines).map((x, i) =>
                x.t === '…' ? (
                  <span key={i} className="diff-skip">… {x.n} unchanged lines …{'\n'}</span>
                ) : (
                  <span key={i} className={x.t === '+' ? 'diff-add' : x.t === '-' ? 'diff-del' : ''}>
                    {x.t === '+' ? '+ ' : x.t === '-' ? '− ' : '  '}{x.l || ' '}{'\n'}
                  </span>
                ),
              )}
            </pre>
          </>
        )}
      </Modal>
    </div>
  )
}
