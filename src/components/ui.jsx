import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../lib/store.jsx'
import { fmtDate, monthGrid, toISODate, weekdayShort } from '../lib/dates.js'

export function Button({ variant = 'default', size = 'md', className = '', ...props }) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props} />
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Input(props) {
  if (props.type === 'date') return <DateInput {...props} />
  return <input className="input" {...props} />
}

/* Every date field in the app (Alex, 11 Oct: the browser's own little calendar, made 2026 and easy).
   On a computer it is our own picker in the Calendar's look: the date written out on the field, and a
   soft panel with a bold month, round arrows, the days as rounded tiles (today ringed, the chosen one
   in the accent), the month or the year a click away on the title, Today and Clear at the foot, and
   the arrow keys to walk the days. A phone keeps its own date wheel, which is already the easy one.
   onChange gets { target: { value } } like a plain input, so every caller works as it was. */
export function DateInput({ type, className = '', ...props }) {
  const mobile = useIsMobile()
  if (mobile) return <input type="date" className={`input ${className}`} {...props} />
  return <DatePick className={className} {...props} />
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ymOf = (iso) => { const [y, m] = (iso || toISODate(new Date())).split('-').map(Number); return { y, m: m - 1 } }
const shiftIso = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return toISODate(new Date(y, m - 1, d + n)) }

