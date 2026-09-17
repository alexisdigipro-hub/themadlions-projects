// Small line icons for navigation. 18px, stroke follows text colour.
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const Icon = {
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
  reports: () => (<svg {...base}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>),
  budget: () => (<svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 6v12M15 9.5c0-1.4-1.3-2.3-3-2.3s-3 .9-3 2.2c0 1.5 1.5 2 3 2.4s3 1 3 2.5-1.3 2.4-3 2.4-3-1-3-2.3" /></svg>),
  gear: () => (<svg {...base}><path d="M4 9h11l3-3 3 3v9a2 2 0 0 1-2 2H4z" /><path d="M4 9V6a2 2 0 0 1 2-2h4v5M8 14h4" /></svg>),
  post: () => (<svg {...base}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 4v5M11 4v5M15 4v5M19 4v5M10 13l5 2.5-5 2.5z" /></svg>),
  notes: () => (<svg {...base}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>),
}
