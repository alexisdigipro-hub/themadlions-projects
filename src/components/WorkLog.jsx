import { useMemo, useRef, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from './ui.jsx'
import { today, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { download, fmtDate } from '../lib/dates.js'

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

/* How long an unpaid job has been waiting, counted from the day it was worked. */
export const daysWaiting = (entry, from = today()) => {
  const d = (entry?.date || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return 0
  return Math.max(0, Math.round((Date.parse(from) - Date.parse(d)) / 86400000))
}

/* Three buckets, so the debt that has waited longest is obvious without reading dates. */
export const AGE_BUCKETS = [
  { key: 'fresh', label: 'Up to 30 days' },
  { key: 'warn', label: '31 to 60 days' },
  { key: 'late', label: 'Over 60 days' },
]
export const ageBucket = (days) => (days <= 30 ? 'fresh' : days <= 60 ? 'warn' : 'late')

/* Flip one job between paid and pending. Shared so Team work and My work behave the same. */
export const togglePaidEntry = (update, id) => update((s) => {
  const x = (s.worklog || []).find((y) => y.id === id)
  if (!x) return s
  if (x.status === 'paid') { x.status = 'pending'; x.paidDate = '' }
  else { x.status = 'paid'; x.paidDate = today() }
  return s
})

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
  const list = all.filter((e) => (e.date || '').startsWith(year)).filter((e) => filter === 'all' || (filter === 'paid' ? e.status === 'paid' : e.status !== 'paid'))
  const yearList = all.filter((e) => (e.date || '').startsWith(year))
  const tot = entryTotals(yearList)
  const projects = visibleProjects(state, me)

  const byMonth = useMemo(() => {
    const m = {}
    for (const e of [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''))) {
      const k = (e.date || '').slice(5, 7)
      ;(m[k] = m[k] || []).push(e)
    }
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]))
  }, [list])

  const save = () => {
    if (!draft.client.trim() && !draft.description.trim()) return toast('Add a client or a description.', 'error')
    if (!draft.date) return toast('Pick the date.', 'error')
    const e = { ...draft, amount: Number(draft.amount) || 0, paidDate: draft.status === 'paid' ? draft.paidDate || today() : '' }
    update((s) => {
      s.worklog = s.worklog || []
      const i = s.worklog.findIndex((x) => x.id === e.id)
      if (i >= 0) s.worklog[i] = e
      else s.worklog.push(e)
      return s
    })
    if (!years.includes(e.date.slice(0, 4))) setYear(e.date.slice(0, 4))
    setDraft(null)
  }
  const togglePaid = (e) => togglePaidEntry(update, e.id)
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
    download(`work-${year}.csv`, rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv')
  }

  return (
    <div className="wl">
      {showHero && (
        <div className="wl-hero">
          <div className="wl-card pend"><span className="wl-label">Pending</span><strong>{money2(tot.pending)}</strong><small>{tot.open} job{tot.open === 1 ? '' : 's'} unpaid</small></div>
          <div className="wl-card paid"><span className="wl-label">Paid</span><strong>{money2(tot.paid)}</strong><small>in {year}</small></div>
          <div className="wl-card"><span className="wl-label">Total {year}</span><strong>{money2(tot.total)}</strong><small>{tot.jobs} job{tot.jobs === 1 ? '' : 's'}</small></div>
        </div>
      )}
      <div className="toolbar wl-toolbar">
        <div className="segmented small">
          {[...new Set([thisYear, ...years])].sort().reverse().map((y) => <button key={y} className={year === y ? 'on' : ''} onClick={() => setYear(y)}>{y}</button>)}
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
        <Empty title={yearList.length ? 'Nothing here' : `No jobs in ${year} yet`}>{yearList.length ? 'Try the other filter.' : editable ? 'Add every shoot or job you did: who it was for, what it was, how much, and whether it has been paid.' : 'Nothing logged for this year.'}</Empty>
      ) : (
        <div className="wl-months">
          {byMonth.map(([mm, items]) => {
            const t = entryTotals(items)
            return (
              <section key={mm} className={`wl-month ${compact ? 'compact' : ''}`}>
                <header className="wl-month-head">
                  <h3>{MONTHS_LONG[Number(mm) - 1]}</h3>
                  <span className="wl-month-sums">{t.pending > 0 && <span className="pend">{money2(t.pending)} pending</span>}{t.paid > 0 && <span className="paid">{money2(t.paid)} paid</span>}</span>
                </header>
                <ul className="plain wl-list">
                  {items.map((e) => (
                    <li key={e.id} className={`wl-row ${e.status === 'paid' ? 'is-paid' : 'is-pending'}`}>
                      <button className={`wl-status ${e.status === 'paid' ? 'paid' : 'pend'}`} onClick={() => editable && togglePaid(e)} disabled={!editable} title={editable ? (e.status === 'paid' ? 'Mark as pending' : 'Mark as paid') : ''}>{e.status === 'paid' ? 'Paid' : 'Pending'}</button>
                      <div className="wl-main">
                        <strong>{e.client || <span className="muted">No client</span>}</strong>
                        <span className="wl-desc">{e.description}</span>
                        <span className="wl-meta muted small">{fmtDate(e.date, { day: 'numeric', month: 'short' })}{e.status === 'paid' && e.paidDate ? ` · ${e.method || 'paid'} ${fmtDate(e.paidDate, { day: 'numeric', month: 'short' })}` : ''}{e.notes ? ` · ${e.notes}` : ''}</span>
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
              <Field label="Client / artist"><Input value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} placeholder="Καίτη Γαρμπή" autoFocus /></Field>
              <Field label="Shooting date"><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
            </div>
            <Field label="Description"><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Song title, spot, live, intro…" /></Field>
            <div className="row-2">
              <Field label="Amount (€)"><Input type="number" inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="150" /></Field>
              <Field label="Project (optional)"><Select value={draft.projectId || ''} onChange={(e) => setDraft({ ...draft, projectId: e.target.value })} options={[['', 'Not linked'], ...projects.map((p) => [p.id, p.title])]} /></Field>
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
