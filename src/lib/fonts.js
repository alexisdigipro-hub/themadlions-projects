// The app's typeface, chosen in Settings > Display and kept per device (localStorage, like the
// theme). Every family here covers Greek, so a mixed Greek and English call sheet reads as one
// face. Sofia Sans is the one the page already loads; any other is fetched from Google Fonts the
// moment it is picked, with display=swap so text never waits for it.
export const FONTS = [
  { id: 'sofia', label: 'Sofia Sans', family: "'Sofia Sans'", google: '' },
  { id: 'inter', label: 'Inter', family: "'Inter'", google: 'Inter:wght@400;500;600;700' },
  { id: 'roboto', label: 'Roboto', family: "'Roboto'", google: 'Roboto:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'opensans', label: 'Open Sans', family: "'Open Sans'", google: 'Open+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'notosans', label: 'Noto Sans', family: "'Noto Sans'", google: 'Noto+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'sourcesans', label: 'Source Sans 3', family: "'Source Sans 3'", google: 'Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'plexsans', label: 'IBM Plex Sans', family: "'IBM Plex Sans'", google: 'IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'firasans', label: 'Fira Sans', family: "'Fira Sans'", google: 'Fira+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'ubuntu', label: 'Ubuntu', family: "'Ubuntu'", google: 'Ubuntu:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'manrope', label: 'Manrope', family: "'Manrope'", google: 'Manrope:wght@400;500;600;700' },
  { id: 'nunito', label: 'Nunito', family: "'Nunito'", google: 'Nunito:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'commissioner', label: 'Commissioner', family: "'Commissioner'", google: 'Commissioner:wght@400;500;600;700' },
  { id: 'alegreyasans', label: 'Alegreya Sans', family: "'Alegreya Sans'", google: 'Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'exo2', label: 'Exo 2', family: "'Exo 2'", google: 'Exo+2:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'rubik', label: 'Rubik', family: "'Rubik'", google: 'Rubik:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'arimo', label: 'Arimo', family: "'Arimo'", google: 'Arimo:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  // ten more with Greek (Alex, 8 Oct)
  { id: 'intertight', label: 'Inter Tight', family: "'Inter Tight'", google: 'Inter+Tight:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'robotocond', label: 'Roboto Condensed', family: "'Roboto Condensed'", google: 'Roboto+Condensed:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'ubuntusans', label: 'Ubuntu Sans', family: "'Ubuntu Sans'", google: 'Ubuntu+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'didact', label: 'Didact Gothic', family: "'Didact Gothic'", google: 'Didact+Gothic' },
  { id: 'comfortaa', label: 'Comfortaa', family: "'Comfortaa'", google: 'Comfortaa:wght@400;500;600;700' },
  { id: 'advent', label: 'Advent Pro', family: "'Advent Pro'", google: 'Advent+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { id: 'neohellenic', label: 'GFS Neohellenic', family: "'GFS Neohellenic'", google: 'GFS+Neohellenic:ital,wght@0,400;0,700;1,400' },
  { id: 'ebgaramond', label: 'EB Garamond', family: "'EB Garamond'", google: 'EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400', serif: true },
  { id: 'gfsdidot', label: 'GFS Didot', family: "'GFS Didot'", google: 'GFS+Didot', serif: true },
  { id: 'alegreya', label: 'Alegreya', family: "'Alegreya'", google: 'Alegreya:ital,wght@0,400;0,500;0,600;0,700;1,400', serif: true },
  { id: 'robotoslab', label: 'Roboto Slab', family: "'Roboto Slab'", google: 'Roboto+Slab:wght@400;500;600;700', serif: true },
  { id: 'literata', label: 'Literata', family: "'Literata'", google: 'Literata:ital,wght@0,400;0,500;0,600;0,700;1,400', serif: true },
  { id: 'notoserif', label: 'Noto Serif', family: "'Noto Serif'", google: 'Noto+Serif:ital,wght@0,400;0,500;0,600;0,700;1,400', serif: true },
  { id: 'tinos', label: 'Tinos', family: "'Tinos'", google: 'Tinos:ital,wght@0,400;0,700;1,400', serif: true },
  // every other family on Google Fonts that carries Greek (Alex, 19 Oct: "all the Greek fonts, everywhere I edit"),
  // in one list for the whole Hub; a family is fetched only when it is used
  ...[
    ['Sofia Sans Condensed'], ['Sofia Sans Semi Condensed'], ['Sofia Sans Extra Condensed'], ['Roboto Flex'],
    ['Noto Sans Display'], ['Fira Sans Condensed'], ['Fira Sans Extra Condensed'], ['Ubuntu Condensed', 'Ubuntu+Condensed'],
    ['Alegreya Sans SC'], ['Geologica'], ['Andika'], ['Jura'], ['Play'], ['Ysabeau'], ['Ysabeau Office'], ['Ysabeau Infant'],
    ['M PLUS Rounded 1c'],
  ].map(([n, g]) => ({ label: n, google: g, cat: 'sans' })),
  ...[
    ['Alegreya SC'], ['Roboto Serif'], ['Noto Serif Display'], ['Source Serif 4'], ['Cardo'], ['Caudex'], ['Gentium Plus'],
    ['Gentium Book Plus'], ['Brygada 1918'], ['Piazzolla'], ['Bona Nova'], ['STIX Two Text'], ['Charis SIL'],
  ].map(([n, g]) => ({ label: n, google: g, cat: 'serif' })),
  ...[
    ['Roboto Mono'], ['Noto Sans Mono'], ['Fira Code'], ['Fira Mono'], ['Source Code Pro'], ['Ubuntu Mono'], ['Cousine'],
    ['JetBrains Mono'], ['Anonymous Pro'], ['Victor Mono'],
  ].map(([n, g]) => ({ label: n, google: g, cat: 'mono' })),
  ...[['Syne'], ['Press Start 2P', 'Press+Start+2P']].map(([n, g]) => ({ label: n, google: g, cat: 'display' })),
  ...[['Mynerve', 'Mynerve']].map(([n, g]) => ({ label: n, google: g, cat: 'hand' })),
].map((f) => {
  // a family added by name only: its id, its CSS name and the regular and bold weights from Google Fonts
  const id = f.id || f.label.toLowerCase().replace(/[^a-z0-9]/g, '')
  const google = f.google ?? `${f.label.replace(/ /g, '+')}:wght@400;700`
  const cat = f.cat || (f.serif ? 'serif' : 'sans')
  return { ...f, id, family: f.family || `'${f.label}'`, google, cat, serif: f.serif || cat === 'serif' }
})
export const FONT_CATS = [['', 'All'], ['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono'], ['display', 'Display'], ['hand', 'Handwriting']]
export const FONT_KEY = 'tml_font'
const FALLBACK = "system-ui, -apple-system, 'Segoe UI', sans-serif"

export const currentFont = () => { try { return localStorage.getItem(FONT_KEY) || 'sofia' } catch { return 'sofia' } }

/* Adds the Google Fonts stylesheet for a family once; the page's own <link> already covers Sofia Sans. */
export function ensureFontLoaded(id) {
  const f = FONTS.find((x) => x.id === id)
  if (!f || !f.google || document.getElementById(`font-${f.id}`)) return
  const l = document.createElement('link')
  l.id = `font-${f.id}`
  l.rel = 'stylesheet'
  l.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`
  // a family without the weights asked for is refused whole by Google: ask again for the family alone
  l.onerror = () => { if (!l.dataset.plain) { l.dataset.plain = '1'; l.href = `https://fonts.googleapis.com/css2?family=${f.google.split(':')[0]}&display=swap` } }
  document.head.appendChild(l)
}

/* Just the letters of a family's own name and a Greek sample, for the font picker: a few hundred bytes each, so
   every name can be shown in its own face without fetching whole fonts */
export function ensureFontPreview(id, text) {
  const f = FONTS.find((x) => x.id === id)
  if (!f || !f.google || typeof document === 'undefined' || document.getElementById(`font-${f.id}`) || document.getElementById(`fontp-${f.id}`)) return
  const l = document.createElement('link')
  l.id = `fontp-${f.id}`
  l.rel = 'stylesheet'
  l.href = `https://fonts.googleapis.com/css2?family=${f.google.split(':')[0]}&text=${encodeURIComponent(text)}&display=swap`
  document.head.appendChild(l)
}
export const fontById = (id) => FONTS.find((x) => x.id === id)
// a family as the CSS font-family it is written with, with the right kind of fallback
export const fontStackOf = (f) => (f ? `${f.family}, ${f.cat === 'mono' ? 'ui-monospace, monospace' : f.serif ? 'Georgia, serif' : 'system-ui, sans-serif'}` : '')

/* Sets the face for the whole app and remembers it. Called at start-up and from Settings. */
export function applyFont(id) {
  const f = FONTS.find((x) => x.id === id) || FONTS[0]
  ensureFontLoaded(f.id)
  document.documentElement.style.setProperty('--font', `${f.family}, ${f.serif ? 'Georgia, serif' : FALLBACK}`)
  try { localStorage.setItem(FONT_KEY, f.id) } catch {}
  return f.id
}
