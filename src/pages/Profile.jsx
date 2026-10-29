import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, Field, Input, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { remote } from '../lib/supabase.js'
import { departmentsOf, rememberViewAsFrom, useCurrentUser, useStore } from '../lib/store.jsx'
import { compress } from '../lib/photos.js'
import { fmtDate } from '../lib/dates.js'
import { trackRecord } from '../lib/trackRecord.js'

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

/* embedded: My profile as a tab of Settings and a section of TML Chat's Settings (Alex, 10 Oct), so
   without its own page head; the Save button at the foot of the form is the one it keeps */
export default function Profile({ mine = false, embedded = false }) {
  const { id } = useParams()
  const { state, update, setViewAs } = useStore()
  const me = useCurrentUser()
  const nav = useNavigate()
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
    <div className={`profile-page${embedded ? ' embedded' : ''}`}>
      {!embedded && <PageHead title={mine ? 'My profile' : person.name} sub={person.role === 'admin' ? 'Administrator' : 'Team member'}>
        {/* Alex: from a teammate's profile, open the app exactly as they see it. The same View as
            Settings > Team has: read-only while it lasts, and Stop comes back to this profile.
            Not offered for another administrator, who sees everything anyway, or someone whose
            access is switched off. */}
        {me?.role === 'admin' && !mine && person.id !== me.id && person.role !== 'admin' && person.active !== false && (
          <Button variant="ghost" onClick={() => { rememberViewAsFrom(`/u/${person.id}`); setViewAs(person.id); nav('/') }}>
            See what {(person.name || '').split(' ')[0] || 'they'} sees
          </Button>
        )}
        {/* Message / Call / Video call went with Hub Chat (Alex, 20 Oct): the team talks in RoarMe */}
        {editable && <Button variant="primary" onClick={save} disabled={busy}>Save profile</Button>}
      </PageHead>}

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
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Resizing…' : draft.photo ? 'New photo' : 'Choose photo'}</Button>
              {draft.photo && <Button size="sm" variant="ghost" onClick={() => setDraft((d) => ({ ...d, photo: '', thumb: '' }))}>Remove</Button>}
            </div>
          )}
          {editable && <p className="fineprint">Your name and email are set by an administrator in Team. Everything else on this page is yours to fill in.</p>}
        </section>

        <section className="panel profile-fields">
          {editable ? (
            <div className="stack">
              <div className="row-2">
                <Field label="Position"><Input value={draft.position} onChange={(e) => set('position', e.target.value)} placeholder="Director of photography" /></Field>
                <Field label="Department"><Select value={draft.dept} onChange={(e) => set('dept', e.target.value)} options={[['', 'Not set'], ...depts.map((d) => [d, d])]} /></Field>
              </div>
              <div className="row-2">
                <Field label="Phone"><Input value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+30 69…" inputMode="tel" /></Field>
                <Field label="Birthday"><Input type="date" value={draft.birthday} onChange={(e) => set('birthday', e.target.value)} /></Field>
              </div>
              <Field label="A few words"><Textarea rows={4} placeholder="What you have worked on, what you are good at, anything the team should know" value={draft.bio} onChange={(e) => set('bio', e.target.value)} /></Field>
              <Field label="Who can see my phone and birthday" hint="Your name, photo, position and the few words are always visible to the team.">
                <Select value={draft.showPhone === 'admins' ? 'admins' : 'everyone'} onChange={(e) => set('showPhone', e.target.value)} options={[['everyone', 'Everyone in the team'], ['admins', 'Administrators only']]} />
              </Field>
              {/* Save sits in the page's top row; inside Settings, where there is no top row, here */}
              {embedded && <div className="row-actions"><Button variant="primary" onClick={save} disabled={busy}>Save profile</Button></div>}
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

      {!embedded && <TrackRecord state={state} person={person} />}
    </div>
  )
}

/* Under the details (Alex, 29 Oct): the projects this person took part in as badges, and a score
   out of 100 with a level, worked out from the projects (lib/trackRecord.js). */
function TrackRecord({ state, person }) {
  const r = trackRecord(state, person)
  const first = (person.name || '').split(' ')[0] || 'They'
  return (
    <section className="panel track-record">
      <div className="track-score" style={{ '--pct': `${r.score}%` }}>
        <div className="track-ring"><b>{r.score}</b><small>of 100</small></div>
        <div className="track-level">
          <span className="track-label">Track record</span>
          <strong>{r.level}</strong>
          <span className="muted small">{r.list.length ? `${r.list.length} project${r.list.length === 1 ? '' : 's'} with the team` : 'No projects yet'}</span>
        </div>
        <ul className="track-parts">
          {r.parts.map((x) => (
            <li key={x.key} title={x.note}>
              <span className="track-part-head"><span>{x.label}</span><b>{x.pts}<small>/{x.max}</small></b></span>
              <span className="track-bar"><i style={{ width: `${(x.pts / x.max) * 100}%` }} /></span>
              <span className="muted small">{x.note}</span>
            </li>
          ))}
        </ul>
      </div>
      {r.list.length ? (
        <div className="track-badges">
          {r.list.map((x) => (
            <Link key={x.id} to={`/p/${x.id}`} className={`track-badge${x.delivered ? ' done' : ''}`} style={{ '--pc': x.color }} title={[x.artist, x.title].filter(Boolean).join(' - ')}>
              <span className="track-dot" />
              <span className="track-badge-text">
                <b>{x.title}</b>
                <small>{[x.role, x.category, (x.when || '').slice(0, 4)].filter(Boolean).join(' · ')}</small>
              </span>
              {x.delivered && <span className="track-tick" aria-label="Delivered">✓</span>}
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted small track-empty">{first} shows up here once they are in a project's crew or cast, have a task in one, or a budget line pays them.</p>
      )}
    </section>
  )
}
