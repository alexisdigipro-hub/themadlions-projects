import { Fragment } from 'react'
import { Modal } from './ui.jsx'

/* The card a person, a place or a thing opens in (Alex, 27 Oct: Contacts' card first, then "every card on the site
   about crew, cast, locations, ID sheets, equipment, in the projects too"): the picture in a ring (a circle for a
   person, a rounded square for a place or a thing) on a soft accent glow, the name large, chips, round quick links,
   then the details as soft rows, the notes, and whatever else the page puts under them (a map, photos, projects).
   The page's own buttons (Edit, Delete…) go in `footer`. */

// one tap to call or write: a Greek number without its country gets +30
export const intl = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.length === 10 && /^[26]/.test(d)) d = '30' + d; return d }
const svg = (d) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
export const QUICK = {
  call: svg(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />),
  wa: svg(<><path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9a5 5 0 0 1-2.3-2.3l.9-1-1-2z" /></>),
  viber: svg(<><path d="M12 3c5 0 8 2.2 8 7.5S17 18 12 18l-3 3v-3.3C5.6 16.8 4 14.3 4 10.5 4 5.2 7 3 12 3z" /><path d="M13 7.5a3 3 0 0 1 3 3M13 5.5a5 5 0 0 1 5 5" /></>),
  mail: svg(<><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>),
  map: svg(<><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>),
  go: svg(<path d="m4 11 16-7-7 16-2-7z" />),
}

/* Call, WhatsApp, Viber and Email for a phone and an email, only what there is; extra links (Map…) after them */
export function QuickLinks({ phone, email, extra = [] }) {
  const n = intl(phone)
  if (!n && !email && !extra.length) return null
  return (
    <span className="ab-quick" onClick={(e) => e.stopPropagation()}>
      {n && <a className="ab-q" href={`tel:+${n}`} title={`Call ${phone}`} aria-label="Call">{QUICK.call}</a>}
      {n && <a className="ab-q" href={`https://wa.me/${n}`} target="_blank" rel="noreferrer" title="WhatsApp" aria-label="WhatsApp">{QUICK.wa}</a>}
      {n && <a className="ab-q" href={`viber://chat?number=%2B${n}`} title="Viber" aria-label="Viber">{QUICK.viber}</a>}
      {email && <a className="ab-q" href={`mailto:${email}`} title={`Email ${email}`} aria-label="Email">{QUICK.mail}</a>}
      {extra.map(([key, href, label]) => <a key={label} className="ab-q" href={href} target="_blank" rel="noreferrer" title={label} aria-label={label}>{QUICK[key]}</a>)}
    </span>
  )
}

const initialsOf = (n) => (n || '').split(/\s+/).map((x) => (x.match(/\p{L}/u) || [])[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

/* rows: [label, value] pairs; an empty value is left out */
export function InfoCard({ open, onClose, footer, photo, glyph, square = false, name, before, tags, quick, rows = [], notes, children, wide = false }) {
  const shown = rows.filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
  return (
    <Modal open={open} title="" className="ab-card" wide={wide} onClose={onClose} footer={footer}>
      {open && (
        <div className="ab-card-body">
          <div className="ab-card-hero">
            <span className={`ab-card-photo${square ? ' square' : ''}`}>{photo ? <img src={photo} alt="" /> : <b>{glyph || initialsOf(name) || '•'}</b>}</span>
            <h2 className="ab-card-name">{before}{name}</h2>
            {tags && <div className="ab-card-tags">{tags}</div>}
            {quick}
          </div>
          {shown.length > 0 && (
            <dl className="ab-card-rows">
              {shown.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
            </dl>
          )}
          {notes && <p className="ab-card-notes">{notes}</p>}
          {children}
        </div>
      )}
    </Modal>
  )
}
