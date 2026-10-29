/* Whole-app themes beyond Light and Dark (Alex, 8 Oct, from four designs he sent): not just their
   colours but their layout too, on a computer: a bar across the top with search, chat and you, a
   sidebar shaped like the design's, a card in it to start a project, its cards, tabs, tables and
   buttons. A skin sits on top of the Light or Dark theme it is made from (html[data-theme] keeps
   every rule of that theme working) and html[data-skin] adds the rest (styles.css, "App skins").
   The choice is kept in localStorage tml_theme like Light and Dark. Shared call sheets and shot
   lists, which force the look the production picked, take the skin off while they are open. */
export const SKINS = [
  // Light, Dark, Violet night, Teal slate and Ember went (Alex, 27 Oct: "to tidy up"); a device or a team look still
  // on one of them moves to the glass look of its kind (RETIRED below)
  ['coral', 'Coral', 'light'],
  ['glass', 'Glass', 'dark'],
  // a calmer pair of glass looks, one dark and one light (Alex, 9 Oct)
  ['glassdark', 'Glass dark', 'dark'],
  ['glasslight', 'Glass light', 'light'],
  // RoarList's own look on the whole hub (Alex, 27 Oct): graphite glass, a glowing coral-red accent
  ['roarlist', 'RoarList', 'dark'],
  // Soft UI on an aurora, a bento Home and the Island at the top (Alex, 29 Oct), dark and light
  // one choice in Settings since 29 Oct (Alex: "make it dark mode too"): each person picks Light, Dark or Auto for
  // themselves (softMode below); softlight is the light half, not listed on its own
  ['soft', 'Soft aurora', 'dark'],
  ['softlight', 'Soft aurora light', 'light', true],
]
/* the icon set each skin comes with (Settings > Display > Icons can change it afterwards) */
export const SKIN_ICONS = { coral: 'rounded', glass: 'rounded', glassdark: 'rounded', glasslight: 'rounded', roarlist: 'rounded', soft: 'rounded', softlight: 'rounded' }
export const isSkin = (v) => SKINS.some(([k]) => k === v)
/* what every device starts on (main.jsx switches each device to it once) */
export const DEFAULT_THEME = 'glassdark'
const COLORS = { light: '#f3f4f7', dark: '#17181c', violet: '#0a0a0c', teal: '#1f2226', ember: '#0d0d0f', coral: '#fbf1ec', glass: '#3a0aa0', glassdark: '#0b1018', glasslight: '#eef1f8', roarlist: '#1c1f24', soft: '#1b1f2b', softlight: '#e6eaf2' }

/* Soft aurora's dark mode, each person's own (Alex, 29 Oct): '' follows the team's choice, 'light' / 'dark' fix it,
   'auto' follows the device (light by day, dark at night, as the phone or computer is set). Kept in localStorage
   tml_soft_mode; the team's theme stays what the administrator chose. */
const SOFT = { dark: 'soft', light: 'softlight' }
export const isSoft = (v) => v === 'soft' || v === 'softlight'
export const softMode = () => { try { return localStorage.getItem('tml_soft_mode') || '' } catch { return '' } }
const systemDark = () => !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
export function setSoftMode(m) {
  try { if (m) localStorage.setItem('tml_soft_mode', m); else localStorage.removeItem('tml_soft_mode') } catch { /* private window */ }
  let team = ''
  try { team = localStorage.getItem('tml_theme') || '' } catch { /* private window */ }
  applyThemeChoice(team || document.documentElement.dataset.skin || DEFAULT_THEME)
}
if (typeof window !== 'undefined') {
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (softMode() === 'auto' && isSoft(document.documentElement.dataset.skin)) setSoftMode('auto')
  })
}

const RETIRED = { light: 'glasslight', dark: 'glassdark', violet: 'glassdark', teal: 'glassdark', ember: 'glassdark' }
export const liveTheme = (v) => RETIRED[v] || v
export function applyThemeChoice(v) {
  v = liveTheme(v)
  if (isSoft(v)) {
    const m = softMode()
    const want = m === 'auto' ? (systemDark() ? 'dark' : 'light') : m
    if (SOFT[want]) v = SOFT[want]
  }
  const html = document.documentElement
  const skin = SKINS.find(([k]) => k === v)
  if (skin) {
    html.dataset.theme = skin[2]
    html.dataset.skin = v
  } else {
    html.dataset.theme = v === 'dark' ? 'dark' : 'light'
    delete html.dataset.skin
  }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', COLORS[v] || COLORS.light)
}
