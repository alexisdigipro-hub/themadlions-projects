import { remote, supabase } from './supabase.js'
import { THEMES, loadDeckAssets, loadDeckFonts, loadSlidePhotos, slideJpeg } from './deck.js'
import { deckUrl, publishShare, tokenOf } from './shares.js'

/* The online presentation (Alex, 7 Oct: "να υπάρχει και online, να κατεβαίνει PDF, ελαφρύ").
   The slides go up as finished pictures, one JPEG each, drawn exactly as they are in the PDF, so
   the page that opens the link has nothing to draw and no fonts to fetch: it shows the pictures,
   and its Download PDF wraps those same pictures in a PDF without drawing anything either.
   The pictures sit in the private photos bucket under the project's folder (the permissions
   already there cover it, no SQL), reached through signed addresses that stay valid for a year.
   Sharing again draws fresh pictures under new names and removes the old ones, so a phone that
   cached an older version cannot show it. */

const BUCKET = 'photos'
const YEAR = 365 * 24 * 3600

export const themeName = (k) => THEMES.find(([t]) => t === k)?.[1] || 'MB Studio'

export async function publishDeck({ project, slides, subtitle, look, workspace, logo, userId, onStep }) {
  if (!remote) throw new Error('Share links need the team workspace on Supabase. In this browser-only mode use Download PDF.')
  await loadDeckFonts(look.theme)
  const assets = await loadDeckAssets()
  const pictures = await loadSlidePhotos(slides.flatMap((s) => s.photos || []))
  const dir = `${project.id}/deck-share`
  const stamp = Date.now().toString(36)
  const paths = []
  let size = { width: 1600, height: 900 }
  for (let i = 0; i < slides.length; i++) {
    onStep?.(i + 1, slides.length)
    const page = await slideJpeg(slides[i], { assets, subtitle, ...look }, { pictures })
    size = { width: page.width, height: page.height }
    const path = `${dir}/${stamp}-${i + 1}.jpg`
    const { error } = await supabase.storage.from(BUCKET).upload(path, new Blob([page.bytes], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' })
    if (error) throw new Error(error.message.includes('not found') ? 'Storage bucket "photos" is missing. Run supabase/storage.sql in the SQL editor.' : error.message)
    paths.push(path)
  }
  const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, YEAR)
  if (error) throw error
  const data = {
    project: { title: project.title, color: project.color || '', cover: project.coverThumb || '' },
    company: { name: workspace.name, logo: logo || '' },
    subtitle,
    theme: look.theme,
    size,
    slides: signed.map((x) => x.signedUrl),
    at: new Date().toISOString(),
  }
  const ref = `deck:${project.id}`
  const url = await publishShare({ workspaceId: workspace.id, kind: 'deck', ref, data, userId })
  // The pictures of the previous share: gone once the new ones are live, never before.
  try {
    const { data: files } = await supabase.storage.from(BUCKET).list(dir, { limit: 1000 })
    const keep = new Set(paths)
    const old = (files || []).map((f) => `${dir}/${f.name}`).filter((p) => !keep.has(p))
    if (old.length) await supabase.storage.from(BUCKET).remove(old)
  } catch { /* leftovers only cost space */ }
  return { url: deckUrl(tokenOf(url)), ref }
}

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