function DatePick({ value = '', onChange, disabled, className = '', placeholder = 'Pick a date', title, id, autoFocus, ...rest }) {
  const weekStart = useStore()?.state?.settings?.weekStart
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days') // days | months | years
  const [ym, setYm] = useState(() => ymOf(value))
  const [cursor, setCursor] = useState('')
  const [pos, setPos] = useState(null)
  const btn = useRef(null)
  const pop = useRef(null)
  const today = toISODate(new Date())

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const w = 300
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8))
    const up = window.innerHeight - r.bottom < 380 && r.top > window.innerHeight - r.bottom
    setPos(up ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 })
  }, [])
  const show = () => {
    if (disabled) return
    setYm(ymOf(value))
    setCursor(value || today)
    setView('days')
    place()
    setOpen(true)
  }
  const close = (refocus) => { setOpen(false); if (refocus) btn.current?.focus() }
  const pick = (iso) => { onChange?.({ target: { value: iso }, currentTarget: { value: iso } }); close(true) }

  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!pop.current?.contains(e.target) && !btn.current?.contains(e.target)) close(false) }
    // Escape closes the picker only, not the window it sits in (Modal listens on window)
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true) } }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', key)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])
  // the arrow keys walk the days; the day under the cursor holds the focus
  useEffect(() => {
    if (open && view === 'days') pop.current?.querySelector(`[data-iso="${cursor}"]`)?.focus()
  }, [open, view, cursor, ym])
  const walk = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = shiftIso(cursor || today, step)
    setCursor(next)
    setYm(ymOf(next))
  }

  const step = (n) => {
    if (view === 'days') setYm(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (m + n + 12) % 12 }))
    else setYm(({ y, m }) => ({ y: y + n * (view === 'years' ? 12 : 1), m }))
  }
  const firstYear = ym.y - ((ym.y % 12) + 12) % 12
  const head = view === 'days'
    ? new Date(ym.y, ym.m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : view === 'months' ? String(ym.y) : `${firstYear} – ${firstYear + 11}`
  const sel = value ? ymOf(value) : null
  const now = ymOf(today)

  return (
    <>
      <button
        ref={btn}
        type="button"
        id={id}
        className={`input dp-field${value ? '' : ' dp-none'}${open ? ' open' : ''} ${className}`}
        onClick={() => (open ? close(false) : show())}
        disabled={disabled}
        title={title}
        autoFocus={autoFocus}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={rest['aria-label']}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="4" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
        <span>{value ? fmtDate(value, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : placeholder}</span>
      </button>
      {open && pos && createPortal(
        <div ref={pop} className="dp-pop" style={pos} role="dialog" aria-label="Pick a date">
          <div className="dp-head">
            <button type="button" className="dp-title" onClick={() => setView(view === 'days' ? 'months' : view === 'months' ? 'years' : 'days')} title={view === 'days' ? 'Pick a month' : view === 'months' ? 'Pick a year' : 'Back to the days'}>{head}</button>
            <button type="button" className="dp-arrow" onClick={() => step(-1)} aria-label="Earlier">‹</button>
            <button type="button" className="dp-arrow" onClick={() => step(1)} aria-label="Later">›</button>
          </div>
          {view === 'days' && (
            <>
              <div className="dp-dow">{weekdayShort(weekStart).map((d) => <span key={d}>{d.slice(0, 2)}</span>)}</div>
              <div className="dp-days" onKeyDown={walk}>
                {monthGrid(ym.y, ym.m, weekStart).map((c) => (
                  <button
                    key={c.iso}
                    type="button"
                    data-iso={c.iso}
                    tabIndex={c.iso === cursor ? 0 : -1}
                    className={`dp-day${c.inMonth ? '' : ' out'}${c.weekend ? ' wknd' : ''}${c.iso === today ? ' today' : ''}${c.iso === value ? ' on' : ''}`}
                    onClick={() => pick(c.iso)}
                  >
                    {Number(c.iso.slice(8))}
                  </button>
                ))}
              </div>
            </>
          )}
          {view === 'months' && (
            <div className="dp-grid">
              {MONTHS.map((n, m) => (
                <button key={n} type="button" className={`dp-cell${sel && sel.y === ym.y && sel.m === m ? ' on' : ''}${now.y === ym.y && now.m === m ? ' today' : ''}`} onClick={() => { setYm({ y: ym.y, m }); setView('days') }}>{n}</button>
              ))}
            </div>
          )}
          {view === 'years' && (
            <div className="dp-grid">
              {Array.from({ length: 12 }, (_, i) => firstYear + i).map((y) => (
                <button key={y} type="button" className={`dp-cell${sel && sel.y === y ? ' on' : ''}${now.y === y ? ' today' : ''}`} onClick={() => { setYm({ y, m: ym.m }); setView('months') }}>{y}</button>
              ))}
            </div>
          )}
          <div className="dp-foot">
            <button type="button" className="dp-pill" onClick={() => pick(today)}>Today</button>
            <button type="button" className="dp-pill" onClick={() => pick(shiftIso(today, 1))}>Tomorrow</button>
            {value && <button type="button" className="dp-pill quiet" onClick={() => pick('')}>Clear</button>}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

export function Textarea(props) {
  return <textarea className="input textarea" {...props} />
}

/* A comma-separated list (tags, aliases…) stored as an array. A plain Input whose value is
   `tags.join(', ')`, recomputed from the array on every keystroke, erases the comma the moment
   you type it: "sea view," parses to ["sea view"], which redisplays as "sea view", so the comma
   never sticks. This keeps what you are typing as its own state and only reports the parsed
   array upward; give it `key={record.id}` where you use it, so opening a different record starts
   the text fresh instead of keeping the previous one's. */
export function TagsInput({ value, onChange, ...props }) {
  const [text, setText] = useState((value || []).join(', '))
  return (
    <Input
      {...props}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(e.target.value.split(',').map((x) => x.trim()).filter(Boolean))
      }}
    />
  )
}

export function Select({ options, children, className = '', ...props }) {
  return (
    <select className={`input select ${className}`} {...props}>
      {options
        ? options.map((o) => {
            const [v, l] = Array.isArray(o) ? o : [o, o]
            return (
              <option key={v} value={v}>
                {l}
              </option>
            )
          })
        : children}
    </select>
  )
}

export function Badge({ color, children, className = '' }) {
  return (
    <span className={`badge ${className}`} style={color ? { '--badge': color } : undefined}>
      {children}
    </span>
  )
}

export function Modal({ open, title, onClose, children, footer, wide }) {
  const self = useRef(null)
  useEffect(() => {
    if (!open) return
    // A window opened from inside another (the cover crop inside Edit details): Escape closes
    // only the one on top, and the page stays locked until the last one is gone.
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      const all = document.querySelectorAll('.modal-backdrop')
      if (all.length && all[all.length - 1] !== self.current) return
      onClose?.()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      if (!document.querySelector('.modal-backdrop')) document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  // drawn straight into <body> (Alex, 10 Oct): inside the phone app's scrolling page iOS kept a window
  // under the top bar and the tab bar, so its × and its Save could not be reached
  return createPortal(
    <div ref={self} className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Confirm({ onConfirm, children, label = 'Delete', ...props }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <Button
      variant={armed ? 'danger' : 'ghost'}
      size="sm"
      {...props}
      onClick={() => {
        if (armed) {
          onConfirm()
          setArmed(false)
        } else setArmed(true)
      }}
    >
      {armed ? `Confirm ${label.toLowerCase()}` : children || label}
    </Button>
  )
}

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {})
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((msg, kind = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

export function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  )
}

export function useMedia(query) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const h = () => setM(mq.matches)
    h()
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [query])
  return m
}
export const useIsMobile = () => useMedia('(max-width: 820px)')
