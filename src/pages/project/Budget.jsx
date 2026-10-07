import { useEffect, useMemo, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid } from '../../lib/store.jsx'
import { fmtDate } from '../../lib/dates.js'
import { projectWorkDate } from '../../components/WorkLog.jsx'
import { useCurrentUser, useStore } from '../../lib/store.jsx'
import PaymentModal, { BulkPaymentModal } from '../../components/PaymentModal.jsx'
import { lineBalance, lineEstimate, lineTotal, lineVat, linePaid, syncLineWorklog, dropLineWorklog } from '../../lib/budget.js'
import { groupPairs } from '../../lib/budgetCats.js'
import { useDragOrder } from '../../lib/dragOrder.js'

// The categories and their groups live in Settings > Budget (src/lib/budgetCats.js holds the
// standard list and the helpers). The page reads them through groupPairs() below.
// memberId: a team member this line pays; the line is then mirrored into their My work (see
// syncLineWorklog). contactId / locationId: this project's own cast, crew or location (no app
// account, so no My work entry) — picking one just locks vendor to their current name. vendor
// keeps the name so Finance, CSV and print read the same as before, and is still free text when
// none of the three is picked. date: the day the work is done, which is the date My work files
// the job under. estimate: the one amount of the line. qty / unit / rate stay in the data for
// lines made before the form went down to one amount; lineEstimate() still reads them. vatPct:
// optional VAT % on top of the amount, 0 by default so old lines are unaffected.
export const emptyLine = () => ({ id: uid(), category: 'Camera', description: '', qty: 1, unit: 'flat', rate: 0, estimate: '', vatPct: '', actual: '', vendor: '', memberId: '', contactId: '', locationId: '', date: '', notes: '' })
export { lineEstimate }
export const money = (n, cur = 'EUR') => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Number(n) || 0)

// Contingency and currency are gone from the page (Alex: euros only, no contingency), so a
// project's total is simply the sum of its lines, whatever an old project still stores.
export function budgetTotals(project) {
  const b = project.budget || { lines: [] }
  const est = b.lines.reduce((a, l) => a + lineTotal(l), 0)
  const act = b.lines.reduce((a, l) => a + Number(l.actual || 0), 0)
  return { est, act, total: est, lines: b.lines.length }
}

/* The project's Budget (what the client pays) as one card: the amount itself, editable in
   place, and under it how much of it the lines already commit and how much is paid out. */
function BudgetCard({ cap, total, spent, editable, onCap }) {
  const [val, setVal] = useState(cap ? String(cap) : '')
  useEffect(() => { setVal(cap ? String(cap) : '') }, [cap])
  const commit = () => {
    const n = val.trim() === '' ? '' : Number(val)
    if (n !== '' && Number.isNaN(n)) return setVal(cap ? String(cap) : '')
    if (n !== (cap || '')) onCap(n)
  }
  const pct = cap ? Math.min(100, Math.round((total / cap) * 100)) : 0
  const spentPct = cap ? Math.min(100, Math.round((spent / cap) * 100)) : 0
  const over = cap && total > cap
  const tone = !cap ? '' : over ? 'over' : pct >= 90 ? 'warn' : 'ok'
  return (
    <section className={`panel budget-card no-print ${tone}`}>
      <div className="budget-card-row">
        <div className="budget-card-main">
          <span className="budget-card-label">Budget</span>
          {editable ? (
            <label className="budget-card-field">
              <span className="budget-card-cur">€</span>
              <input type="number" min="0" inputMode="decimal" value={val} placeholder="0" onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
            </label>
          ) : (
            <span className="budget-card-amount">{cap ? money(cap) : '—'}</span>
          )}
        </div>
        {cap ? (
          <div className="budget-card-stats">
            <div><span className="budget-card-label">Committed</span><strong>{money(total)}</strong></div>
            <div><span className="budget-card-label">Paid</span><strong>{money(spent)}</strong></div>
            <div><span className="budget-card-label">{over ? 'Over by' : 'Left'}</span><strong className="budget-card-left">{money(Math.abs(cap - total))}</strong></div>
          </div>
        ) : (
          <span className="muted small">Set the amount and you see what the lines commit and what is left.</span>
        )}
      </div>
      {cap ? (
        <div className="budget-card-bar" title={`${pct}% committed${spent ? ` · ${spentPct}% paid` : ''}`}>
          <div className="budget-card-fill" style={{ width: `${pct}%` }} />
          {spent > 0 && <div className="budget-card-spent" style={{ width: `${spentPct}%` }} />}
        </div>
      ) : null}
    </section>
  )
}

