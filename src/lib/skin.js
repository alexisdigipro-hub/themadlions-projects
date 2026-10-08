/* Whole-app themes beyond Light and Dark (Alex, 8 Oct, from two dashboard designs). A skin is a
   dark theme with its own colours: html[data-theme='dark'] keeps every dark rule working, and
   html[data-skin] (styles.css, the "App skins" block) recolours on top, its accent included.
   The choice is kept in localStorage tml_theme like Light and Dark. Public pages that force a
   light or dark look (shared call sheets, shot lists) change data-theme only, and the skins
   apply only with data-theme='dark', so those stay as the production picked. */
export const SKINS = [
  ['violet', 'Violet night'],
  ['teal', 'Teal slate'],
]
export const isSkin = (v) => SKINS.some(([k]) => k === v)

export function applyThemeChoice(v) {
  const html = document.documentElement
  if (isSkin(v)) {
    html.dataset.theme = 'dark'
    html.dataset.skin = v
  } else {
    html.dataset.theme = v === 'dark' ? 'dark' : 'light'
    delete html.dataset.skin
  }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', v === 'violet' ? '#0a0a0c' : v === 'teal' ? '#1f2226' : v === 'dark' ? '#17181c' : '#f3f4f7')
}
