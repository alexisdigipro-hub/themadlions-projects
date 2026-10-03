// A project's name comes in two parts, Artist / Client and Title, but `title` still holds the whole
// "Artist - Title": that is what the header, chat, finance, call sheets and share links show.
// Projects made before the split have only `title`, read here by cutting at the first " - ".
export function nameParts(p) {
  if (p?.artist != null || p?.shortTitle != null) return { artist: p.artist || '', shortTitle: p.shortTitle || '' }
  const t = p?.title || ''
  const i = t.indexOf(' - ')
  return i > 0 ? { artist: t.slice(0, i).trim(), shortTitle: t.slice(i + 3).trim() } : { artist: '', shortTitle: t }
}

export const joinName = (artist, shortTitle) => [artist.trim(), shortTitle.trim()].filter(Boolean).join(' - ')
