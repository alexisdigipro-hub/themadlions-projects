import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Act, Button, Field, Input, Modal, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { remote } from '../lib/supabase.js'
import { departmentsOf, rememberViewAsFrom, today, useCurrentUser, useStore } from '../lib/store.jsx'
import { compress } from '../lib/photos.js'
import { fmtDate } from '../lib/dates.js'
import { trackRecord } from '../lib/trackRecord.js'
import { drawShareCard } from '../lib/shareCard.js'
import { KUDOS_EMOJI, SKILL_IDEAS, addKudos, availabilityOf, cleanSkills, completeness, isBirthday, loadKudos, reelEmbed, removeKudos } from '../lib/profileExtras.js'

const BLANK = { photo: '', thumb: '', position: '', dept: '', phone: '', bio: '', birthday: '', showPhone: 'everyone', skills: [], reel: '' }

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
  const iso = today()
  const bday = shown && isBirthday(view, iso)
  const avail = availabilityOf(state, person, iso, trackRecord(state, person).list.map((x) => x.id))
  const done = completeness(editable ? draft : view)
  const reel = reelEmbed(editable ? draft.reel : view.reel)
  const skills = cleanSkills(editable ? draft.skills : view.skills)

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
          <h2>{person.name}{bday && <span className="profile-cake" title="Birthday today"> 🎂</span>}</h2>
          <p className="muted small">{person.email}</p>
          {bday && <p className="profile-bday">Happy birthday, {(person.name || '').split(' ')[0]}! 🎉</p>}
          <Availability a={avail} />
          {editable && (
            <div className="row-actions wrap">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Resizing…' : draft.photo ? 'New photo' : 'Choose photo'}</Button>
              {draft.photo && <Button size="sm" variant="ghost" onClick={() => setDraft((d) => ({ ...d, photo: '', thumb: '' }))}>Remove</Button>}
            </div>
          )}
          {editable && done.pct < 100 && (
            <div className="profile-done" title={`Still missing: ${done.missing.join(', ')}`}>
              <span className="profile-done-head"><b>Profile {done.pct}% complete</b></span>
              <span className="track-xp"><i style={{ width: `${done.pct}%` }} /></span>
              <span className="muted small">Add {done.missing.slice(0, 2).join(' and ')}{done.missing.length > 2 ? ` and ${done.missing.length - 2} more` : ''}</span>
            </div>
          )}
          {editable && done.pct === 100 && <p className="profile-done-all">✨ Profile complete</p>}
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
              {/* a div, not Field's label: a label would pass a click on its empty space to the first × */}
              <div className="field">
                <span className="field-label">Skills</span>
                <SkillsInput value={cleanSkills(draft.skills)} onChange={(v) => set('skills', v)} />
                <span className="field-hint">What you are good at, as tags: the team finds you by them.</span>
              </div>
              <Field label="Showreel" hint="A YouTube or Vimeo link. It plays on your profile.">
                <Input value={draft.reel} onChange={(e) => set('reel', e.target.value)} placeholder="https://vimeo.com/…" inputMode="url" />
              </Field>
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
              <div className="wide"><dt>Skills</dt><dd>{skills.length ? <span className="skill-chips">{skills.map((x) => <span key={x} className="skill-chip">{x}</span>)}</span> : <span className="muted">Nothing yet</span>}</dd></div>
            </dl>
          )}
        </section>
      </div>

      {!embedded && <TrackRecord state={state} person={person} />}
      {!embedded && reel && (
        <section className="panel profile-reel">
          <span className="track-label">Showreel</span>
          <div className="profile-reel-frame"><iframe src={reel} title={`${person.name}'s showreel`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" /></div>
        </section>
      )}
      {!embedded && <Kudos state={state} person={person} me={me} />}
    </div>
  )
}

/* Under the details (Alex, 29 Oct): the projects this person took part in and a score out of 100
   with a level, worked out from the projects (lib/trackRecord.js). Then "more social media friendly,
   not so serious": a profile head like Instagram's (the score ring, big counts), stickers for what
   they earned, XP to the next level, and the projects as story circles with their covers. */
