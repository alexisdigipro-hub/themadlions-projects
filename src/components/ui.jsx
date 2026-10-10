import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  return <input className="input" {...props} />
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
