import { Fragment, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Badge, Button, Confirm, Field, Input, Modal, PageHead, Select, useToast } from '../components/ui.jsx'
import { MODULES, MODULE_GROUPS, ROLE_PRESETS, accessEnded, defaultPermissions, presetPermissions, rememberViewAsFrom, uid, useCurrentUser, useStore, whenMs } from '../lib/store.jsx'
import { fmtDate } from '../lib/dates.js'
import { initialsOf } from './Profile.jsx'

const LEVELS = [
  ['none', 'No access'],
  ['view', 'View'],
  ['edit', 'Edit'],
]

/* The Team list lives inside Settings > Team now (Alex), so with `embedded` it draws itself as a
   panel in that grid instead of a page with its own heading. The /team address still works and
   still gives the page, so an old link or a bookmark does not break. */
/* "3 hours ago" reads faster than a timestamp for the thing Alex actually wants to know, which
   is whether someone has been in lately. The exact date and time is the cell's tooltip. */
function lastSeenText(at) {
  const ms = whenMs(at)
  if (!ms) return '–'
  const mins = Math.round((Date.now() - ms) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 8) return `${days} day${days === 1 ? '' : 's'} ago`
  return fmtDate(new Date(ms).toISOString().slice(0, 10))
}

export default function Team({ embedded = false }) {
  const { state, update, mode, invites, invite, removeInvite, setViewAs } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const nav = useNavigate()
  const [draft, setDraft] = useState(null)
  const remote = mode === 'remote'

  if (me?.role !== 'admin') return <Navigate to="/" replace />

  const save = async () => {
    const em = draft.email.trim().toLowerCase()
    if (!draft.name.trim() || !em) return toast('Name and email are required.', 'error')
    if (state.users.some((u) => u.email === em && u.id !== draft.id)) return toast('That email is already in the team.', 'error')
    if (remote && draft.isNew) {
      try {
        await invite({ ...draft, email: em })
        toast('Invite saved. Ask them to create an account with that email.', 'ok')
        setDraft(null)
      } catch (e) {
        toast(e.message, 'error')
      }
      return
    }
    if (!remote && draft.isNew && draft.password.length < 4) return toast('Give them a temporary password of at least 4 characters.', 'error')
    update((s) => {
      const { isNew, ...u } = draft
      u.email = em
      const i = s.users.findIndex((x) => x.id === u.id)
      if (i >= 0) s.users[i] = { ...s.users[i], ...u, password: u.password || s.users[i].password }
      else s.users.push(u)
      return s
    })
    toast(draft.isNew ? 'Teammate added' : 'Saved', 'ok')
    setDraft(null)
  }

  const newUser = () => ({
    id: uid(),
    name: '',
    email: '',
    password: '',
    role: 'member',
    permissions: { ...defaultPermissions(state.settings?.newMemberLevel || 'view'), projects: 'view', drives: 'none', share: 'none' },
    projectAccess: 'all',
    active: true,
    createdAt: new Date().toISOString(),
    isNew: true,
  })

  const admins = state.users.filter((u) => u.role === 'admin' && u.active !== false).length
  const groups = [
    ['Administrators', state.users.filter((u) => u.role === 'admin' && u.active !== false)],
    ['Members', state.users.filter((u) => u.role !== 'admin' && u.active !== false)],
    ['Deactivated', state.users.filter((u) => u.active === false)],
  ]
  const countOf = (u, level) => MODULES.filter((m) => u.permissions?.[m.key] === level).length

  const Wrap = embedded ? 'section' : Fragment
  return (
    <>
      <Wrap {...(embedded ? { className: 'panel', 'data-tab': 'team' } : {})}>
      {embedded ? (
        <div className="panel-head">
          <h2>Team</h2>
          <Button size="sm" variant="primary" onClick={() => setDraft(newUser())}>Add teammate</Button>
        </div>
      ) : (
        <PageHead title="Team" sub="Who can see and change what. Administrators can do everything.">
          <Button variant="primary" onClick={() => setDraft(newUser())}>
            Add teammate
          </Button>
        </PageHead>
      )}
      {embedded && <p className="small muted">Who can see and change what. Administrators can do everything.</p>}

      {/* The people as rows grouped Administrators / Members / Deactivated / Waiting to sign up
          (Alex, 10 Oct: "the Team tab needs another organisation"): who they are and their email,
          then their projects, what they can do and when they were last in, then the buttons. */}
      <div className="team-list">
        {groups.filter(([, list]) => list.length).map(([title, list]) => (
          <Fragment key={title}>
            <div className="perm-group">{title}<small> · {list.length}</small></div>
            {list.map((u) => (
              <div key={u.id} className={`team-row${u.active === false ? ' dim' : ''}`}>
                <Link className="team-name" to={u.id === me.id ? '/settings' : `/u/${u.id}`}>
                  {u.profile?.thumb ? <img className="team-avatar" src={u.profile.thumb} alt="" /> : <span className="team-avatar initials">{initialsOf(u.name)}</span>}
                  <span className="team-who">
                    <strong>{u.name}{u.id === me.id && <span className="muted small"> (you)</span>}</strong>
                    <span className="small muted">{u.email}</span>
                  </span>
                </Link>
                <div className="team-facts small muted">
                  {accessEnded(u) && u.active !== false && <Badge color="#d8564a">access ended</Badge>}
                  <span>{u.role === 'admin' ? 'Everything' : `${u.projectAccess === 'all' ? 'All projects' : `${(u.projectAccess || []).length} project${(u.projectAccess || []).length === 1 ? '' : 's'}`} · ${countOf(u, 'edit')} edit · ${countOf(u, 'view')} view`}</span>
                  {/* stamped by their own browser when they open the app, at most every half hour */}
                  <span title={u.profile?.lastSeen ? new Date(u.profile.lastSeen).toLocaleString('en-GB') : ''}>Seen {lastSeenText(u.profile?.lastSeen)}</span>
                </div>
                <div className="row-actions team-acts">
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ ...u, password: '' })}>Edit</Button>
                  {u.id !== me.id && u.active !== false && u.role !== 'admin' && (
                    <Button size="sm" variant="ghost" onClick={() => { rememberViewAsFrom('/settings'); setViewAs(u.id); nav('/') }}>View as</Button>
                  )}
                  {u.id !== me.id && (
                    <Confirm
                      label={u.active === false ? 'Reactivate' : 'Deactivate'}
                      onConfirm={() => update((s) => { const x = s.users.find((y) => y.id === u.id); x.active = x.active === false; return s })}
                    />
                  )}
                  {u.id !== me.id && u.active === false && (
                    <Confirm label="Remove" onConfirm={() => { update((s) => { s.users = s.users.filter((y) => y.id !== u.id); return s }); toast(`${u.name} removed from the team`) }} />
                  )}
                </div>
              </div>
            ))}
          </Fragment>
        ))}
        {remote && invites.length > 0 && (
          <>
            <div className="perm-group">Waiting to sign up<small> · {invites.length}</small></div>
            {invites.map((i) => (
              <div key={i.id} className="team-row">
                <span className="team-name">
                  <span className="team-avatar initials">{initialsOf(i.name)}</span>
                  <span className="team-who"><strong>{i.name}</strong><span className="small muted">{i.email}</span></span>
                </span>
                <div className="team-facts small muted"><span>{i.role === 'admin' ? 'Administrator' : 'Member'} · has not signed up yet</span></div>
                <div className="row-actions team-acts">
                  <Confirm label="Remove" onConfirm={() => removeInvite(i.id).catch((e) => toast(e.message, 'error'))} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <p className="fineprint">
        {remote
          ? 'Teammates create their own password when they sign up with the email you added here. Permissions take effect the moment they sign in.'
          : 'Local mode accounts live in this browser only; team login across devices arrives with the Supabase backend.'}{' '}
        {admins === 1 && 'You are the only administrator.'}
      </p>
      </Wrap>

      <Modal
        open={!!draft}
        wide
        title={draft?.isNew ? 'Add teammate' : draft?.name || 'Teammate'}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              {draft?.isNew ? 'Add teammate' : 'Save'}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="stack">
            <h3 className="team-sec">Person</h3>
            <div className="row-2">
              <Field label="Name">
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
              </Field>
              <Field label="Email">
                <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </Field>
            </div>
            <div className="row-2">
              {remote ? (
                <Field label="Password" hint={draft.isNew ? 'They choose it themselves when they sign up.' : 'They can change it from the sign-in page (Forgot password).'}>
                  <Input type="text" value="" disabled placeholder="Set by the teammate" />
                </Field>
              ) : (
                <Field label={draft.isNew ? 'Temporary password' : 'New password (leave blank to keep)'}>
                  <Input type="text" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
                </Field>
              )}
              <Field label="Role">
                <Select
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                  options={[
                    ['member', 'Member (custom permissions)'],
                    ['admin', 'Administrator (everything)'],
                  ]}
                  disabled={draft.id === me.id}
                />
              </Field>
            </div>

            {draft.role === 'member' && (
              <>
                <h3 className="team-sec">Projects</h3>
                <Field label="Project access">
                  <Select value={draft.projectAccess === 'all' ? 'all' : 'some'} onChange={(e) => setDraft({ ...draft, projectAccess: e.target.value === 'all' ? 'all' : [] })} options={[['all', 'All projects'], ['some', 'Only selected projects']]} />
                </Field>
                {draft.projectAccess !== 'all' && (
                  <div className="chips" data-glide="off">
                    {state.projects.map((p) => {
                      const on = draft.projectAccess.includes(p.id)
                      return (
                        <button key={p.id} type="button" className={`chip ${on ? 'on' : ''}`} onClick={() => setDraft({ ...draft, projectAccess: on ? draft.projectAccess.filter((x) => x !== p.id) : [...draft.projectAccess, p.id] })}>
                          {p.title}
                        </button>
                      )
                    })}
                    {!state.projects.length && <span className="muted small">No projects yet.</span>}
                  </div>
                )}

                <Field label="Access until" hint="For someone who is here for one job. The day after, every module reads as no access until you clear the date. Leave empty for no end.">
                  <Input type="date" value={draft.permissions?.accessUntil || ''} onChange={(e) => setDraft({ ...draft, permissions: { ...draft.permissions, accessUntil: e.target.value } })} />
                </Field>

                <h3 className="team-sec">What they can do</h3>
                <div className="field">
                  <span className="field-label">Start from a role</span>
                  <div className="chips">
                    {ROLE_PRESETS.map(([label, perms]) => (
                      <button key={label} type="button" className="chip" onClick={() => setDraft({ ...draft, permissions: { ...presetPermissions(perms), accessUntil: draft.permissions?.accessUntil || '', databasePage: draft.permissions?.databasePage || '' } })}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className="field-hint">Fills the list below. Change whatever you want afterwards.</span>
                </div>

                <div className="field">
                  <span className="field-label">Each part of the app: None, View or Edit</span>
                  <div className="perm-grid">
                    {MODULE_GROUPS.map((g) => (
                      <Fragment key={g}>
                        <div className="perm-group">{g}{g === 'Database' && <small> · the Database page and each project's Project Database</small>}</div>
                        {MODULES.filter((m) => m.group === g).map((m) => (
                          <div key={m.key} className="perm-row">
                            <span>{m.label}{m.hint && <small className="perm-hint">{m.hint}</small>}</span>
                            <div className="segmented small">
                              {LEVELS.map(([v, l]) => (
                                <button key={v} type="button" className={(draft.permissions?.[m.key] || 'none') === v ? 'on' : ''} onClick={() => setDraft({ ...draft, permissions: { ...draft.permissions, [m.key]: v } })}>
                                  {l}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        {/* the Database page in the side menu, with the Database's own permissions (Alex, 10 Oct) */}
                        {g === 'Database' && (
                          <div className="perm-row">
                            <span>Database page in the side menu<small className="perm-hint">without it they still have each project's Project Database</small></span>
                            <div className="segmented small">
                              <button type="button" className={draft.permissions?.databasePage !== 'hide' ? 'on' : ''} onClick={() => setDraft({ ...draft, permissions: { ...draft.permissions, databasePage: '' } })}>Shown</button>
                              <button type="button" className={draft.permissions?.databasePage === 'hide' ? 'on' : ''} onClick={() => setDraft({ ...draft, permissions: { ...draft.permissions, databasePage: 'hide' } })}>Hidden</button>
                            </div>
                          </div>
                        )}
                      </Fragment>
                    ))}
                  </div>
                  <span className="field-hint">Always there for everyone: Notes, Chat, My Finance and Settings. Finance and Invoices: administrators only.</span>
                  <div className="row-actions">
                    <button className="link" onClick={() => setDraft({ ...draft, permissions: { ...defaultPermissions('view'), accessUntil: draft.permissions?.accessUntil || '', databasePage: draft.permissions?.databasePage || '' } })}>
                      All view
                    </button>
                    <button className="link" onClick={() => setDraft({ ...draft, permissions: { ...defaultPermissions('edit'), accessUntil: draft.permissions?.accessUntil || '', databasePage: draft.permissions?.databasePage || '' } })}>
                      All edit
                    </button>
                    <button className="link" onClick={() => setDraft({ ...draft, permissions: { ...defaultPermissions('none'), accessUntil: draft.permissions?.accessUntil || '', databasePage: draft.permissions?.databasePage || '' } })}>
                      Clear
                    </button>
                  </div>
                </div>

              </>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
