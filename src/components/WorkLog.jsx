import { useMemo, useRef, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from './ui.jsx'
import { can, today, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { download, fmtDate } from '../lib/dates.js'
import { remote, supabase } from '../lib/supabase.js'
import { budgetLineFromJob, findMemberLine, lineEstimate, linePaid, lineBalance, syncLineWorklog } from '../lib/budget.js'
import { budgetCategories } from '../lib/budgetCats.js'
import PaymentModal from './PaymentModal.jsx'

export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const money2 = (n, cur = 'EUR') => new Intl.NumberFormat('el-GR', { style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
export const emptyEntry = (userId) => ({ id: uid(), userId, date: today(), client: '', description: '', amount: '', status: 'pending', paidDate: '', method: 'Cash', notes: '', projectId: '', createdAt: new Date().toISOString() })
const METHODS = ['Cash', 'Bank transfer', 'Invoice', 'Other']

export function entryTotals(list) {
  const paid = list.filter((e) => e.status === 'paid').reduce((a, e) => a + (Number(e.amount) || 0), 0)
  const pending = list.filter((e) => e.status !== 'paid').reduce((a, e) => a + (Number(e.amount) || 0), 0)
  return { paid, pending, total: paid + pending, jobs: list.length, open: list.filter((e) => e.status !== 'paid').length }
}
export const yearsOf = (list) => [...new Set(list.map((e) => (e.date || '').slice(0, 4)).filter(Boolean))].sort().reverse()

/* One person's totals broken down by year, newest first: for Team work's per-person detail. */
export const entryTotalsByYear = (list) => yearsOf(list).map((year) => ({ year, ...entryTotals(list.filter((e) => (e.date || '').startsWith(year))) }))

/* The client (or, lacking one, the description) this person has billed the most, all statuses,
   all years: Team work's per-person stats. null when there is nothing to rank. */
export function topClientOf(list) {
  const byClient = {}
  for (const e of list) {
    const k = e.client || e.description || 'No client'
    byClient[k] = (byClient[k] || 0) + (Number(e.amount) || 0)
  }
  const sorted = Object.entries(byClient).sort((a, b) => b[1] - a[1])
  return sorted.length ? { name: sorted[0][0], amount: sorted[0][1] } : null
}

/* How long an unpaid job has been waiting, counted from the day it was worked. */
export const daysWaiting = (entry, from = today()) => {
  const d = (entry?.date || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return 0
  return Math.max(0, Math.round((Date.parse(from) - Date.parse(d)) / 86400000))
}

/* Average days between the day a job was worked and the day it was marked paid, over jobs that
   have both a date and a paid date. null when nothing qualifies yet (Team work's per-person stats). */
export function avgDaysToPay(list) {
  const lags = list.filter((e) => e.status === 'paid' && e.date && e.paidDate).map((e) => daysWaiting(e, e.paidDate)).filter((d) => d >= 0)
  return lags.length ? Math.round(lags.reduce((a, d) => a + d, 0) / lags.length) : null
}

/* Three buckets, so the debt that has waited longest is obvious without reading dates. */
export const AGE_BUCKETS = [
  { key: 'fresh', label: 'Up to 30 days' },
  { key: 'warn', label: '31 to 60 days' },
  { key: 'late', label: 'Over 60 days' },
]
export const ageBucket = (days) => (days <= 30 ? 'fresh' : days <= 60 ? 'warn' : 'late')

/* The shooting day a job most likely belongs to: the latest day already shot, else the first one
   coming, else the project's start date. Days are YYYY-MM-DD, so plain string order works. */
export function projectWorkDate(p, from = today()) {
  const days = (p?.shootingDays || []).map((d) => d.date).filter(Boolean).sort()
  const past = days.filter((d) => d <= from)
  return past[past.length - 1] || days[0] || p?.startDate || ''
}

/* Choosing a project in the job form fills the client, the description and the date from it.
   Only fields that are empty, or still hold what the previous project filled in, are touched:
   what the person typed by hand stays. Clearing the project keeps everything as it is. */
export function fillFromProject(draft, projects, projectId) {
  const prev = projects.find((p) => p.id === draft.projectId)
  const next = projects.find((p) => p.id === projectId)
  const out = { ...draft, projectId }
  if (!next) return out
  const free = (val, was) => !val || (prev && val === was)
  const prevClient = prev ? prev.client || prev.title : ''
  if (free(draft.client, prevClient)) out.client = next.client || next.title
  if (free(draft.description, prev?.title)) out.description = next.title
  const prevDate = prev ? projectWorkDate(prev) : ''
  if (!draft.date || draft.date === today() || (prev && draft.date === prevDate)) out.date = projectWorkDate(next) || draft.date
  return out
}

/* Flip one job between paid and pending. Shared so Team work and My work behave the same. */
export const togglePaidEntry = (update, id) => update((s) => {
  const x = (s.worklog || []).find((y) => y.id === id)
  if (!x) return s
  // a job that comes from a project budget is paid by recording the payment (Finance or the
  // budget's Pay), never by hand: one entry, and Finance, the budget and My work agree
  if (x.budgetLineId) return s
  if (x.status === 'paid') { x.status = 'pending'; x.paidDate = '' }
  else { x.status = 'paid'; x.paidDate = today() }
  return s
})
/* The project and budget line a job is tied to, for the Pay dialog. */
export const lineOfJob = (state, job) => {
  if (!job?.budgetLineId) return null
  const project = (state.projects || []).find((p) => p.id === job.projectId) || (state.projects || []).find((p) => (p.budget?.lines || []).some((l) => l.id === job.budgetLineId))
  const line = project?.budget?.lines?.find((l) => l.id === job.budgetLineId)
  return project && line ? { project, line } : null
}

/* Table of one person's jobs for one year, grouped by month. editable = may add / edit / delete. */
export function WorkLogTable({ userId, editable, showHero = true, compact = false }) {
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const all = useMemo(() => (state.worklog || []).filter((e) => e.userId === userId), [state.worklog, userId])
  const years = yearsOf(all)
  const thisYear = String(new Date().getFullYear())
  const [year, setYear] = useState(years.includes(thisYear) || !years.length ? thisYear : years[0])
  const [draft, setDraft] = useState(null)
  const [filter, setFilter] = useState('all')
  const fileRef = useRef(null)
  // 'all' is All time (Alex): every year together, the cards adding them all up
  const allTime = year === 'all'
  const yearText = allTime ? 'all time' : year
  const inSel = (e) => allTime || (e.date || '').startsWith(year)
  const list = all.filter(inSel).filter((e) => filter === 'all' || (filter === 'paid' ? e.status === 'paid' : e.status !== 'paid'))
  const yearList = all.filter(inSel)
  const tot = entryTotals(yearList)
  const projects = visibleProjects(state, me)

  const byMonth = useMemo(() => {
    const m = {}
    for (const e of [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''))) {
      const k = (e.date || '').slice(0, 7) // year and month, so All time keeps Octobers of different years apart
      ;(m[k] = m[k] || []).push(e)
    }
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]))
  }, [list])

  const save = () => {
    if (!draft.client.trim() && !draft.description.trim()) return toast('Add a client or a description.', 'error')
    if (!draft.date) return toast('Pick the date.', 'error')
    const e = { ...draft, amount: Number(draft.amount) || 0, paidDate: draft.status === 'paid' ? draft.paidDate || today() : '' }
    // No double entries (Alex): if the production already pays this person on the project, the
    // fee is already a job in this list (the budget line keeps it). A second job on the same
    // project is refused; a job that arrives before the line's own job is tied to the line instead.
    let tieTo = null
    if (e.projectId && !e.budgetLineId) {
      const project = state.projects.find((p) => p.id === e.projectId)
      const l = project ? findMemberLine(project, userId) : null
      if (l) {
        const twin = (state.worklog || []).find((x) => x.budgetLineId === l.id && x.id !== e.id)
        if (twin) return toast(`This project already pays you ${money2(lineEstimate(l))} from its budget, and that job is in your list${twin.description ? ` ("${twin.description}")` : ''}. Edit that one instead of adding a second.`, 'error')
        tieTo = { project, line: l }
        e.budgetLineId = l.id
      }
    }
    update((s) => {
      s.worklog = s.worklog || []
      const i = s.worklog.findIndex((x) => x.id === e.id)
      if (i >= 0) s.worklog[i] = e
      else s.worklog.push(e)
      if (tieTo) { const p = s.projects.find((x) => x.id === tieTo.project.id); const l = p?.budget?.lines?.find((x) => x.id === tieTo.line.id); if (p && l) syncLineWorklog(s, p, l) }
      return s
    })
    if (tieTo) toast(`Tied to the fee the production entered in the ${tieTo.project.title} budget.`, 'ok')
    if (!allTime && !years.includes(e.date.slice(0, 4))) setYear(e.date.slice(0, 4))
    setDraft(null)
    claimBudget(e)
  }
  /* A job on a project puts the person's fee into that project's budget, unless the production
     already entered a line paying them. Someone with Budget = edit writes the project directly;
     anyone else goes through claim_budget_line(), which can add one line for themself and
     nothing more. The job is then linked to the line, so a payment turns it to paid. */
  const owner = state.users.find((u) => u.id === userId) || me
  const claimBudget = async (job) => {
    if (!job.projectId || job.budgetLineId || !(Number(job.amount) > 0)) return
    const project = state.projects.find((p) => p.id === job.projectId)
    if (!project) return
    if (findMemberLine(project, job.userId)) return
    const line = budgetLineFromJob(job, owner, budgetCategories(state.settings))
    const link = (lineId) => update((s) => { const x = (s.worklog || []).find((y) => y.id === job.id); if (x) x.budgetLineId = lineId; return s })
    const direct = !remote || can(me, 'budget', 'edit')
    if (direct) {
      update((s) => {
        const p = s.projects.find((x) => x.id === job.projectId)
        if (!p) return s
        p.budget = p.budget || { lines: [], contingencyPct: 10, currency: 'EUR' }
        if (!findMemberLine(p, job.userId)) { p.budget.lines.push(line); p.updatedAt = new Date().toISOString() }
        const x = (s.worklog || []).find((y) => y.id === job.id)
        if (x) x.budgetLineId = line.id
        return s
      })
      toast(`Added to the ${project.title} budget`, 'ok')
      return
    }
    if (job.userId !== me?.id) return // an administrator editing someone else's job took the direct path above
    const { data, error } = await supabase.rpc('claim_budget_line', { p_project: job.projectId, p_line: line })
    if (error) {
      toast(error.code === 'PGRST202' || error.code === '42883' ? 'The production has to run supabase/worklog_budget.sql before a job can reach the budget.' : error.message, 'error')
      return
    }
    if (data) { link(data); toast(`Added to the ${project.title} budget`, 'ok') }
  }
  const [pay, setPay] = useState(null) // { project, line } for a job that comes from a budget
  // A budget-tied job is settled by recording the payment: administrators get the Pay dialog
  // here; the member sees the status change when the production records it.
  const togglePaid = (e) => {
    if (!e.budgetLineId) return togglePaidEntry(update, e.id)
    if (e.status === 'paid') return toast('Settled from Finance. To reopen it, delete the payment there.', 'error')
    const tied = lineOfJob(state, e)
    if (me?.role === 'admin' && tied) setPay(tied)
    else toast('This fee is paid by the production: it turns to Paid when they record the payment.', 'error')
  }
  const remove = (id) => update((s) => { s.worklog = (s.worklog || []).filter((x) => x.id !== id); return s })
  const importCsv = async (file) => {
    if (!file) return
    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length < 2) return toast('The file looks empty.', 'error')
    const head = rows[0].map((h) => h.trim().toLowerCase())
    const col = (...names) => head.findIndex((h) => names.includes(h))
    const iStatus = col('status', 'progress'), iClient = col('client'), iDesc = col('description'), iPend = col('pending', 'payment'), iPaid = col('paid', 'payed'), iAmt = col('amount'), iDate = col('date', 'shooting date'), iPaidOn = col('paid on'), iMethod = col('method'), iNotes = col('notes', 'σημειώσεις')
    if (iClient < 0 && iDesc < 0) return toast('Need at least a Client or Description column.', 'error')
    const num = (v) => Number(String(v || '').replace(/[€\s]/g, '').replace(/\.(?=\d{3}(,|$))/g, '').replace(',', '.')) || 0
    const iso = (v) => {
      v = String(v || '').trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
      const m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/)
      if (!m) return ''
      const y = m[3].length === 2 ? `20${m[3]}` : m[3]
      return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }
    const entries = []
    for (const r of rows.slice(1)) {
      const client = (r[iClient] || '').trim(), description = (r[iDesc] || '').trim()
      if (!client && !description) continue
      const paidAmt = iPaid >= 0 ? num(r[iPaid]) : 0, pendAmt = iPend >= 0 ? num(r[iPend]) : 0
      const statusText = (r[iStatus] || '').trim().toLowerCase()
      const paid = statusText === 'paid' || statusText === 'payed' || (!statusText && paidAmt > 0)
      const amount = iAmt >= 0 ? num(r[iAmt]) : paid ? paidAmt : pendAmt || paidAmt
      const date = iso(r[iDate]) || today()
      entries.push({ ...emptyEntry(userId), client, description, amount, status: paid ? 'paid' : 'pending', date, paidDate: paid ? iso(r[iPaidOn]) || date : '', method: (r[iMethod] || '').trim() || (paid ? 'Cash' : ''), notes: (r[iNotes] || '').trim() })
    }
    if (!entries.length) return toast('No rows found.', 'error')
    update((s) => { s.worklog = [...(s.worklog || []), ...entries]; return s })
    toast(`Imported ${entries.length} job${entries.length === 1 ? '' : 's'}`, 'ok')
    if (fileRef.current) fileRef.current.value = ''
  }
  const exportCsv = () => {
    const rows = [['Status', 'Client', 'Description', 'Pending', 'Paid', 'Date', 'Paid on', 'Method', 'Notes']]
    ;[...yearList].sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach((e) => rows.push([e.status === 'paid' ? 'Paid' : 'Pending', e.client, e.description, e.status === 'paid' ? '' : e.amount, e.status === 'paid' ? e.amount : '', e.date, e.paidDate, e.method, e.notes]))
    download(`work-${allTime ? 'all-time' : year}.csv`, rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv')
  }

  return (
    <div className="wl">
      {pay && <PaymentModal project={pay.project} line={pay.line} onClose={() => setPay(null)} />}
      {showHero && (
        <div className="wl-hero">
          <div className="wl-card pend"><span className="wl-label">Pending</span><strong>{money2(tot.pending)}</strong><small>{tot.open} job{tot.open === 1 ? '' : 's'} unpaid</small></div>
          <div className="wl-card paid"><span className="wl-label">Paid</span><strong>{money2(tot.paid)}</strong><small>{allTime ? 'all time' : `in ${year}`}</small></div>
          <div className="wl-card"><span className="wl-label">Total {yearText}</span><strong>{money2(tot.total)}</strong><small>{tot.jobs} job{tot.jobs === 1 ? '' : 's'}</small></div>
        </div>
      )}
      <div className="toolbar wl-toolbar">
        <div className="segmented small">
          {[...new Set([thisYear, ...years])].sort().reverse().map((y) => <button key={y} className={year === y ? 'on' : ''} onClick={() => setYear(y)}>{y}</button>)}
          <button className={allTime ? 'on' : ''} onClick={() => setYear('all')}>All time</button>
        </div>
        <div className="toolbar-actions">
          <div className="segmented small">
            {[['all', 'All'], ['pending', 'Pending'], ['paid', 'Paid']].map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}
          </div>
          {yearList.length > 0 && <Button variant="ghost" onClick={exportCsv}>CSV</Button>}
          {editable && <><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => importCsv(e.target.files?.[0])} /><Button variant="ghost" onClick={() => fileRef.current?.click()} title="Columns: Status, Client, Description, Pending, Paid (or Amount), Date, Paid on, Method, Notes">Import CSV</Button></>}
          {editable && <Button variant="primary" onClick={() => setDraft(emptyEntry(userId))}>Add job</Button>}
        </div>
      </div>

      {!list.length ? (
        <Empty title={yearList.length ? 'Nothing here' : allTime ? 'No jobs yet' : `No jobs in ${year} yet`}>{yearList.length ? 'Try the other filter.' : editable ? 'Add every shoot or job you did: who it was for, what it was, how much, and whether it has been paid.' : allTime ? 'Nothing logged yet.' : 'Nothing logged for this year.'}</Empty>
      ) : (
        <div className="wl-months">
          {byMonth.map(([mm, items]) => {
            const t = entryTotals(items)
            return (
              <section key={mm} className={`wl-month ${compact ? 'compact' : ''}`}>
                <header className="wl-month-head">
                  <h3>{MONTHS_LONG[Number(mm.slice(5, 7)) - 1]}{allTime || mm.slice(0, 4) !== year ? ` ${mm.slice(0, 4)}` : ''}</h3>
                  <span className="wl-month-sums">{t.pending > 0 && <span className="pend">{money2(t.pending)} pending</span>}{t.paid > 0 && <span className="paid">{money2(t.paid)} paid</span>}</span>
                </header>
                <ul className="plain wl-list">
                  {items.map((e) => (
                    <li key={e.id} className={`wl-row ${e.status === 'paid' ? 'is-paid' : 'is-pending'}`}>
                      <button className={`wl-status ${e.status === 'paid' ? 'paid' : 'pend'}`} onClick={() => editable && togglePaid(e)} disabled={!editable} title={!editable ? '' : e.budgetLineId ? (e.status === 'paid' ? 'Settled from Finance' : me?.role === 'admin' ? 'Record the payment' : 'Paid by the production when they record the payment') : e.status === 'paid' ? 'Mark as pending' : 'Mark as paid'}>{e.status === 'paid' ? 'Paid' : 'Pending'}</button>
                      <div className="wl-main">
                        <strong>{e.client || <span className="muted">No client</span>}</strong>
                        <span className="wl-desc">{e.description}</span>
                        <span className="wl-meta muted small">{fmtDate(e.date, { day: 'numeric', month: 'short' })}{e.status === 'paid' && e.paidDate ? ` · ${e.method || 'paid'} ${fmtDate(e.paidDate, { day: 'numeric', month: 'short' })}` : ''}{e.notes ? ` · ${e.notes}` : ''}{e.budgetLineId ? ' · from the project budget' : ''}</span>
                      </div>
                      <div className={`wl-amount ${e.status === 'paid' ? 'paid' : 'pend'}`}>{money2(e.amount)}</div>
                      {editable && <div className="wl-actions"><button className="link small" onClick={() => setDraft({ ...e })}>Edit</button><Confirm onConfirm={() => remove(e.id)} label="Delete">×</Confirm></div>}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <Modal open={!!draft} title={all.some((x) => x.id === draft?.id) ? 'Edit job' : 'Add job'} onClose={() => setDraft(null)} footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {draft && (
          <div className="stack">
            <div className="row-2">
              <Field label="Project (optional)" hint={(() => {
                const p = draft.projectId ? state.projects.find((x) => x.id === draft.projectId) : null
                const l = p ? findMemberLine(p, userId) : null
                if (l && draft.budgetLineId === l.id) return 'This job is the fee the production entered in the budget.'
                if (l) return `Your fee on this project is already in its budget: ${money2(lineEstimate(l))}${linePaid(l) ? `, ${money2(linePaid(l))} paid` : ''}${lineBalance(l) === 0 && linePaid(l) ? ', settled' : ''}. This job will not be added again.`
                if (p) return 'Saving puts this amount into the project budget as your fee.'
                return 'Pick one and the client, the description and the shooting date fill in from it.'
              })()}>
                <Select value={draft.projectId || ''} onChange={(e) => setDraft(fillFromProject(draft, projects, e.target.value))} options={[['', 'Not linked'], ...projects.map((p) => [p.id, p.title])]} autoFocus />
              </Field>
              <Field label="Client / artist"><Input value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} placeholder="Καίτη Γαρμπή" /></Field>
            </div>
            <Field label="Description"><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Song title, spot, live, intro…" /></Field>
            <div className="row-2">
              <Field label="Shooting date"><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
              <Field label="Amount (€)"><Input type="number" inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="150" /></Field>
            </div>
            <div className="row-2">
              <Field label="Status"><Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} options={[['pending', 'Pending'], ['paid', 'Paid']]} /></Field>
              {draft.status === 'paid' ? (
                <Field label="Paid on"><Input type="date" value={draft.paidDate || today()} onChange={(e) => setDraft({ ...draft, paidDate: e.target.value })} /></Field>
              ) : <div />}
            </div>
            {draft.status === 'paid' && <Field label="How"><Select value={draft.method || 'Cash'} onChange={(e) => setDraft({ ...draft, method: e.target.value })} options={METHODS} /></Field>}
            <Field label="Notes"><Textarea rows={2} value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Petrol, van, invoice number…" /></Field>
          </div>
        )}
      </Modal>
    </div>
  )
}

function parseCsv(text) {
  const rows = []
  let row = [], cell = '', q = false
  const t = text.replace(/^\ufeff/, '')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++ } else q = false }
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',' || c === ';') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}
