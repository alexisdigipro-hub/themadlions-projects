import { useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { today, uid } from '../../lib/store.jsx'
import { addDays, fmtLong } from '../../lib/dates.js'

const PRESET = [
  ['07:00', 'Load-in'], ['09:00', 'Stage & lighting build'], ['12:00', 'Soundcheck'], ['14:00', 'Rehearsal'], ['17:00', 'Crew meal'],
  ['18:30', 'Doors'], ['20:00', 'Show start'], ['22:30', 'Show end'], ['23:00', 'Load-out'],
]
const emptyDay = (date) => ({ id: uid(), date, callTime: '07:00', wrapTime: '23:59', unit: 'Main stage', locationId: '', sceneIds: [], blocks: [], notes: '' })
const emptyBlock = (time = '') => ({ id: uid(), time, end: '', item: '', owner: '', notes: '' })

export default function RunOfShow() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const editable = canEdit('schedule')
  const days = [...project.shootingDays].sort((a, b) => a.date.localeCompare(b.date))
  const [draft, setDraft] = useState(null)
  const [blockDraft, setBlockDraft] = useState(null) // { dayId, block }

  const saveDay = () => {
    if (!draft.date) return toast('Pick a date.', 'error')
    edit((p) => {
      const i = p.shootingDays.findIndex((d) => d.id === draft.id)
      if (i >= 0) p.shootingDays[i] = { ...p.shootingDays[i], ...draft }
      else p.shootingDays.push({ ...draft, sceneIds: [], blocks: draft.blocks || [] })
    })
    setDraft(null)
    toast('Event day saved', 'ok')
  }
  const saveBlock = () => {
    const { dayId, block } = blockDraft
    if (!block.item.trim()) return toast('Name the block.', 'error')
    edit((p) => {
      const d = p.shootingDays.find((x) => x.id === dayId)
      if (!d) return
      d.blocks = d.blocks || []
      const i = d.blocks.findIndex((b) => b.id === block.id)
      if (i >= 0) d.blocks[i] = block
      else d.blocks.push(block)
      d.blocks.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    })
    setBlockDraft(null)
  }
  const removeBlock = (dayId, id) => edit((p) => { const d = p.shootingDays.find((x) => x.id === dayId); if (d) d.blocks = (d.blocks || []).filter((b) => b.id !== id) })
  const addPreset = (dayId) => edit((p) => {
    const d = p.shootingDays.find((x) => x.id === dayId)
    if (!d) return
    d.blocks = [...(d.blocks || []), ...PRESET.map(([time, item]) => ({ ...emptyBlock(time), item }))].sort((a, b) => a.time.localeCompare(b.time))
  })
  const removeDay = (id) => edit((p) => (p.shootingDays = p.shootingDays.filter((d) => d.id !== id)))
  const locName = (id) => project.locations.find((l) => l.id === id)?.name

  return (
    <div className="ros">
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>{days.length} event day{days.length === 1 ? '' : 's'}</strong>
          <span className="muted">Run of show: every block with its time, what happens and who owns it</span>
        </div>
        <div className="toolbar-actions">
          {days.length > 0 && <Button variant="ghost" onClick={() => window.print()}>Print</Button>}
          {editable && <Button variant="primary" onClick={() => setDraft(emptyDay(days.length ? addDays(days[days.length - 1].date, 1) : project.startDate || today()))}>Add event day</Button>}
        </div>
      </div>

      {!days.length ? (
        <Empty title="No event days yet">Add the event day (or several for a multi-day event), then build the run of show: load-in, build, soundcheck, doors, show, load-out. The call sheet is generated from it.</Empty>
      ) : (
        days.map((d, i) => (
          <section key={d.id} className="panel ros-day">
            <div className="panel-head">
              <div>
                <h2>Day {i + 1} <span className="muted">{fmtLong(d.date)}</span></h2>
                <div className="muted small">{d.unit} · crew call {d.callTime}{locName(d.locationId) ? ` · ${locName(d.locationId)}` : ''}</div>
              </div>
              {editable && (
                <div className="row-actions">
                  <Button size="sm" onClick={() => setBlockDraft({ dayId: d.id, block: emptyBlock() })}>Add block</Button>
                  {!(d.blocks || []).length && <Button size="sm" variant="ghost" onClick={() => addPreset(d.id)}>Standard blocks</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ ...d })}>Edit day</Button>
                  <Confirm onConfirm={() => removeDay(d.id)} />
                </div>
              )}
            </div>
            {!(d.blocks || []).length ? (
              <p className="muted small">No blocks yet.</p>
            ) : (
              <table className="table ros-table">
                <thead><tr><th>Time</th><th>Block</th><th>Owner</th><th>Notes</th>{editable && <th />}</tr></thead>
                <tbody>
                  {d.blocks.map((b) => (
                    <tr key={b.id}>
                      <td className="nowrap"><strong>{b.time}</strong>{b.end ? <span className="muted"> – {b.end}</span> : ''}</td>
                      <td><strong>{b.item}</strong></td>
                      <td>{b.owner}</td>
                      <td className="small">{b.notes}</td>
                      {editable && (
                        <td className="row-actions no-print">
                          <button onClick={() => setBlockDraft({ dayId: d.id, block: { ...b } })}>Edit</button>
                          <Confirm onConfirm={() => removeBlock(d.id, b.id)} label="Delete">×</Confirm>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {d.notes && <p className="muted small">{d.notes}</p>}
          </section>
        ))
      )}

      <Modal open={!!draft} title={draft && days.some((d) => d.id === draft.id) ? 'Edit event day' : 'New event day'} onClose={() => setDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveDay}>Save day</Button></>}>
        {draft && (
          <div className="stack">
            <div className="row-3">
              <Field label="Date"><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
              <Field label="Crew call"><Input type="time" value={draft.callTime} onChange={(e) => setDraft({ ...draft, callTime: e.target.value })} /></Field>
              <Field label="Est. end"><Input type="time" value={draft.wrapTime} onChange={(e) => setDraft({ ...draft, wrapTime: e.target.value })} /></Field>
            </div>
            <div className="row-2">
              <Field label="Stage / area"><Input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="Main stage, Hall B" /></Field>
              <Field label="Venue"><Select value={draft.locationId} onChange={(e) => setDraft({ ...draft, locationId: e.target.value })} options={[['', 'Not set'], ...project.locations.map((l) => [l.id, l.name])]} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={2} value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!blockDraft} title="Run of show block" onClose={() => setBlockDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setBlockDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveBlock}>Save block</Button></>}>
        {blockDraft && (
          <div className="stack">
            <div className="row-3">
              <Field label="Start"><Input type="time" autoFocus value={blockDraft.block.time} onChange={(e) => setBlockDraft({ ...blockDraft, block: { ...blockDraft.block, time: e.target.value } })} /></Field>
              <Field label="End"><Input type="time" value={blockDraft.block.end} onChange={(e) => setBlockDraft({ ...blockDraft, block: { ...blockDraft.block, end: e.target.value } })} /></Field>
              <Field label="Owner"><Input value={blockDraft.block.owner} onChange={(e) => setBlockDraft({ ...blockDraft, block: { ...blockDraft.block, owner: e.target.value } })} placeholder="Stage manager, DJ, host" /></Field>
            </div>
            <Field label="Block"><Input value={blockDraft.block.item} onChange={(e) => setBlockDraft({ ...blockDraft, block: { ...blockDraft.block, item: e.target.value } })} placeholder="Doors, Opening act, Keynote, Award ceremony" /></Field>
            <Field label="Notes"><Textarea rows={2} value={blockDraft.block.notes} onChange={(e) => setBlockDraft({ ...blockDraft, block: { ...blockDraft.block, notes: e.target.value } })} placeholder="Cue, playback file, mic count, camera positions" /></Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
