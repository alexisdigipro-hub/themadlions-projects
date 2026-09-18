import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Button, Field, Input, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { departmentsOf, useCurrentUser, useStore } from '../lib/store.jsx'
import { compress } from '../lib/photos.js'
import { fmtDate } from '../lib/dates.js'

const BLANK = { photo: '', thumb: '', position: '', dept: '', phone: '', bio: '', birthday: '', showPhone: 'everyone' }

export const initialsOf = (name) => (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

/* The photo lives inside the member row as a small data URL, like the company logo, so a
   profile needs no storage bucket and no extra round trip when the team list loads. */
const toDataUrl = (blob) => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result))
  r.onerror = () => rej(new Error('Could not read that image.'))
  r.readAsDataURL(blob)
})

/* Whose personal details this viewer is allowed to see. Each member chooses for themselves
   whether the team or only administrators see their phone and birthday. */
export const canSeeProfileDetails = (viewer, subject) =>
  !!viewer && (viewer.id === subject.id || viewer.role === 'admin' || (subject.profile?.showPhone || 'everyone') === 'everyone')

export default function Profile({ mine = false }) {
  const { id } = useParams()
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const targetId = mine ? me?.id : id
  const person = state.users.find((u) => u.id === targetId)
  const editable = !!me && !!person && (me.id === person.id || me.role === 'admin')
  const [draft, setDraft] = useState(() => ({ ...BLANK, ...(person?.profile || {}) }))
  useEffect(() => { setDraft({ ...BLANK, ...(person?.profile || {}) }) }, [targetId, person?.profile])

  if (!me) return <Navigate to="/login" replace />
  if (!person) {
    return (
      <div>
        <PageHead title="Profile" />
        <p className="muted">That person is not in the team any more. <Link to="/">Back to projects</Link></p>
      </div>
    )
  }

  const shown = canSeeProfileDetails(me, person)
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const save = () => {
    update((s) => {
      const u = s.users.find((x) => x.id === person.id)
      if (u) u.profile = { ...draft }
      return s
    })
    toast('Profile saved', 'ok')
  }
  const pickPhoto = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const c = await compress(file, { max: 320, quality: 0.8, thumb: 96 })
      const photo = await toDataUrl(c.blob)
      setDraft((d) => ({ ...d, photo, thumb: c.thumb }))
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const depts = departmentsOf(state)
  const view = person.profile || {}

  return (
    <div className="profile-page">
      <PageHead title={mine ? 'My profile' : person.name} sub={person.role === 'admin' ? 'Administrator' : 'Team member'}>
        {editable && <Button variant="primary" onClick={save} disabled={busy}>Save profile</Button>}
      </PageHead>

      <div className="profile-grid">
        <section className="panel profile-card">
          <div className="profile-photo">
            {(editable ? draft.photo : view.photo) ? (
              <img src={editable ? draft.photo : view.photo} alt="" />
            ) : (
              <span className="profile-initials">{initialsOf(person.name)}</span>
            )}
          </div>
          <h2>{person.name}</h2>
          <p className="muted small">{person.email}</p>
          {editable && (
            <div className="row-actions wrap">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
              <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Resizing…' : 'Choose photo'}</Button>
              {draft.photo && <button className="link small" onClick={() => setDraft((d) => ({ ...d, photo: '', thumb: '' }))}>Remove</button>}
            </div>
          )}
          {editable && <p className="fineprint">Your name and email are set by an administrator in Team. Everything else on this page is yours to fill in.</p>}
        </section>

        <section className="panel profile-fields">
          {editable ? (
            <div className="stack">
              <div className="row-2">
                <Field label="Position" hint="What you do here, in your own words."><Input value={draft.position} onChange={(e) => set('position', e.target.value)} placeholder="Director of photography" /></Field>
                <Field label="Department"><Select value={draft.dept} onChange={(e) => set('dept', e.target.value)} options={[['', 'Not set'], ...depts.map((d) => [d, d])]} /></Field>
              </div>
              <div className="row-2">
                <Field label="Phone"><Input value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+30 69…" inputMode="tel" /></Field>
                <Field label="Birthday"><Input type="date" value={draft.birthday} onChange={(e) => set('birthday', e.target.value)} /></Field>
              </div>
              <Field label="A few words" hint="What you have worked on, what you are good at, anything the team should know."><Textarea rows={5} value={draft.bio} onChange={(e) => set('bio', e.target.value)} /></Field>
              <Field label="Who can see my phone and birthday" hint="Your name, photo, position and the few words are always visible to the team.">
                <Select value={draft.showPhone === 'admins' ? 'admins' : 'everyone'} onChange={(e) => set('showPhone', e.target.value)} options={[['everyone', 'Everyone in the team'], ['admins', 'Administrators only']]} />
              </Field>
              <div className="row-actions"><Button variant="primary" onClick={save} disabled={busy}>Save profile</Button></div>
            </div>
          ) : (
            <dl className="profile-read">
              <div><dt>Position</dt><dd>{view.position || <span className="muted">Not set</span>}</dd></div>
              <div><dt>Department</dt><dd>{view.dept || <span className="muted">Not set</span>}</dd></div>
              <div><dt>Phone</dt><dd>{!shown ? <span className="muted">Kept private</span> : view.phone ? <a href={`tel:${view.phone}`}>{view.phone}</a> : <span className="muted">Not set</span>}</dd></div>
              <div><dt>Birthday</dt><dd>{!shown ? <span className="muted">Kept private</span> : view.birthday ? fmtDate(view.birthday, { day: 'numeric', month: 'long' }) : <span className="muted">Not set</span>}</dd></div>
              <div className="wide"><dt>A few words</dt><dd>{view.bio || <span className="muted">Nothing yet</span>}</dd></div>
            </dl>
          )}
        </section>
      </div>
    </div>
  )
}
