import { useSyncExternalStore } from 'react'

// Small line icons for navigation. 18px, stroke follows text colour. Five sets to pick from in
// Settings > Display (Alex, 8 Oct), kept per device: Classic (these), Thin and Bold (the same
// drawings, a lighter or heavier line, set in styles.css by html[data-icons]), Rounded (a second,
// softer drawing of each, below) and Duotone (Rounded with its main shape tinted).
const base = { className: 'ico', width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const soft = { ...base, strokeWidth: 1.9 }
const dot = { fill: 'currentColor', stroke: 'none' }

const CLASSIC = {
  home: () => (<svg {...base}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>),
  projects: () => (
    <svg {...base}><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M7 6l2-3h6l2 3M8 14l2 2 2-2 2 2 2-2" /></svg>
  ),
  calendar: () => (
    <svg {...base}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M8 14h3M13 14h3M8 18h3" /></svg>
  ),
  tasks: () => (
    <svg {...base}><path d="M4 6.5l1.6 1.5L9 4.8M4 12.5l1.6 1.5L9 10.8M4 18.5l1.6 1.5L9 16.8M12 6h8M12 12h8M12 18h8" /></svg>
  ),
  people: () => (
    <svg {...base}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.5c3 0 5 1.8 5.5 5" /></svg>
  ),
  locations: () => (
    <svg {...base}><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
  ),
  database: () => (<svg {...base}><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /><path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>),
  mywork: () => (<svg {...base}><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 10h18M8 5V3M16 5V3M7 14h4M7 17h7" /></svg>),
  drives: () => (<svg {...base}><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><circle cx="7" cy="7.5" r="1" fill="currentColor" stroke="none" /><circle cx="7" cy="16.5" r="1" fill="currentColor" stroke="none" /></svg>),
  office: () => (<svg {...base}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 15h6M9 18h4" /></svg>),
  more: () => (<svg {...base}><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg>),
  chat: () => (<svg {...base}><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12.5h5" /></svg>),
  finance: () => (
    <svg {...base}><path d="M3 17l5-5 4 4 5-6 4 3" /><path d="M3 21h18M3 3v18" /></svg>
  ),
  team: () => (
    <svg {...base}><circle cx="12" cy="7.5" r="3.5" /><path d="M5 20c.6-4 3.4-6 7-6s6.4 2 7 6" /><path d="M17.5 4.5l1 1 2-2" /></svg>
  ),
  settings: () => (
    <svg {...base}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
  ),
  overview: () => (<svg {...base}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></svg>),
  music: () => (<svg {...base}><path d="M9 18V6l11-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>),
  script: () => (<svg {...base}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h6M9 16h6M9 8h3" /></svg>),
  breakdown: () => (<svg {...base}><path d="M4 5h16M4 12h16M4 19h16" /><rect x="6" y="3" width="3" height="4" rx=".8" fill="currentColor" stroke="none" /><rect x="11" y="10" width="3" height="4" rx=".8" fill="currentColor" stroke="none" /><rect x="16" y="17" width="3" height="4" rx=".8" fill="currentColor" stroke="none" /></svg>),
  shots: () => (<svg {...base}><rect x="3" y="7" width="13" height="10" rx="2" /><path d="M16 11l5-3v8l-5-3z" /><circle cx="9.5" cy="12" r="2.5" /></svg>),
  schedule: () => (<svg {...base}><rect x="3" y="5" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="15" width="18" height="4" rx="1" /><path d="M7 5v14" /></svg>),
  callsheets: () => (<svg {...base}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v2h6V3M8 10h8M8 14h8M8 18h5" /></svg>),
  budget: () => (<svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 6v12M15 9.5c0-1.4-1.3-2.3-3-2.3s-3 .9-3 2.2c0 1.5 1.5 2 3 2.4s3 1 3 2.5-1.3 2.4-3 2.4-3-1-3-2.3" /></svg>),
  gear: () => (<svg {...base}><path d="M4 9h11l3-3 3 3v9a2 2 0 0 1-2 2H4z" /><path d="M4 9V6a2 2 0 0 1 2-2h4v5M8 14h4" /></svg>),
  idcard: () => (<svg {...base}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16c.6-1.5 1.8-2.3 3.2-2.3s2.6.8 3.2 2.3M14.5 10h4M14.5 13.5h3" /></svg>),
  post: () => (<svg {...base}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 4v5M11 4v5M15 4v5M19 4v5M10 13l5 2.5-5 2.5z" /></svg>),
  notes: () => (<svg {...base}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>),
  deck: () => (<svg {...base}><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M12 16v4M8 20h8M7 8h5M7 11h3M14 8h3v4h-3z" /></svg>),
}

/* Rounded: each icon drawn again, rounder and simpler. className "duo" marks the shape Duotone tints. */
const ROUNDED = {
  home: () => (<svg {...soft}><path d="M3 10.5 12 3l9 7.5" /><path className="duo" d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></svg>),
  projects: () => (<svg {...soft}><path className="duo" d="M4 11h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M4 11 3.4 8.2a2 2 0 0 1 1.4-2.4l12.5-3.3a2 2 0 0 1 2.4 1.4l.6 2.3L4 11" /><path d="m8.6 4.9 3 3.7M13.6 3.6l3 3.7" /></svg>),
  calendar: () => (<svg {...soft}><rect className="duo" x="3" y="4.5" width="18" height="16.5" rx="3" /><path d="M3 10h18M8 2.5v4M16 2.5v4" /><circle cx="8" cy="14.5" r="1.1" {...dot} /><circle cx="12" cy="14.5" r="1.1" {...dot} /><circle cx="16" cy="14.5" r="1.1" {...dot} /><circle cx="8" cy="18" r="1.1" {...dot} /><circle cx="12" cy="18" r="1.1" {...dot} /></svg>),
  tasks: () => (<svg {...soft}><rect className="duo" x="3" y="3" width="18" height="18" rx="5" /><path d="m7.5 12.2 3 3 6-6.4" /></svg>),
  people: () => (<svg {...soft}><circle className="duo" cx="9" cy="7.5" r="4" /><path d="M2 21v-1.5A4.5 4.5 0 0 1 6.5 15h5a4.5 4.5 0 0 1 4.5 4.5V21" /><path d="M16 3.3a4 4 0 0 1 0 8.4M22 21v-1.5a4.5 4.5 0 0 0-3.2-4.3" /></svg>),
  locations: () => (<svg {...soft}><path className="duo" d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>),
  database: () => (<svg {...soft}><ellipse className="duo" cx="12" cy="5" rx="8.5" ry="3" /><path d="M3.5 5v14c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3V5" /><path d="M3.5 12c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3" /></svg>),
  mywork: () => (<svg {...soft}><rect className="duo" x="2.5" y="7" width="19" height="14" rx="3" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2.5 13h19" /></svg>),
  drives: () => (<svg {...soft}><path className="duo" d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" /><path d="M2 12h20" /><circle cx="6.5" cy="16" r="1" {...dot} /><circle cx="10" cy="16" r="1" {...dot} /></svg>),
  office: () => (<svg {...soft}><path className="duo" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" /><path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h8" /></svg>),
  more: () => (<svg {...soft}><circle cx="5" cy="12" r="1.9" {...dot} /><circle cx="12" cy="12" r="1.9" {...dot} /><circle cx="19" cy="12" r="1.9" {...dot} /></svg>),
  chat: () => (<svg {...soft}><path className="duo" d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5z" /><circle cx="8" cy="12" r="1" {...dot} /><circle cx="12" cy="12" r="1" {...dot} /><circle cx="16" cy="12" r="1" {...dot} /></svg>),
  finance: () => (<svg {...soft}><rect className="duo" x="2.5" y="3" width="19" height="18" rx="4" /><path d="m6.5 15 3.5-3.5 3 3 4.5-5" /><path d="M14.5 9.5h3v3" /></svg>),
  team: () => (<svg {...soft}><circle className="duo" cx="10" cy="7.5" r="4" /><path d="M3 21v-1.5A4.5 4.5 0 0 1 7.5 15h5a4.5 4.5 0 0 1 3.2 1.3" /><path d="m16 18.5 2 2 4-4" /></svg>),
  settings: () => (<svg {...soft}><path d="M20 7h-9M14 17H4" /><circle className="duo" cx="17" cy="17" r="3" /><circle className="duo" cx="7" cy="7" r="3" /></svg>),
  overview: () => (<svg {...soft}><rect className="duo" x="3" y="3" width="7.5" height="9" rx="2" /><rect x="13.5" y="3" width="7.5" height="5" rx="2" /><rect className="duo" x="13.5" y="11" width="7.5" height="10" rx="2" /><rect x="3" y="15" width="7.5" height="6" rx="2" /></svg>),
  music: () => (<svg {...soft}><path d="M9 18V5.5l12-2.5v13" /><circle className="duo" cx="6" cy="18" r="3" /><circle className="duo" cx="18" cy="16" r="3" /></svg>),
  script: () => (<svg {...soft}><path className="duo" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" /><path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h5M8 9h2" /></svg>),
  breakdown: () => (<svg {...soft}><path className="duo" d="M12.8 2.2a2 2 0 0 0-1.6 0L2.6 6.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9a1 1 0 0 0 0-1.8z" /><path d="m2 12.5 9.2 4.2a2 2 0 0 0 1.6 0l9.2-4.2M2 17.5l9.2 4.2a2 2 0 0 0 1.6 0l9.2-4.2" /></svg>),
  shots: () => (<svg {...soft}><rect className="duo" x="2" y="6" width="14" height="12" rx="3" /><path d="m16 10.5 4.7-3a.8.8 0 0 1 1.3.7v7.6a.8.8 0 0 1-1.3.7l-4.7-3" /></svg>),
  schedule: () => (<svg {...soft}><rect className="duo" x="3" y="3" width="18" height="18" rx="4" /><path d="M7.5 8h6M10 12h6.5M7.5 16h5" /></svg>),
  callsheets: () => (<svg {...soft}><path className="duo" d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1.2" /><path d="M12 11h4M12 16h4" /><circle cx="8.5" cy="11" r="1" {...dot} /><circle cx="8.5" cy="16" r="1" {...dot} /></svg>),
  budget: () => (<svg {...soft}><path className="duo" d="M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h12v4M3 4v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2" /><path d="M21 12h-4a2 2 0 0 0 0 4h4z" /></svg>),
  gear: () => (<svg {...soft}><path className="duo" d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></svg>),
  idcard: () => (<svg {...soft}><rect className="duo" x="2.5" y="4.5" width="19" height="15" rx="3.5" /><circle cx="8.8" cy="10.8" r="2.3" /><path d="M5.5 16.2c.6-1.6 1.9-2.4 3.3-2.4s2.7.8 3.3 2.4M14.5 10h4M14.5 13.8h3" /></svg>),
  post: () => (<svg {...soft}><rect className="duo" x="2" y="3" width="20" height="18" rx="3" /><path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5" /></svg>),
  notes: () => (<svg {...soft}><path className="duo" d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z" /><path d="M15 3v4a2 2 0 0 0 2 2h4M7 13h7M7 17h4" /></svg>),
  deck: () => (<svg {...soft}><path d="M2 3h20" /><path className="duo" d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m7 21 5-5 5 5" /></svg>),
}

/* Pictogram (Alex, 27 Oct: "drawings, not colour, a bit easier to tell apart"): a third drawing of each, bolder and
   simpler, one solid detail in most so each reads at a glance in one colour. */
const pict = { ...base, strokeWidth: 2.1 }
const PICTO = {
  home: () => (<svg {...pict}><path d="M3.5 11 12 4l8.5 7" /><path d="M6 9.5V20h12V9.5" /><rect x="10.3" y="14" width="3.4" height="6" rx=".6" {...dot} /></svg>),
  projects: () => (<svg {...pict}><rect x="3" y="9" width="18" height="11" rx="2" /><path d="M3.4 9 3 5.8l16.6-2.3.4 3.2z" /><path d="m8 5.1 2.3 3.3M13.5 4.4l2.3 3.3" /></svg>),
  calendar: () => (<svg {...pict}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><rect x="7" y="13" width="4" height="4" rx="1" {...dot} /></svg>),
  tasks: () => (<svg {...pict}><path d="m4 7 2 2 3.5-3.5M4 15.5l2 2 3.5-3.5M13 7.5h7M13 16h7" /></svg>),
  people: () => (<svg {...pict}><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="9.5" r="2.5" /><path d="M16.8 14.5a5 5 0 0 1 4.2 5" /></svg>),
  locations: () => (<svg {...pict}><path d="M12 21.5s7-6.2 7-11.5a7 7 0 0 0-14 0c0 5.3 7 11.5 7 11.5z" /><circle cx="12" cy="10" r="2.6" {...dot} /></svg>),
  database: () => (<svg {...pict}><ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" /></svg>),
  mywork: () => (<svg {...pict}><rect x="3" y="7.5" width="18" height="12.5" rx="2.5" /><path d="M8.5 7.5v-2A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5v2M3 13h18" /><rect x="10.5" y="11.5" width="3" height="3" rx=".8" {...dot} /></svg>),
  drives: () => (<svg {...pict}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 13h18" /><circle cx="7" cy="16" r="1.2" {...dot} /><circle cx="10.5" cy="16" r="1.2" {...dot} /></svg>),
  office: () => (<svg {...pict}><path d="M6 3h8.5L19 7.5V21H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></svg>),
  more: () => (<svg {...pict}><circle cx="5" cy="12" r="2" {...dot} /><circle cx="12" cy="12" r="2" {...dot} /><circle cx="19" cy="12" r="2" {...dot} /></svg>),
  chat: () => (<svg {...pict}><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.2A8 8 0 1 1 20 12z" /><circle cx="8.5" cy="12" r="1.1" {...dot} /><circle cx="12" cy="12" r="1.1" {...dot} /><circle cx="15.5" cy="12" r="1.1" {...dot} /></svg>),
  finance: () => (<svg {...pict}><path d="M3.5 20.5h17" /><rect x="5" y="12" width="3" height="5.5" rx="1" /><rect x="10.5" y="8" width="3" height="9.5" rx="1" /><rect x="16" y="4" width="3" height="13.5" rx="1" {...dot} /></svg>),
  team: () => (<svg {...pict}><circle cx="11" cy="8" r="3.5" /><path d="M4 20a7 7 0 0 1 11-5.7" /><path d="m15.5 18 2 2 4-4" /></svg>),
  settings: () => (<svg {...pict}><path d="M4 7h8.5M19 7h1M4 17h1.5M12.5 17H20" /><circle cx="15.5" cy="7" r="2.5" /><circle cx="9" cy="17" r="2.5" /></svg>),
  overview: () => (<svg {...pict}><rect x="3.5" y="3.5" width="7" height="7" rx="2" {...dot} /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>),
  music: () => (<svg {...pict}><path d="M9 18V6l11-2.5V16" /><circle cx="6.5" cy="18" r="2.6" {...dot} /><circle cx="17.5" cy="16" r="2.6" {...dot} /></svg>),
  script: () => (<svg {...pict}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9.5 8h5M10 11.5h4M8.5 15h7M10 18h4" /></svg>),
  breakdown: () => (<svg {...pict}><path d="M12 3 3 7.5l9 4.5 9-4.5z" /><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" /></svg>),
  shots: () => (<svg {...pict}><rect x="2.5" y="7" width="13" height="10" rx="2.5" /><path d="m15.5 10.5 6-3v9l-6-3" /><circle cx="6.5" cy="10.5" r="1.2" {...dot} /></svg>),
  schedule: () => (<svg {...pict}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 9.3h18M3 14.7h18M8 4v16" /></svg>),
  callsheets: () => (<svg {...pict}><rect x="5" y="4.5" width="14" height="16.5" rx="2.5" /><rect x="9" y="2.5" width="6" height="4" rx="1.2" {...dot} /><path d="M8.5 11h7M8.5 14.8h7M8.5 18.3h4" /></svg>),
  budget: () => (<svg {...pict}><circle cx="12" cy="12" r="8.5" /><path d="M15 8.7a4 4 0 1 0 0 6.6M7.5 11h5.5M7.5 13.5h5.5" /></svg>),
  gear: () => (<svg {...pict}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>),
  idcard: () => (<svg {...pict}><rect x="2.5" y="5" width="19" height="14" rx="3" /><circle cx="8.5" cy="10.8" r="2.3" /><path d="M5.5 16.3a3.2 3.2 0 0 1 6 0M14.5 10h4.5M14.5 14h3" /></svg>),
  post: () => (<svg {...pict}><rect x="3" y="3.5" width="18" height="17" rx="2.5" /><path d="M7.5 3.5v17M16.5 3.5v17M3 8h4.5M3 12h4.5M3 16h4.5M16.5 8H21M16.5 12H21M16.5 16H21" /></svg>),
  notes: () => (<svg {...pict}><path d="M4 4h16v10l-6 6H4z" /><path d="M14 20v-6h6M8 9h8M8 12.5h4" /></svg>),
  deck: () => (<svg {...pict}><path d="M3 4h18" /><path d="M4.5 4v10a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V4" /><path d="M12 15.5V19M8.5 21l3.5-2.5 3.5 2.5M9 11.5v-2M12 11.5V7.5M15 11.5v-3" /></svg>),
}

export const ICON_SETS = [
  ['classic', 'Classic'],
  ['thin', 'Thin'],
  ['bold', 'Bold'],
  ['rounded', 'Rounded'],
  ['duo', 'Duotone'],
  // monochrome looks easier to tell apart (Alex, 27 Oct: keep Rounded of the five tried, more as drawings, not colour);
  // the five coloured ones (Liquid glass, Neon, App tiles, Gradient, Sharp) were taken out the same day
  ['roundbold', 'Rounded bold'], // Rounded, a heavier line
  ['large', 'Rounded large'], // Rounded, drawn bigger
  ['ring', 'Rings'], // Rounded, each in a fine circle, filled softly when chosen
  ['picto', 'Pictogram'], // a third drawing, bolder and simpler, one solid detail each
]
const ROUNDED_SETS = new Set(['rounded', 'duo', 'roundbold', 'large', 'ring'])
const RETIRED = { glass: 'rounded', neon: 'rounded', tile: 'rounded', gradient: 'rounded', sharp: 'rounded' }
const ICON_KEY = 'tml_icons'
const read = () => { try { const v0 = localStorage.getItem(ICON_KEY); const v = RETIRED[v0] || v0; return ICON_SETS.some(([k]) => k === v) ? v : 'classic' } catch { return 'classic' } }
let current = typeof window === 'undefined' ? 'classic' : read()
const subs = new Set()

/* Sets the icons for the whole app and remembers it. Called at start-up and from Settings. */
export function applyIconSet(id) {
  id = RETIRED[id] || id
  current = ICON_SETS.some(([k]) => k === id) ? id : 'classic'
  try { localStorage.setItem(ICON_KEY, current) } catch {}
  document.documentElement.dataset.icons = current
  subs.forEach((f) => f())
  return current
}
const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
const useIconSet = () => useSyncExternalStore(subscribe, () => current, () => current)
const drawingFor = (set, k) => (set === 'picto' && PICTO[k]) || (ROUNDED_SETS.has(set) && ROUNDED[k]) || CLASSIC[k]

function SetIcon({ k }) {
  const set = useIconSet()
  const draw = drawingFor(set, k)
  return draw ? draw() : null
}

/* A few icons in one set, whatever the app's own, for the picker in Settings. */
export function IconPreview({ set, keys }) {
  return <span className="icon-preview" data-icons-preview={set}>{keys.map((k) => <span key={k}>{drawingFor(set, k)?.()}</span>)}</span>
}

export const Icon = Object.fromEntries(Object.keys(CLASSIC).map((k) => [k, () => <SetIcon k={k} />]))
