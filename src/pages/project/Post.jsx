import { useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { today, uid } from '../../lib/store.jsx'
import { fmtDate } from '../../lib/dates.js'

const CUT_STATUS = [['internal', 'Internal'], ['review', 'Client review'], ['notes', 'Notes received'], ['approved', 'Approved'], ['locked', 'Picture lock']]
const DELIV_STATUS = [['todo', 'To do'], ['progress', 'In progress'], ['review', 'Client review'], ['approved', 'Approved'], ['delivered', 'Delivered']]
const DELIV_PRESETS = {
  'Feature Film': ['DCP 2K 24fps', 'ProRes 4444 master', 'H.264 screener', 'Stereo & 5.1 mixes', 'Subtitles EN (SRT)', 'Trailer', 'Key art & stills'],
  'Music Video': ['Master 4K 25fps ProRes', 'YouTube H.264 4K', 'Instagram 9:16 60s', 'TikTok 9:16', 'Clean version', 'Thumbnail'],
  Advertise: ['TV master 25fps (Rec.709)', 'YouTube 16:9 H.264', 'Instagram 1:1', 'Stories 9:16', '15s cutdown', '6s bumper', 'Clean feed without supers'],
  Editing: ['Master ProRes', 'H.264 review', 'Social cutdowns', 'Clean version'],
  Events: ['Aftermovie 16:9', 'Social recap 9:16', 'Photo selection', 'Speaker clips', 'Live recording master'],
}
const emptyCut = () => ({ id: uid(), name: '', date: today(), link: '', status: 'internal', notes: '' })
const emptyDeliv = () => ({ id: uid(), name: '', format: '', due: '', owner: '', status: 'todo', link: '', notes: '' })

export default function Post() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const editable = canEdit('post')
  const post = project.post || { cuts: [], deliverables: [] }
  const [cut, setCut] = useState(null)
  const [del, setDel] = useState(null)
  const t0 = today()

  const saveCut = () => {
    if (!cut.name.trim()) return toast('Name the cut.', 'error')
    edit((p) => {
      p.post = p.post || { cuts: [], deliverables: [] }
      const i = p.post.cuts.findIndex((c) => c.id === cut.id)
      if (i >= 0) p.post.cuts[i] = cut
      else p.post.cuts.push(cut)
    })
    setCut(null)
    toast('Cut saved', 'ok')
  }
  const saveDel = () => {
    if (!del.name.trim()) return toast('Name the deliverable.', 'error')
    edit((p) => {
      p.post = p.post || { cuts: [], deliverables: [] }
      const i = p.post.deliverables.findIndex((d) => d.id === del.id)
      if (i >= 0) p.post.deliverables[i] = del
      else p.post.deliverables.push(del)
    })
    setDel(null)
    toast('Deliverable saved', 'ok')
  }
  const addPresets = () => {
    const names = DELIV_PRESETS[project.category] || DELIV_PRESETS.Editing
    edit((p) => {
      p.post = p.post || { cuts: [], deliverables: [] }
      names.forEach((n) => {
        if (!p.post.deliverables.some((d) => d.name === n)) p.post.deliverables.push({ ...emptyDeliv(), name: n })
      })
    })
    toast(`Added the standard ${project.category} deliverables`, 'ok')
  }
  const setDelStatus = (id, status) => edit((p) => {
    const d = p.post.deliverables.find((x) => x.id === id)
    if (d) d.status = status
  })
  const setCutStatus = (id, status) => edit((p) => {
    const c = p.post.cuts.find((x) => x.id === id)
    if (c) c.status = status
  })

  const delivered = post.deliverables.filter((d) => d.status === 'delivered').length
  const cuts = [...post.cuts].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="post">
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>{delivered}/{post.deliverables.length} delivered</strong>
          <span className="muted">{post.cuts.length} cuts · latest {cuts[0] ? `${cuts[0].name} (${CUT_STATUS.find(([v]) => v === cuts[0].status)?.[1]})` : 'none yet'}</span>
        </div>
        {editable && (
          <div className="toolbar-actions">
            <Button variant="ghost" onClick={addPresets}>Add standard deliverables</Button>
            <Button variant="ghost" onClick={() => setDel(emptyDeliv())}>Add deliverable</Button>
            <Button variant="primary" onClick={() => setCut(emptyCut())}>Log a cut</Button>
          </div>
        )}
      </div>

      <div className="cols">
        <section className="panel">
          <div className="panel-head"><h2>Cuts & approvals</h2></div>
          {!cuts.length ? (
            <p className="muted small">Rough cut, fine cut, picture lock. Each with its review link and where the approval stands.</p>
          ) : (
            <ul className="cut-list">
              {cuts.map((c) => (
                <li key={c.id} className={`cut ${c.status}`}>
                  <div className="cut-main">
                    <strong>{c.name}</strong> <span className="muted small">{fmtDate(c.date)}</span>
                    {c.link && <a className="link small" href={c.link} target="_blank" rel="noreferrer"> Open</a>}
                    {c.notes && <div className="muted small">{c.notes}</div>}
                  </div>
                  {editable ? (
                    <select className="input select tiny" value={c.status} onChange={(e) => setCutStatus(c.id, e.target.value)}>
                      {CUT_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : <span className="small">{CUT_STATUS.find(([v]) => v === c.status)?.[1]}</span>}
                  {editable && (
                    <div className="row-actions">
                      <button onClick={() => setCut({ ...c })}>Edit</button>
                      <Confirm onConfirm={() => edit((p) => (p.post.cuts = p.post.cuts.filter((x) => x.id !== c.id)))} label="Delete">×</Confirm>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Deliverables</h2></div>
          {!post.deliverables.length ? (
            <p className="muted small">Masters, cutdowns, social formats, subtitles, stills. Start from the standard list for a {project.category.toLowerCase()} and adjust.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Deliverable</th><th>Spec</th><th>Due</th><th>Owner</th><th>Status</th>{editable && <th />}</tr></thead>
              <tbody>
                {post.deliverables.map((d) => {
                  const late = d.due && d.due < t0 && d.status !== 'delivered'
                  return (
                    <tr key={d.id} className={d.status === 'delivered' ? 'dim' : ''}>
                      <td><strong>{d.name}</strong>{d.link && <a className="link small" href={d.link} target="_blank" rel="noreferrer"> Open</a>}{d.notes && <div className="muted small">{d.notes}</div>}</td>
                      <td className="small">{d.format}</td>
                      <td className={late ? 'late' : ''}>{d.due ? fmtDate(d.due) : ''}</td>
                      <td>{d.owner}</td>
                      <td>
                        {editable ? (
                          <select className="input select tiny" value={d.status} onChange={(e) => setDelStatus(d.id, e.target.value)}>
                            {DELIV_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        ) : DELIV_STATUS.find(([v]) => v === d.status)?.[1]}
                      </td>
                      {editable && (
                        <td className="row-actions">
                          <button onClick={() => setDel({ ...d })}>Edit</button>
                          <Confirm onConfirm={() => edit((p) => (p.post.deliverables = p.post.deliverables.filter((x) => x.id !== d.id)))} label="Delete">×</Confirm>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {cut && (
        <Modal open title={post.cuts.some((c) => c.id === cut.id) ? 'Edit cut' : 'Log a cut'} onClose={() => setCut(null)}
          footer={<><Button variant="ghost" onClick={() => setCut(null)}>Cancel</Button><Button variant="primary" onClick={saveCut}>Save cut</Button></>}>
          <div className="row-2">
            <Field label="Name"><Input autoFocus value={cut.name} onChange={(e) => setCut({ ...cut, name: e.target.value })} placeholder="Rough cut v2" /></Field>
            <Field label="Date"><Input type="date" value={cut.date} onChange={(e) => setCut({ ...cut, date: e.target.value })} /></Field>
          </div>
          <Field label="Review link"><Input value={cut.link} onChange={(e) => setCut({ ...cut, link: e.target.value })} placeholder="Frame.io, Vimeo, Drive" /></Field>
          <Field label="Status"><Select value={cut.status} onChange={(e) => setCut({ ...cut, status: e.target.value })} options={CUT_STATUS} /></Field>
          <Field label="Notes"><Textarea rows={3} value={cut.notes} onChange={(e) => setCut({ ...cut, notes: e.target.value })} placeholder="Client notes, what changed since the last cut" /></Field>
        </Modal>
      )}
      {del && (
        <Modal open title={post.deliverables.some((d) => d.id === del.id) ? 'Edit deliverable' : 'New deliverable'} onClose={() => setDel(null)}
          footer={<><Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button><Button variant="primary" onClick={saveDel}>Save deliverable</Button></>}>
          <Field label="Name"><Input autoFocus value={del.name} onChange={(e) => setDel({ ...del, name: e.target.value })} placeholder="Instagram 9:16 60s" /></Field>
          <Field label="Spec"><Input value={del.format} onChange={(e) => setDel({ ...del, format: e.target.value })} placeholder="1080×1920, H.264, 25fps, stereo, burned-in subs" /></Field>
          <div className="row-3">
            <Field label="Due"><Input type="date" value={del.due} onChange={(e) => setDel({ ...del, due: e.target.value })} /></Field>
            <Field label="Owner"><Input value={del.owner} onChange={(e) => setDel({ ...del, owner: e.target.value })} placeholder="Editor, colorist" /></Field>
            <Field label="Status"><Select value={del.status} onChange={(e) => setDel({ ...del, status: e.target.value })} options={DELIV_STATUS} /></Field>
          </div>
          <Field label="Link"><Input value={del.link} onChange={(e) => setDel({ ...del, link: e.target.value })} placeholder="Where the file lives" /></Field>
          <Field label="Notes"><Textarea rows={2} value={del.notes} onChange={(e) => setDel({ ...del, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  )
}
