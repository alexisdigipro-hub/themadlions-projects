import { useState } from 'react'
import { Button, Field, Input, Modal, Select, useToast } from './ui.jsx'
import { useProject } from '../pages/Project.jsx'
import { callsheetDefaults, useStore } from '../lib/store.jsx'
import { newDayFor, nextDayDate } from '../lib/shootDays.js'

/* New call sheet (Alex: "can I make a call sheet without setting up a shoot day first?").
   Three questions, date, call time and location, and the sheet opens ready to fill in. The shoot
   day it belongs to is made here, behind the scenes, so the shoot still lands on the Calendar,
   on Home and in the shot list's timings without being typed twice. Nothing else is
   needed first: no script, breakdown or scenes. A date that already has a shoot day opens that
   day's sheet instead of making a second one. */
export default function NewCallSheet({ onClose, onCreated }) {
  const { project, edit } = useProject()
  const { state } = useStore()
  const toast = useToast()
  const csd = callsheetDefaults(state)
  const [f, setF] = useState({ date: nextDayDate(project), callTime: csd.callTime || '07:00', locationId: '' })
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const locations = project.locations || []

  const create = () => {
    if (!f.date) return toast('Pick the date of the shoot.', 'error')
    const already = (project.shootingDays || []).find((d) => d.date === f.date)
    if (already) {
      toast('There is already a shoot day on that date, so its call sheet opens.', 'ok')
      return onCreated(already.id)
    }
    const day = newDayFor(project, f.date, { callTime: f.callTime, wrapTime: csd.wrapTime, locationId: f.locationId })
    edit((p) => { p.shootingDays = [...(p.shootingDays || []), day] })
    onCreated(day.id)
  }

  return (
    <Modal
      open
      title="New call sheet"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={create}>Create call sheet</Button>
        </>
      }
    >
      <div className="stack">
        <div className="row-2">
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} autoFocus /></Field>
          <Field label="Call time"><Input type="time" value={f.callTime} onChange={(e) => set('callTime', e.target.value)} /></Field>
        </div>
        <Field label="Location" hint={locations.length ? 'You can change it later on the sheet, or type a name and address there instead.' : 'No locations in this project yet. Leave this and type the name and address on the sheet.'}>
          <Select value={f.locationId} onChange={(e) => set('locationId', e.target.value)} options={[['', 'Not yet'], ...locations.map((l) => [l.id, l.name])]} />
        </Field>
      </div>
    </Modal>
  )
}
