import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { CATEGORIES, STATUSES, can, emptyProject, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { fmtDate } from '../lib/dates.js'

const COLORS = ['#C8503F', '#D9A441', '#5B9E7A', '#6C9BD1', '#B07FD1', '#E08A5A', '#4FB3BF', '#9AA0A6']

export function ProjectForm({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="stack">
      <Field label="Title">
        <Input value={value.title} onChange={set('title')} autoFocus />
      </Field>
      <div className="row-2">
        <Field label="Category">
          <Select value={value.category} onChange={set('category')} options={CATEGORIES} />
        </Field>
        <Field label="Status">
          <Select value={value.status} onChange={set('status')} options={STATUSES} />
        </Field>
      </div>
      <div className="row-2">
        <Field label="Client / label">
          <Input value={value.client} onChange={set('client')} placeholder="Optional" />
        </Field>
        <Field label="Director">
          <Input value={value.director} onChange={set('director')} />
        </Field>
      </div>
      <div className="row-2">
        <Field label="Start">
          <Input type="date" value={value.startDate} onChange={set('startDate')} />
        </Field>
        <Field label="Delivery">
          <Input type="date" value={value.endDate} onChange={set('endDate')} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea rows={3} value={value.notes} onChange={set('notes')} />
      </Field>
      <div className="field">
        <span className="field-label">Colour</span>
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch ${value.color === c ? 'on' : ''}`}
              style={{ background: c }}
              onClick={() => onChange({ ...value, color: c })}
              aria-label={c}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [filter, setFilter] = useState('All')
  const [q, setQ] = useState('')
  const canEdit = can(user, 'projects', 'edit')

  const projects = visibleProjects(state, user)
    .filter((p) => filter === 'All' || p.category === filter)
    .filter((p) => !q || p.title.toLowerCase().includes(q.toLowerCase()) || (p.client || '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))

  const save = () => {
    if (!draft.title.trim()) return toast('Give the project a title.', 'error')
    update((s) => {
      const i = s.projects.findIndex((p) => p.id === draft.id)
      if (i >= 0) s.projects[i] = { ...s.projects[i], ...draft, updatedAt: new Date().toISOString() }
      else s.projects.push(emptyProject(draft))
      return s
    })
    toast(draft.isNew ? 'Project created' : 'Project saved', 'ok')
    setDraft(null)
  }

  return (
    <>
      <PageHead title="Projects" sub={`${projects.length} of ${visibleProjects(state, user).length} shown`}>
        <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="input search" />
        {canEdit && (
          <Button variant="primary" onClick={() => setDraft({ ...emptyProject(), isNew: true })}>
            New project
          </Button>
        )}
      </PageHead>

      <div className="chips">
        {['All', ...CATEGORIES].map((c) => (
          <button key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>
            {c}
            <small>{c === 'All' ? state.projects.length : state.projects.filter((p) => p.category === c).length}</small>
          </button>
        ))}
      </div>

      {projects.length === 0 ? (
        <Empty
          title={state.projects.length ? 'Nothing matches' : 'No projects yet'}
          action={canEdit && !state.projects.length && <Button variant="primary" onClick={() => setDraft({ ...emptyProject(), isNew: true })}>Create the first project</Button>}
        >
          {state.projects.length ? 'Try another category or search term.' : 'A project holds the script, breakdown, schedule, call sheets, locations and people.'}
        </Empty>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <Link key={p.id} to={`/p/${p.id}`} className="project-card" style={{ '--pc': p.color }}>
              <div className="project-cover">
                <span className="slate-bar" />
                <span className="project-cat">{p.category}</span>
              </div>
              <div className="project-body">
                <h3>{p.title}</h3>
                <div className="project-meta">
                  <Badge>{p.status}</Badge>
                  {p.client && <span>{p.client}</span>}
                </div>
                <div className="project-foot">
                  <span>{p.scenes.length} scenes</span>
                  <span>{p.shootingDays.length} shoot days</span>
                  {p.startDate && <span>{fmtDate(p.startDate)}</span>}
                </div>
              </div>
              {canEdit && (
                <div className="project-tools" onClick={(e) => e.preventDefault()}>
                  <button className="link" onClick={() => setDraft({ ...p })}>
                    Edit
                  </button>
                  <Confirm
                    onConfirm={() => {
                      update((s) => {
                        s.projects = s.projects.filter((x) => x.id !== p.id)
                        s.events = s.events.filter((e) => e.projectId !== p.id)
                        return s
                      })
                      toast('Project deleted')
                    }}
                  />
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={!!draft}
        title={draft?.isNew ? 'New project' : 'Edit project'}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              {draft?.isNew ? 'Create project' : 'Save changes'}
            </Button>
          </>
        }
      >
        {draft && <ProjectForm value={draft} onChange={setDraft} />}
      </Modal>
    </>
  )
}
