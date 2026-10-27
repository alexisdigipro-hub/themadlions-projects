import { applyThemeChoice } from './skin.js'
import { applyFont, currentFont } from './fonts.js'
import { applyIconSet } from '../components/icons.jsx'

/* The hub's look is the administrator's choice for everyone (Alex, 22 Oct: "only I choose the theme"): the theme,
   the accent colour, the typeface and the icons live in the workspace's settings as `look`, set from Settings >
   Display by the administrator and put on every member's app when it opens. Each device still keeps a copy in its
   own storage, so the next start shows the right look from the first frame. Text size stays each person's own. */

export const localLook = () => {
  const html = document.documentElement
  let theme = '', accent = ''
  try { theme = localStorage.getItem('tml_theme') || ''; accent = localStorage.getItem('tml_accent') || '' } catch {}
  return { theme, accent: accent || html.dataset.accent || 'amber', icons: html.dataset.icons || 'rounded', font: currentFont() }
}

export function applyTeamLook(look) {
  if (!look) return
  const html = document.documentElement
  if (look.theme) {
    try { localStorage.setItem('tml_theme', look.theme) } catch {}
    // a shared page that forces its own look (a call sheet, a delivery) keeps it; the app's pages take the team's
    applyThemeChoice(look.theme)
  }
  if (look.accent) {
    try { localStorage.setItem('tml_accent', look.accent) } catch {}
    html.dataset.accent = look.accent
  }
  if (look.icons) applyIconSet(look.icons)
  if (look.font) applyFont(look.font)
}