function TrackRecord({ state, person }) {
  const r = trackRecord(state, person)
  const first = (person.name || '').split(' ')[0] || 'They'
  const why = r.parts.map((x) => `${x.label} ${x.pts}/${x.max}: ${x.note}`).join('\n')
  const [card, setCard] = useState(null) // { url, file } once drawn
  const [making, setMaking] = useState(false)
  const toast = useToast()
  const fileName = `${(person.name || 'profile').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-track-record.png`
  const makeCard = async () => {
    setMaking(true)
    try {
      const blob = await drawShareCard({ person, record: r, logo: state.settings?.logo })
      setCard({ url: URL.createObjectURL(blob), file: new File([blob], fileName, { type: 'image/png' }) })
    } catch (e) {
      toast(e.message || 'Could not make the card.', 'error')
    } finally {
      setMaking(false)
    }
  }
  const closeCard = () => { if (card) URL.revokeObjectURL(card.url); setCard(null) }
  // a phone shares the picture straight to Instagram, WhatsApp…; a computer saves it
  const canShare = !!card && typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files: [card.file] })
  const share = async () => {
    try { await navigator.share({ files: [card.file] }) } catch (e) { if (e?.name !== 'AbortError') toast('Sharing did not work here. Save the picture instead.', 'error') }
  }
  const save = () => {
    const a = document.createElement('a')
    a.href = card.url
    a.download = fileName
    a.click()
  }
  return (
    <section className="panel track-record">
      <div className="track-head">
        <div className="track-ring" style={{ '--pct': `${r.score}%` }} title={why}>
          <span className="track-ring-in"><b>{r.score}</b><small>XP</small></span>
          <span className="track-ring-emoji" aria-hidden="true">{r.emoji}</span>
        </div>
        <div className="track-who">
          <span className="track-level-pill">{r.emoji} {r.level}</span>
          {r.next ? (
            <>
              <span className="track-xp"><i style={{ width: `${r.next.pct}%` }} /></span>
              <span className="muted small"><b>{r.next.need} XP</b> to {r.next.name} {r.next.emoji}</span>
            </>
          ) : <span className="muted small">Top of the pride. Nothing above this 👑</span>}
        </div>
        <ul className="track-stats">
          {r.stats.map((x) => <li key={x.label}><b>{x.value}</b><span>{x.label}</span></li>)}
        </ul>
        <Act icon="share" label={making ? 'Making…' : 'Share card'} onClick={makeCard} disabled={making} className="track-share" />
      </div>

      {r.badges.length > 0 && (
        <div className="track-stickers">
          {r.badges.map((b) => <span key={b.name} className="track-sticker" title={b.note}><span aria-hidden="true">{b.emoji}</span>{b.name}</span>)}
        </div>
      )}

      {r.list.length ? (
        <div className="track-stories">
          {r.list.map((x) => (
            <Link key={x.id} to={`/p/${x.id}`} className={`track-story${x.delivered ? ' done' : ''}`} style={{ '--pc': x.color }} title={[[x.artist, x.title].filter(Boolean).join(' - '), x.role, x.category, (x.when || '').slice(0, 4)].filter(Boolean).join(' · ')}>
              <span className="track-story-ring">
                <span className="track-story-pic">{x.cover ? <img src={x.cover} alt="" loading="lazy" /> : <span>{initialsOf(x.title)}</span>}</span>
                {x.delivered ? <span className="track-story-tag">✓</span> : <span className="track-story-tag live">LIVE</span>}
              </span>
              <b>{x.title}</b>
              <small>{x.role || x.category}</small>
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted small track-empty">{first}'s projects show up here once they are in a crew or cast, have a task, or a budget line pays them. 🎬</p>
      )}

      <Modal open={!!card} title="Share card" onClose={closeCard} className="track-card-modal"
        footer={card && (
          <>
            {canShare && <Button variant="primary" onClick={share}>Share</Button>}
            <Button variant={canShare ? 'default' : 'primary'} onClick={save}>Download</Button>
          </>
        )}>
        {card && <img className="track-card-img" src={card.url} alt={`${person.name}'s track record`} />}
        <p className="muted small">Story size (1080 × 1920), ready for Instagram, TikTok or WhatsApp.</p>
      </Modal>
    </section>
  )
}

/* Free or not (Alex, 29 Oct), read from the Calendar: their own Not available, a shoot today on one
   of their projects, else free with the next shoot day */
function Availability({ a }) {
  const day = (d) => fmtDate(d, { day: 'numeric', month: 'short' })
  if (a.kind === 'off') return <span className="avail-pill off"><i />Not available{a.until ? ` until ${day(a.until)}` : ''}</span>
  if (a.kind === 'shoot') return <Link to={`/p/${a.projectId}`} className="avail-pill shoot"><i />🎬 On set today{a.title ? ` · ${a.title}` : ''}</Link>
  return (
    <span className="avail-wrap">
      <span className="avail-pill free"><i />Available</span>
      {a.next && <Link to={`/p/${a.next.projectId}`} className="muted small">Next shoot {day(a.next.date)}{a.next.title ? ` · ${a.next.title}` : ''}</Link>}
    </span>
  )
}

/* Skills as tags: type and press Enter (or a comma), × takes one off, a few ideas to tap */
function SkillsInput({ value, onChange }) {
  const [text, setText] = useState('')
  const add = (s) => { const v = cleanSkills([...value, s]); onChange(v); setText('') }
  const ideas = SKILL_IDEAS.filter((x) => !value.some((v) => v.toLowerCase() === x.toLowerCase())).slice(0, 8)
  return (
    <div className="skills-input">
      <div className="skill-chips">
        {value.map((x) => (
          <span key={x} className="skill-chip">{x}<button type="button" aria-label={`Remove ${x}`} onClick={() => onChange(value.filter((v) => v !== x))}>×</button></span>
        ))}
        <input className="skills-type" value={text} placeholder={value.length ? 'Add another…' : 'Gimbal, Color grading…'} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ',') && text.trim()) { e.preventDefault(); add(text) }
            else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={() => text.trim() && add(text)} />
      </div>
      {ideas.length > 0 && (
        <div className="skill-ideas">
          {ideas.map((x) => <button key={x} type="button" className="skill-idea" onClick={() => add(x)}>+ {x}</button>)}
        </div>
      )}
    </div>
  )
}

