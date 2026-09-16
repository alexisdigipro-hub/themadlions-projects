import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Badge, Button, Confirm, Field, Input, Modal, PageHead, Select, useToast } from '../components/ui.jsx'
import { MODULES, defaultPermissions, uid, useCurrentUser, useStore } from '../lib/store.jsx'

const LEVELS = [
  ['none', 'No access'],
  ['view', 'View'],
  ['edit', 'Edit'],
]

export default function Team() {
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const [draft, setDraft] = useState(null)

  if (me?.role !== 'admin') return <Navigate to="/" replace />

  const save = () => {
    const em = draft.email.trim().toLowerCase()
    if (!draft.name.trim() || !em) return toast('Name and email are required.', 'error')
    if (state.users.some((u) => u.email === em && u.id !== draft.id)) return toast('That email is already in the team.', 'error')
    if (draft.isNew && draft.password.length < 4) return toast('Give them a temporary password of at least 4 characters.', 'error')
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
    permissions: { ...defaultPermissions('view'), projects: 'view' },
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
                <strong>{u.name}</strong>
                {u.id === me.id && <span className="muted small"> (you)</span>}
              </td>
              <td>{u.email}</td>
              <td>
                <Badge color={u.role === 'admin' ? '#C8503F' : undefined}>{u.active === false ? 'deactivated' : u.role}</Badge>
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
      <p className="fineprint">
        Phase 1 accounts live in this browser only; give teammates their login when the Supabase backend is connected. {admins === 1 && 'You are the only administrator.'}
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
              <Field label={draft.isNew ? 'Temporary password' : 'New password (leave blank to keep)'}>
                <Input type="text" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
              </Field>
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
                    <button className="link" onClick={() => setDraft({ ...draft, permissions: defaultPermissions('view') })}>
                      All view
                    </button>
                    <button className="link" onClick={() => setDraft({ ...draft, permissions: defaultPermissions('edit') })}>
                      All edit
                    </button>
                    <button className="link" onClick={() => setDraft({ ...draft, permissions: defaultPermissions('none') })}>
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
