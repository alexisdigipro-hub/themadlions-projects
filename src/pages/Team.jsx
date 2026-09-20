import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Badge, Button, Confirm, Field, Input, Modal, PageHead, Select, useToast } from '../components/ui.jsx'
import { MODULES, ROLE_PRESETS, accessEnded, defaultPermissions, presetPermissions, uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { initialsOf } from './Profile.jsx'

const LEVELS = [
  ['none', 'No access'],
  ['view', 'View'],
  ['edit', 'Edit'],
]

export default function Team() {
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
    toast(draft.isNew ? 'Teammate added' : 'Permissions saved', 'ok')
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

  return (
    <>
      <PageHead title="Team" sub="Who can see and change what. Administrators can do everything.">
        <Button variant="primary" onClick={() => setDraft(newUser())}>
          Add teammate
        </Button>
      </PageHead>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Projects</th>
            <th>Can edit</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {state.users.map((u) => (
            <tr key={u.id} className={u.active === false ? 'dim' : ''}>
              <td>
                <Link className="team-name" to={u.id === me.id ? '/me' : `/u/${u.id}`}>
                  {u.profile?.thumb ? <img className="team-avatar" src={u.profile.thumb} alt="" /> : <span className="team-avatar initials">{initialsOf(u.name)}</span>}
                  <strong>{u.name}</strong>
                </Link>
                {u.id === me.id && <span className="muted small"> (you)</span>}
              </td>
              <td>{u.email}</td>
              <td>
                <Badge color={u.role === 'admin' ? '#C8503F' : accessEnded(u) ? '#d8564a' : undefined}>
                  {u.active === false ? 'deactivated' : accessEnded(u) ? 'access ended' : u.role}
                </Badge>
              </td>
              <td className="small">{u.role === 'admin' || u.projectAccess === 'all' ? 'All' : `${(u.projectAccess || []).length} selected`}</td>
              <td className="small muted">
                {u.role === 'admin'
                  ? 'Everything'
                  : MODULES.filter((m) => u.permissions?.[m.key] === 'edit')
                      .map((m) => m.label)
                      .join(', ') || 'View only'}
              </td>
              <td className="row-actions">
                <Button size="sm" variant="ghost" onClick={() => setDraft({ ...u, password: '' })}>
                  Edit
                </Button>
                {u.id !== me.id && u.active !== false && u.role !== 'admin' && (
                  <Button size="sm" variant="ghost" onClick={() => { setViewAs(u.id); nav('/home') }}>
                    View as
                  </Button>
                )}
                {u.id !== me.id && u.active === false && (
                  <Confirm
                    label="Remove"
                    onConfirm={() => {
                      update((s) => {
                        s.users = s.users.filter((y) => y.id !== u.id)
                        return s
                      })
                      toast(`${u.name} removed from the team`)
                    }}
                  />
                )}
                {u.id !== me.id && (
                  <Confirm
                    label={u.active === false ? 'Reactivate' : 'Deactivate'}
                    onConfirm={() =>
                      update((s) => {
                        const x = s.users.find((y) => y.id === u.id)
                        x.active = x.active === false
                        return s
                      })
                    }
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {remote && invites.length > 0 && (
        <>
          <h3 className="section-title">Waiting to sign up</h3>
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th /></tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>{i.email}</td>
                  <td><Badge>{i.role}</Badge></td>
                  <td className="row-actions">
                    <Confirm label="Remove" onConfirm={() => removeInvite(i.id).catch((e) => toast(e.message, 'error'))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p className="fineprint">
        {remote
          ? 'Teammates create their own password when they sign up with the email you added here. Permissions take effect the moment they sign in.'
          : 'Local mode accounts live in this browser only; team login across devices arrives with the Supabase backend.'}{' '}
        {admins === 1 && 'You are the only administrator.'}
      </p>

      <Modal
        open={!!draft}
        wide
        title={draft?.isNew ? 'Add teammate' : `Permissions for ${draft?.name}`}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              {draft?.isNew ? 'Add teammate' : 'Save permissions'}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="stack">
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
                <Field label="Project access">
                  <Select value={draft.projectAccess === 'all' ? 'all' : 'some'} onChange={(e) => setDraft({ ...draft, projectAccess: e.target.value === 'all' ? 'all' : [] })} options={[['all', 'All projects'], ['some', 'Only selected projects']]} />
                </Field>
                {draft.projectAccess !== 'all' && (
                  <div className="chips">
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

                <div className="field">
                  <span className="field-label">Start from a role</span>
                  <div className="chips">
                    {ROLE_PRESETS.map(([label, perms]) => (
                      <button key={label} type="button" className="chip" onClick={() => setDraft({ ...draft, permissions: { ...presetPermissions(perms), accessUntil: draft.permissions?.accessUntil || '' } })}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className="field-hint">Fills the list below. Change whatever you want afterwards.</span>
                </div>

                <div className="field">
                  <span className="field-label">What they can do in each module</span>
                  <div className="perm-grid">
                    {MODULES.map((m) => (
                      <div key={m.key} className="perm-row">
                        <span>{m.label}</span>
                        <div className="segmented small">
                          {LEVELS.map(([v, l]) => (
                            <button key={v} type="button" className={(draft.permissions?.[m.key] || 'none') === v ? 'on' : ''} onClick={() => setDraft({ ...draft, permissions: { ...draft.permissions, [m.key]: v } })}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="row-actions">
                    <button className="link" onClick={() => setDraft({ ...draft, permissions: { ...defaultPermissions('view'), accessUntil: draft.permissions?.accessUntil || '' } })}>
                      All view
                    </button>
                    <button className="link" onClick={() => setDraft({ ...draft, permissions: { ...defaultPermissions('edit'), accessUntil: draft.permissions?.accessUntil || '' } })}>
                      All edit
                    </button>
                    <button className="link" onClick={() => setDraft({ ...draft, permissions: { ...defaultPermissions('none'), accessUntil: draft.permissions?.accessUntil || '' } })}>
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