/* Kudos from the team (Alex, 29 Oct): a teammate leaves a short thank-you, about a project if they
   like. Everyone reads them; nobody writes on their own profile; you delete yours, an administrator
   any. Stored in the kudos table (supabase/kudos.sql). */
function Kudos({ state, person, me }) {
  const toast = useToast()
  const [list, setList] = useState(null)
  const [err, setErr] = useState('')
  const [text, setText] = useState('')
  const [emoji, setEmoji] = useState(KUDOS_EMOJI[0])
  const [projectId, setProjectId] = useState('')
  const [sending, setSending] = useState(false)
  useEffect(() => {
    let on = true
    setList(null)
    setErr('')
    loadKudos(person.id).then((l) => on && setList(l)).catch((e) => on && (setErr(e.message), setList([])))
    return () => { on = false }
  }, [person.id])
  const own = me?.id === person.id
  const theirs = trackRecord(state, person).list
  const userOf = (id) => state.users.find((u) => u.id === id)
  const titleOf = (id) => (state.projects || []).find((p) => p.id === id)?.title
  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const k = await addKudos({ to: person.id, from: me.id, text, emoji, projectId })
      setList((l) => [k, ...(l || [])])
      setText('')
      setProjectId('')
      toast('Kudos sent', 'ok')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSending(false)
    }
  }
  const drop = async (id) => {
    try { await removeKudos(id); setList((l) => l.filter((k) => k.id !== id)) } catch (e) { toast(e.message, 'error') }
  }
  const first = (person.name || '').split(' ')[0] || 'them'
  return (
    <section className="panel kudos">
      <div className="kudos-head">
        <span className="track-label">Kudos</span>
        {list?.length > 0 && <span className="kudos-count">{list.length} 🙌</span>}
      </div>
      {!own && !err && (
        <div className="kudos-form">
          <div className="kudos-emoji">
            {KUDOS_EMOJI.map((x) => <button key={x} type="button" className={x === emoji ? 'on' : ''} onClick={() => setEmoji(x)} aria-label={x}>{x}</button>)}
          </div>
          <Input value={text} maxLength={280} onChange={(e) => setText(e.target.value)} placeholder={`Say something nice to ${first}…`} onKeyDown={(e) => e.key === 'Enter' && send()} />
          {theirs.length > 0 && <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} options={[['', 'No project'], ...theirs.map((x) => [x.id, x.title])]} />}
          <Button variant="primary" onClick={send} disabled={sending || !text.trim()}>Send</Button>
        </div>
      )}
      {err ? <p className="muted small">{err}</p> : list === null ? <p className="muted small">Loading…</p> : list.length === 0 ? (
        <p className="muted small">{own ? 'Nothing yet. When a teammate thanks you, it shows up here.' : `No kudos yet. Be the first to thank ${first}.`}</p>
      ) : (
        <div className="kudos-list">
          {list.map((k) => {
            const from = userOf(k.from)
            const pic = from?.profile?.thumb || from?.profile?.photo
            return (
              <div key={k.id} className="kudos-card">
                <span className="kudos-big" aria-hidden="true">{k.emoji || '🙌'}</span>
                <p>{k.text}</p>
                <div className="kudos-meta">
                  <Link to={`/u/${k.from}`} className="kudos-from">
                    <span className="kudos-pic">{pic ? <img src={pic} alt="" /> : initialsOf(from?.name)}</span>
                    {from?.name || 'Someone'}
                  </Link>
                  {k.projectId && titleOf(k.projectId) && <Link to={`/p/${k.projectId}`} className="kudos-proj">{titleOf(k.projectId)}</Link>}
                  <span className="muted small">{fmtDate((k.at || '').slice(0, 10), { day: 'numeric', month: 'short' })}</span>
                  {(k.from === me?.id || me?.role === 'admin') && <button type="button" className="kudos-del" onClick={() => drop(k.id)} aria-label="Delete">×</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
