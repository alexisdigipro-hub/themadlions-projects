import { Button, Select } from './ui.jsx'

/* The Database toolbar's filter and Add, shared by Locations, Crew, Cast and Equipment. On a computer
   they are the usual select and button; on a phone (Alex, 10 Oct) they are round glass buttons on one
   line with the search: the filter a funnel (a see-through select lies over it, lit while a filter is
   set) and Add a plus. */
const FUNNEL = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z" /></svg>

export function DbFilter({ value, onChange, options, label }) {
  return (
    <span className={`db-filter${value ? ' set' : ''}`} title={label}>
      <span className="db-filter-ico">{FUNNEL}</span>
      <Select value={value} onChange={onChange} options={options} aria-label={label} />
    </span>
  )
}

export function DbAdd({ label, onClick }) {
  return (
    <Button variant="primary" className="db-add" onClick={onClick} aria-label={label} title={label}>
      <span className="db-add-plus" aria-hidden="true">＋</span>
      <span className="db-add-text">{label}</span>
    </Button>
  )
}
