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
]
/* the icon set each skin comes with (Settings > Display > Icons can change it afterwards) */
export const SKIN_ICONS = { violet: 'duo', teal: 'rounded', ember: 'bold', coral: 'rounded', glass: 'duo', glassdark: 'thin', glasslight: 'thin', roarlist: 'rounded' }
export const isSkin = (v) => SKINS.some(([k]) => k === v)
/* what every device starts on (main.jsx switches each device to it once) */
export const DEFAULT_THEME = 'glassdark'
const COLORS = { light: '#f3f4f7', dark: '#17181c', violet: '#0a0a0c', teal: '#1f2226', ember: '#0d0d0f', coral: '#fbf1ec', glass: '#3a0aa0', glassdark: '#0b1018', glasslight: '#eef1f8', roarlist: '#1c1f24' }

const RETIRED = { light: 'glasslight', dark: 'glassdark', violet: 'glassdark', teal: 'glassdark', ember: 'glassdark' }
export const liveTheme = (v) => RETIRED[v] || v
export function applyThemeChoice(v) {
  v = liveTheme(v)
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
