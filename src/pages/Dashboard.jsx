import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useIsMobile, useToast } from '../components/ui.jsx'
import { CATEGORIES, STATUSES, can, emptyProject, nextProjectCode, today, unavailableOn, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { fmtDate } from '../lib/dates.js'
import { projectProgress } from '../lib/progress.js'
import { useCover } from '../components/CoverCropper.jsx'
import { allHideable, hiddenAfterCategory, projectTabs, tabHidden, toggleTab } from '../lib/tabs.js'
import { initialsOf } from './Profile.jsx'
import { joinName, nameParts } from '../lib/projectName.js'
import { duplicateProject } from '../lib/duplicate.js'

/* The row of tab chips: on = shown, struck through = hidden, Overview fixed. Used by the project
   form and by the strip on the Overview, so switching a tab on is one tap either way. */
export function TabPicker({ project, onChange }) {
  // onChange gets the fields to store: { hiddenTabs } or, for an opt-in tab such as Chat, { shownTabs }
  return (
    <div className="tab-pick">
      {projectTabs(project).map((t) => {
        const on = !tabHidden(project, t.to)
        return (
          <button key={t.to} type="button" className={`chip ${on ? 'on' : ''}`} disabled={t.fixed} aria-pressed={on} onClick={() => onChange(toggleTab(project, t.to))}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

const COLORS = ['#C8503F', '#D9A441', '#5B9E7A', '#6C9BD1', '#B07FD1', '#E08A5A', '#4FB3BF', '#9AA0A6']

// On a computer the two parts stack, centred (styles.css); a phone still reads "Artist - Title" in one run.
function CardName({ p }) {
  const { artist, shortTitle } = nameParts(p)
  if (!artist) return <span className="pc-name">{shortTitle}</span>
  return <><span className="pc-artist">{artist}</span><span className="pc-sep"> - </span><span className="pc-name">{shortTitle}</span></>
}

export function ProjectForm({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  const cover = useCover({ value, projectId: value.id, keepSource: !value.isNew, onChange: (patch) => onChange({ ...value, ...patch }) })
  // a category switch can bring new tabs (Music, Script…); they start hidden, like everything else
  const setCategory = (e) => onChange({ ...value, category: e.target.value, hiddenTabs: hiddenAfterCategory(value, e.target.value) })
  const parts = nameParts(value)
  const setPart = (k) => (e) => {
    const next = { ...parts, [k]: e.target.value }
    onChange({ ...value, ...next, title: joinName(next.artist, next.shortTitle) })
  }
  return (
    <div className="stack">
      <div className="row-2">
        <Field label="Artist / Client">
          <Input value={parts.artist} onChange={setPart('artist')} autoFocus placeholder="Γιάννης Φακίνος" />
        </Field>
        <Field label="Title">
          <Input value={parts.shortTitle} onChange={setPart('shortTitle')} placeholder="Ματάρες μου" />
        </Field>
      </div>
      <div className="row-2">
        <Field label="Category">
          <Select value={value.category} onChange={setCategory} options={CATEGORIES} />
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
      <Field label="Cover image" hint="Key art or a still, cut to a square: drag it into place, scale it, centre it. Adjust changes the cut later.">
        <div className="cover-pick">
          {value.coverThumb && <img src={value.coverThumb} alt="" />}
          <input type="file" accept="image/*" className="input" onChange={(e) => { cover.pick(e.target.files?.[0]); e.target.value = '' }} />
          {value.coverThumb && (
            <span className="cover-links">
              <button type="button" className="link small" onClick={cover.adjust}>Adjust</button>
              <button type="button" className="link small" onClick={cover.remove}>Remove</button>
            </span>
          )}
        </div>
        {cover.modal}
      </Field>
      <Field label="Tabs" hint="A new project starts with Overview alone. Tap the tabs it needs; tap again to hide one. Nothing is deleted, a hidden tab keeps its data.">
        <TabPicker project={value} onChange={(patch) => onChange({ ...value, ...patch })} />
      </Field>
      <div className="field">
        <span className="field-label">Colour</span>
        <div className="swatches color-swatches">
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

/* The date a project stands for: its Start date when one is set, otherwise its first shoot day,
   otherwise the day it was created. Sorting by the Start date alone sent every project without
   one to the bottom of the grid in a heap, which is what Alex saw as the order going wrong. */
export const projectDate = (p) =>
  p.startDate
  || (p.shootingDays || []).map((d) => d.date).filter(Boolean).sort()[0]
  || (p.createdAt || '').slice(0, 10)

/* Home's two orders. Date: newest first, ties broken by the last change so the order does not
   flicker. Name: A to Z, Greek and Latin each in their own alphabet, accents ignored, numbers
   read as numbers so "Part 2" comes before "Part 10". */
export const SORTS = {
  date: (a, b) => projectDate(b).localeCompare(projectDate(a)) || (b.updatedAt || '').localeCompare(a.updatedAt || ''),
  name: (a, b) => (a.title || '').localeCompare(b.title || '', ['el', 'en'], { sensitivity: 'base', numeric: true }),
}

export default function Dashboard() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [filter, setFilter] = useState('All')
  const [q, setQ] = useState('')
  // Sort by Date or Name (Alex), remembered per device like the other view choices.
  const [sort, setSort] = useState(() => { try { return localStorage.getItem('tml_home_sort') || 'date' } catch { return 'date' } })
  const pickSort = (v) => { setSort(v); try { localStorage.setItem('tml_home_sort', v) } catch { /* private window */ } }
  const canEdit = can(user, 'projects', 'edit')
  // Sort by is on the computer only (Alex, 8 Oct, took it off the phone): a phone always
  // shows Date, whatever the computer last picked.
  const mobile = useIsMobile()

  // Who's around today: moved here from the old Home page, right above the project list. Alex
  // uses the calendar day-picker (the global Calendar in the sidebar) to see another day's roster.
  const t0 = today()
  const team = (state.users || []).filter((u) => u.active !== false)
  const away = unavailableOn(state.events, t0)
  const stripRef = useRef(null)
  const [allFaces, setAllFaces] = useState(false)
  const [facesHidden, setFacesHidden] = useState(false)
  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const check = () => setFacesHidden(el.scrollHeight - el.clientHeight > 4)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [team.length, allFaces])

  // a new project: the workspace defaults, and every tab but Overview switched off (Alex's call)
  const freshProject = () => {
    const base = { ...emptyProject(), title: '', artist: '', shortTitle: '', category: state.settings?.defaultCategory || 'Music Video', budget: { lines: [], contingencyPct: Number(state.settings?.budgetContingency ?? 10), currency: state.settings?.budgetCurrency || 'EUR', cap: '' }, isNew: true }
    return { ...base, hiddenTabs: allHideable(base) }
  }

  const projects = visibleProjects(state, user)
    .filter((p) => filter === 'All' || p.category === filter)
    .filter((p) => !q || [p.title, p.client, p.code].some((v) => (v || '').toLowerCase().includes(q.toLowerCase())))
    .sort((!mobile && SORTS[sort]) || SORTS.date)
  // Delivered projects leave the main grid (Alex): a "Delivered" chip at the end of the category
  // row, in the inverse colour of the others, shows them alone, grey until hovered.
  const [showDelivered, setShowDelivered] = useState(false)
  const active = projects.filter((p) => p.status !== 'Delivered')
  const closed = projects.filter((p) => p.status === 'Delivered')
  const shown = showDelivered ? closed : active
  const liveAll = state.projects.filter((p) => p.status !== 'Delivered')

  const [duping, setDuping] = useState('')
  const duplicate = async (p) => {
    setDuping(p.id)
    try {
      const { project, shared } = await duplicateProject(p)
      update((s) => {
        project.code = nextProjectCode(s)
        s.projects.push(project)
        return s
      })
      toast(shared ? `Copied as "${project.title}". ${shared} file${shared === 1 ? '' : 's'} could not be copied and stay shared with the original.` : `Copied as "${project.title}"`, shared ? 'error' : 'ok')
    } catch (e) {
      toast(`Could not duplicate: ${e.message}`, 'error')
    } finally {
      setDuping('')
    }
  }

  const save = () => {
    if (!draft.title.trim()) return toast('Give the project a title.', 'error')
    update((s) => {
      const i = s.projects.findIndex((p) => p.id === draft.id)
      if (i >= 0) s.projects[i] = { ...s.projects[i], ...draft, updatedAt: new Date().toISOString() }
      else s.projects.push(emptyProject({ ...draft, code: draft.code || nextProjectCode(s) }))
      return s
    })
    toast(draft.isNew ? 'Project created' : 'Project saved', 'ok')
    setDraft(null)
  }

  const card = (p, grey) => (
    <Link key={p.id} to={`/p/${p.id}`} className={`project-card ${grey ? 'grey' : ''}`} style={{ '--pc': p.color }}>
      <div className={`project-cover ${p.coverThumb ? 'has-img' : ''}`}>
        {p.coverThumb ? <img src={p.coverThumb} alt="" /> : <span className="slate-bar" />}
        <span className="project-cat">{p.category}</span>
      </div>
      <div className="project-progress" title={`${projectProgress(p, state.settings).pct}% done`}><span style={{ width: `${projectProgress(p, state.settings).pct}%` }} /></div>
      <div className="project-body">
        <h3 title={p.title}><CardName p={p} /></h3>
        <div className="project-meta">
          <Badge>{p.status}</Badge>
          {p.code && <span className="project-code">{p.code}</span>}
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
          <button className="link" disabled={!!duping} onClick={() => duplicate(p)}>
            {duping === p.id ? 'Copying…' : 'Duplicate'}
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
  )

  return (
    <>
      {team.length > 0 && (
        <section className="panel team-strip-panel">
          <div className="team-strip-head muted small">
            {(facesHidden || allFaces) && (
              <button className="link small team-strip-more" onClick={() => setAllFaces((v) => !v)}>
                {allFaces ? 'Show less' : `Show all ${team.length}`}
              </button>
            )}
          </div>
          <div className={`team-strip ${allFaces ? 'all' : ''}`} ref={stripRef}>
            {team.map((u) => {
              const off = away.has(u.id)
              return (
                <Link
                  key={u.id}
                  to={u.id === user?.id ? '/me' : `/u/${u.id}`}
                  className={`team-chip ${off ? 'off' : ''}`}
                  title={`${u.name}${u.profile?.position ? ` · ${u.profile.position}` : ''}${off ? ' · not available' : ''}`}
                >
                  <span className="team-chip-photo">
                    {(u.profile?.photo || u.profile?.thumb) ? <img src={u.profile.photo || u.profile.thumb} alt="" /> : <span className="team-chip-initials">{initialsOf(u.name)}</span>}
                    {off && <span className="team-chip-off" aria-hidden="true">✕</span>}
                  </span>
                  <span className="team-chip-name">{(u.name || '').split(' ')[0]}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <div className="toolbar home-toolbar">
        <div className="chips">
          {['All', ...CATEGORIES].map((c) => (
            <button key={c} className={`chip ${filter === c ? 'on' : ''}`} onClick={() => setFilter(c)}>
              {c}
              <small>{(showDelivered ? state.projects.filter((p) => p.status === 'Delivered') : liveAll).filter((p) => c === 'All' || p.category === c).length}</small>
            </button>
          ))}
          <button className={`chip neg ${showDelivered ? 'on' : ''}`} onClick={() => setShowDelivered((v) => !v)} aria-pressed={showDelivered} title="Delivered projects">
            Delivered
            <small>{state.projects.filter((p) => p.status === 'Delivered').length}</small>
          </button>
        </div>
        <div className="toolbar-actions">
          {!mobile && (
            <span className="sort-by">
              <span className="muted small">Sort by</span>
              <span className="segmented small">
                <button className={sort === 'date' ? 'on' : ''} onClick={() => pickSort('date')}>Date</button>
                <button className={sort === 'name' ? 'on' : ''} onClick={() => pickSort('name')}>Name</button>
              </span>
            </span>
          )}
          <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="input search" />
          {canEdit && (
            <Button variant="primary" onClick={() => setDraft(freshProject())}>
              New project
            </Button>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty
          title={showDelivered ? 'No delivered projects here' : state.projects.length ? 'Nothing matches' : 'No projects yet'}
          action={canEdit && !state.projects.length && <Button variant="primary" onClick={() => setDraft(freshProject())}>Create the first project</Button>}
        >
          {showDelivered ? 'A project moves here when its status is set to Delivered.' : state.projects.length ? 'Try another category or search term.' : 'A project holds the script, breakdown, schedule, call sheets, locations and people.'}
        </Empty>
      ) : (
        <div className="project-grid">{shown.map((p) => card(p, showDelivered))}</div>
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
