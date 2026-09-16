import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, Field, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { ACCEPTED, extractText } from '../../lib/scriptImport.js'
import { isHeading } from '../../lib/breakdown.js'
import { download } from '../../lib/dates.js'

export default function Script() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const fileRef = useRef()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(project.script.text)
  const editable = canEdit('script')

  const headings = useMemo(() => project.script.text.split('\n').filter((l) => isHeading(l)).length, [project.script.text])
  const words = useMemo(() => (project.script.text.match(/\S+/g) || []).length, [project.script.text])

  const onFile = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const { text: t, format } = await extractText(file)
      edit((p) => {
        p.script = { text: t, fileName: file.name, format, importedAt: new Date().toISOString() }
      })
      setText(t)
      setEditing(false)
      toast(`Imported ${file.name}`, 'ok')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const saveText = () => {
    edit((p) => {
      p.script = { ...p.script, text, fileName: p.script.fileName || 'pasted.txt', format: p.script.format || 'txt', importedAt: new Date().toISOString() }
    })
    setEditing(false)
    toast('Script saved', 'ok')
  }

  return (
    <div className="script-page">
      <div className="toolbar">
        <div className="toolbar-info">
          {project.script.fileName ? (
            <>
              <strong>{project.script.fileName}</strong>
              <span className="muted">
                {words} words · {headings} scene headings found
              </span>
            </>
          ) : (
            <span className="muted">No script yet</span>
          )}
        </div>
        {editable && (
          <div className="toolbar-actions">
            <input ref={fileRef} type="file" accept={ACCEPTED} hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <Button onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? 'Reading…' : 'Upload file'}
            </Button>
            {project.script.text && !editing && <Button variant="ghost" onClick={() => setEditing(true)}>Edit text</Button>}
            {!project.script.text && !editing && <Button variant="ghost" onClick={() => setEditing(true)}>Paste text</Button>}
            {project.script.text && (
              <Button variant="ghost" onClick={() => download(`${project.title}.txt`, project.script.text)}>
                Download .txt
              </Button>
            )}
            {project.script.text && (
              <Link className="btn btn-primary btn-md" to="../breakdown">
                Go to breakdown
              </Link>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="stack">
          <Field label="Screenplay text" hint="Scene headings like INT. KITCHEN - DAY or ΕΣΩΤ. ΚΟΥΖΙΝΑ - ΜΕΡΑ, character names in capitals above dialogue.">
            <Textarea className="input textarea script-editor" value={text} onChange={(e) => setText(e.target.value)} rows={28} />
          </Field>
          <div className="row-actions">
            <Button variant="ghost" onClick={() => { setText(project.script.text); setEditing(false) }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveText}>
              Save script
            </Button>
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
    </div>
  )
}