export default function Budget() {
  const { project, edit, canEdit } = useProject()
  const { state, update } = useStore()
  const me = useCurrentUser()
  const team = (state.users || []).filter((u) => u.active !== false)
  const teamLabel = (u) => `${u.name}${u.profile?.position ? ` · ${u.profile.position}` : ''}`
  const cast = (project.contacts || []).filter((c) => c.kind === 'cast')
  const crew = (project.contacts || []).filter((c) => c.kind === 'crew')
  const locations = project.locations || []
  const contactLabel = (c) => `${c.name}${c.role ? ` · ${c.role}` : c.character ? ` · ${c.character}` : ''}`
  const locationLabel = (l) => `${l.name}${l.type ? ` · ${l.type}` : ''}`
  const contactKind = (id) => (project.contacts || []).find((c) => c.id === id)?.kind
  const toast = useToast()
  const editable = canEdit('budget')
  const budget = project.budget || { lines: [] }
  const [draft, setDraft] = useState(null)
  const [pay, setPay] = useState(null) // line
  // lines ticked for one payment together; only lines with money still owed can be ticked
  const canPay = me?.role === 'admin' && editable
  const payable = (l) => lineEstimate(l) > 0 && lineBalance(l) > 0
  const [picked, setPicked] = useState([])
  const [bulkPay, setBulkPay] = useState(false)
  const pickedLines = budget.lines.filter((l) => picked.includes(l.id) && payable(l))
  const openIds = budget.lines.filter(payable).map((l) => l.id)
  const allPicked = openIds.length > 0 && openIds.every((id) => picked.includes(id))
  const togglePick = (ids, on) => setPicked((p) => (on ? [...new Set([...p, ...ids])] : p.filter((x) => !ids.includes(x))))
  const cur = 'EUR'
  // groups from Settings, plus an "Unlisted" group for lines whose category was removed there
  const BUDGET_GROUPS = useMemo(() => groupPairs(state.settings, budget.lines), [state.settings, budget.lines])
  const CATEGORIES = BUDGET_GROUPS.flatMap(([, cats]) => cats)

  // Alex wants one table, not a section per group. Until he drags a line the groups still set
  // the order, so crew stays above camera above post the way Settings has them and a line whose
  // category was removed there sits at the end under Unlisted. The first drag saves the order he
  // can see, his move included, and from then on the budget keeps its own order and the groups
  // only name the lines. Nothing is written until he actually drags something.
  const sorted = useMemo(
    () => BUDGET_GROUPS.flatMap(([, cats]) => budget.lines.filter((l) => cats.includes(l.category))),
    [BUDGET_GROUPS, budget.lines],
  )
  const rows = budget.ordered ? budget.lines : sorted
  const byId = useMemo(() => Object.fromEntries(rows.map((l) => [l.id, l])), [rows])
  const { order, dragId, rowRef, bind } = useDragOrder(
    rows.map((l) => l.id),
    (next) => edit((p) => {
      p.budget = p.budget || { lines: [] }
      p.budget.lines = next.map((id) => p.budget.lines.find((l) => l.id === id)).filter(Boolean)
      p.budget.ordered = true
    }),
  )
  const t = budgetTotals(project)

  const save = () => {
    // Alex: crew lines rarely need a description beyond their category, props and gear do. Empty = the category.
    const description = (draft.description || '').trim() || draft.category
    if (!description) return toast('Pick a category or describe the line.', 'error')
    if (budget.cap) {
      const others = budget.lines.filter((l) => l.id !== draft.id).reduce((a, l) => a + lineTotal(l), 0)
      const newTotal = others + lineTotal(draft)
      if (newTotal > Number(budget.cap) && t.total <= Number(budget.cap)) toast(`Careful: this line takes the budget ${money(newTotal - Number(budget.cap), cur)} over the cap.`, 'error')
      else if (newTotal > Number(budget.cap)) toast(`Budget is ${money(newTotal - Number(budget.cap), cur)} over the cap.`, 'error')
    }
    // The whole state, not just the project: a line paid to a team member also writes their My work.
    const who = team.find((u) => u.id === draft.memberId)
    const contact = draft.contactId ? (project.contacts || []).find((c) => c.id === draft.contactId) : null
    const loc = draft.locationId ? locations.find((l) => l.id === draft.locationId) : null
    const line = { ...draft, description, vendor: who ? who.name : contact ? contact.name : loc ? loc.name : draft.vendor }
    update((s) => {
      const p = s.projects.find((x) => x.id === project.id)
      if (!p) return s
      p.budget = p.budget || { lines: [] }
      const i = p.budget.lines.findIndex((l) => l.id === line.id)
      if (i >= 0) p.budget.lines[i] = line
      else p.budget.lines.push(line)
      p.updatedAt = new Date().toISOString()
      syncLineWorklog(s, p, line)
      return s
    })
    setDraft(null)
    toast(who ? `Line saved, and it is now in ${who.name}'s My Finance` : contact || loc ? `Line saved, linked to ${(contact || loc).name}` : 'Line saved', 'ok')
  }
  const remove = (id) => update((s) => {
    const p = s.projects.find((x) => x.id === project.id)
    if (!p?.budget) return s
    p.budget.lines = p.budget.lines.filter((l) => l.id !== id)
    p.updatedAt = new Date().toISOString()
    dropLineWorklog(s, id)
    return s
  })
  const setCap = (v) => edit((p) => {
    p.budget = p.budget || { lines: [] }
    p.budget.cap = v
  })
  return (
    <div className="budget">
      {editable && (
        <div className="toolbar no-print">
          <div className="toolbar-actions">
            <Button variant="primary" onClick={() => setDraft({ ...emptyLine(), category: CATEGORIES.includes('Camera') ? 'Camera' : CATEGORIES[0] || '' })}>Add line</Button>
          </div>
        </div>
      )}

      {(editable || budget.cap) && <BudgetCard cap={Number(budget.cap) || 0} total={t.total} spent={t.act} editable={editable} onCap={setCap} />}

      {!budget.lines.length ? (
        <Empty title="No budget lines yet">Start with the big blocks: crew, camera and lighting packages, locations, post. One amount per line.</Empty>
      ) : (
        <article className="sheet topsheet">
          <header className="sheet-head">
            <div>
              <div className="sheet-brand">{project.producer || 'THEMADLIONS'}</div>
              <h1>{project.title}</h1>
              <div className="muted">Budget top sheet · {project.category}{budget.cap ? ` · client budget ${money(budget.cap, cur)}` : ''}</div>
            </div>
            <div className="sheet-call">
              <div className="sheet-call-label">Total</div>
              <div className="sheet-call-time">{money(t.total, cur)}</div>
              {budget.cap ? (
                <div className={t.total > budget.cap ? 'over' : 'under'}>{t.total > budget.cap ? `${money(t.total - budget.cap, cur)} over cap` : `${money(budget.cap - t.total, cur)} under cap`}</div>
              ) : null}
            </div>
          </header>

          <table className="table budget-table">
            <thead>
              <tr>
                {editable && <th className="grip no-print" />}
                {canPay && <th className="pick no-print">{openIds.length > 0 && <input type="checkbox" checked={allPicked} onChange={(e) => togglePick(openIds, e.target.checked)} aria-label="Select every unpaid line" title="Select every unpaid line" />}</th>}
                <th>Category</th><th>Description</th><th>Name</th><th className="num">Amount</th><th>VAT</th><th className="num">Paid</th><th className="num">Balance</th>{editable && <th className="no-print" />}
              </tr>
            </thead>
            <tbody>
              {order.map((id) => byId[id]).filter(Boolean).map((l) => (
                <tr key={l.id} ref={rowRef(l.id)} className={`${picked.includes(l.id) && payable(l) ? 'picked' : ''}${dragId === l.id ? ' dragging' : ''}`}>
                  {editable && (
                    <td className="grip no-print">
                      <button type="button" className="grip-btn" aria-label={`Move ${l.description || l.category}`} title="Drag to move this line" {...bind(l.id)}>⠿</button>
                    </td>
                  )}
                  {canPay && <td className="pick no-print">{payable(l) && <input type="checkbox" checked={picked.includes(l.id)} onChange={(e) => togglePick([l.id], e.target.checked)} aria-label={`Select ${l.description} to pay`} />}</td>}
                  <td className="muted small budget-cat">{l.category}</td>
                  <td>{l.description}{l.notes && <div className="muted small">{l.notes}</div>}</td>
                  <td>{l.vendor}{l.vendor && (l.memberId ? ' (team)' : l.contactId ? ` (${contactKind(l.contactId) || 'crew'})` : l.locationId ? ' (location)' : '')}</td>
                  <td className="num">{money(lineTotal(l), cur)}</td>
                  <td className="muted small">{Number(l.vatPct) > 0 && <span title={`${money(lineEstimate(l), cur)} + ${l.vatPct}% VAT`}>VAT included</span>}</td>
                  <td className="num">{l.payments?.length ? money(linePaid(l), cur) : l.actual !== '' && l.actual != null && Number(l.actual) ? money(l.actual, cur) : ''}</td>
                  <td className={`num ${l.payments?.length && lineBalance(l) > 0 ? 'over' : ''}`}>{l.payments?.length ? (lineBalance(l) > 0 ? money(lineBalance(l), cur) : <span className="under">settled</span>) : ''}</td>
                  {editable && (
                    <td className="row-actions no-print">
                      {me?.role === 'admin' && lineEstimate(l) > 0 && lineBalance(l) > 0 && <button onClick={() => setPay(l)}>Pay</button>}
                      <button onClick={() => setDraft({ ...l })}>Edit</button>
                      <Confirm onConfirm={() => remove(l.id)} label="Delete">×</Confirm>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <table className="table budget-totals">
            <tbody>
              <tr className="grand"><td>Total</td><td className="num">{money(t.total, cur)}</td><td className="num">{t.act ? <span className={t.act > t.total ? 'over' : 'muted'}>{money(t.act, cur)} paid</span> : ''}</td></tr>
            </tbody>
          </table>
        </article>
      )}

      {canPay && pickedLines.length > 0 && (
        <div className="bulk-bar no-print">
          <span><strong>{pickedLines.length} line{pickedLines.length === 1 ? '' : 's'}</strong> selected · {money(pickedLines.reduce((a, l) => a + lineBalance(l), 0), cur)} to pay{pickedLines.some((l) => Number(l.vatPct) > 0) ? ' before VAT' : ''}</span>
          <span className="bulk-bar-actions">
            <Button variant="ghost" size="sm" onClick={() => setPicked([])}>Clear</Button>
            <Button variant="primary" size="sm" onClick={() => setBulkPay(true)}>Pay selected</Button>
          </span>
        </div>
      )}

      {pay && <PaymentModal project={project} line={budget.lines.find((l) => l.id === pay.id) || pay} onClose={() => setPay(null)} />}
      {bulkPay && <BulkPaymentModal project={project} lines={pickedLines} onClose={() => setBulkPay(false)} onDone={() => setPicked([])} />}
      {draft && (
        <Modal
          open
          wide
          title={budget.lines.some((l) => l.id === draft.id) ? 'Edit budget line' : 'New budget line'}
          onClose={() => setDraft(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="primary" onClick={save}>Save line</Button>
            </>
          }
        >
          <div className="row-2">
            <Field label="Category">
              <select className="input select" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {BUDGET_GROUPS.map(([g, cats]) => (
                  <optgroup key={g} label={g}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
                ))}
                {draft.category && !CATEGORIES.includes(draft.category) && <option value={draft.category}>{draft.category} (unlisted)</option>}
              </select>
            </Field>
            <Field label="Paid to" hint={
              draft.memberId ? 'A team member: this line goes into their My Finance, and turns to paid when you pay it.'
                : draft.contactId ? 'This project\'s own cast/crew: the vendor name follows if you rename them.'
                : draft.locationId ? 'This project\'s own location: the vendor name follows if you rename it.'
                : ''
            }>
              {/* picking a member also takes the project's shooting day as the work date, unless one is set already */}
              <Select
                value={draft.memberId ? `member:${draft.memberId}` : draft.contactId ? `contact:${draft.contactId}` : draft.locationId ? `location:${draft.locationId}` : ''}
                onChange={(e) => {
                  const [kind, id] = e.target.value.split(':')
                  setDraft({
                    ...draft,
                    memberId: kind === 'member' ? id : '',
                    contactId: kind === 'contact' ? id : '',
                    locationId: kind === 'location' ? id : '',
                    date: draft.date || (kind === 'member' ? projectWorkDate(project) : draft.date),
                  })
                }}
              >
                <option value="">Someone outside the team</option>
                <optgroup label="Team">{team.map((u) => <option key={u.id} value={`member:${u.id}`}>{teamLabel(u)}</option>)}</optgroup>
                {!!cast.length && <optgroup label="Cast">{cast.map((c) => <option key={c.id} value={`contact:${c.id}`}>{contactLabel(c)}</option>)}</optgroup>}
                {!!crew.length && <optgroup label="Crew">{crew.map((c) => <option key={c.id} value={`contact:${c.id}`}>{contactLabel(c)}</option>)}</optgroup>}
                {!!locations.length && <optgroup label="Locations">{locations.map((l) => <option key={l.id} value={`location:${l.id}`}>{locationLabel(l)}</option>)}</optgroup>}
              </Select>
            </Field>
          </div>
          {draft.memberId ? (
            <Field label="Work date" hint={`From the project's shooting days. Goes into ${team.find((u) => u.id === draft.memberId)?.name || 'their'} My Finance as "${project.title}${draft.description || draft.category ? ` · ${draft.description || draft.category}` : ''}"${draft.date ? ` on ${fmtDate(draft.date)}` : ', dated today'}.`}><Input type="date" value={draft.date || ''} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
          ) : !draft.contactId && !draft.locationId ? (
            <Field label="Vendor / payee"><Input value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} placeholder="Optional" /></Field>
          ) : null}
          <Field label="Description (optional)" hint={`Leave it empty and the line is called "${draft.category || 'its category'}". Worth writing for props, gear, permits.`}><Input autoFocus value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={draft.category || 'Alexa Mini LF package, rooftop permit'} /></Field>
          {/* One amount per line, Alex's call. An old line made as quantity × rate shows its total here and is saved as that total. VAT is optional, next to it, and folds into the line's total. */}
          <div className="row-2">
            <Field label={`Amount (${cur})`} hint={draft.payments?.length ? `${money(linePaid(draft), cur)} paid so far, ${draft.payments.length} payment${draft.payments.length === 1 ? '' : 's'} recorded in Finance.` : 'What this costs. Payments are recorded from Finance or with Pay on the line.'}>
              <Input type="number" min="0" step="0.01" value={draft.estimate === '' || draft.estimate == null ? (lineEstimate(draft) || '') : draft.estimate} onChange={(e) => setDraft({ ...draft, estimate: e.target.value, qty: 1, unit: 'flat', rate: 0 })} placeholder="800" />
            </Field>
            <Field label="VAT %" hint={Number(draft.vatPct) > 0 ? `${money(lineVat(draft), cur)} VAT, ${money(lineTotal(draft), cur)} total.` : 'Leave empty when there is none.'}>
              <Input type="number" min="0" step="0.5" value={draft.vatPct} onChange={(e) => setDraft({ ...draft, vatPct: e.target.value })} placeholder="24" />
            </Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  )
}
