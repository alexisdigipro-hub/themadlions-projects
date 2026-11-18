import { useEffect, useMemo } from 'react'

/* One player for the song of the project open (Alex, 18 Nov: "if we pressed play and I change tab, say to Budget,
   leave it playing, as long as we are in the project"). The <audio> lives on the page itself, not in the Overview,
   so Overview can go and come back while it plays; Project.jsx stops it when the project is left. */
let el = null
let owner = ''
function audioFor(projectId) {
  if (!el) {
    el = document.createElement('audio')
    el.preload = 'metadata'
    el.style.display = 'none'
    document.body.appendChild(el)
  }
  if (owner !== projectId) { el.pause(); el.removeAttribute('src'); delete el.dataset.track; el.load(); owner = projectId }
  return el
}
export function stopProjectAudio() {
  if (!el) return
  el.pause(); el.removeAttribute('src'); delete el.dataset.track; el.load(); owner = ''
}

/* the shared player, given the track and its link; a playing song is never cut by a fresh link to the same track */
export function useProjectAudio(projectId, trackId, url, onError) {
  const a = useMemo(() => audioFor(projectId), [projectId])
  useEffect(() => {
    if (!url) return
    if (a.dataset.track !== String(trackId) || (a.paused && a.getAttribute('src') !== url)) {
      a.dataset.track = String(trackId)
      a.src = url
    }
  }, [a, trackId, url])
  useEffect(() => {
    if (!onError) return undefined
    a.addEventListener('error', onError)
    return () => a.removeEventListener('error', onError)
  }, [a, onError])
  return a
}
