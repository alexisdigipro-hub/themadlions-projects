import { useEffect, useRef, useState } from 'react'
import { lastTrackError, trackBlob, trackUrl } from './audio.js'

/* Where a song's player gets its sound (Overview and the Music tab). First the stored link; when that
   link will not play (none came back, the browser refuses it, it expired), the song is downloaded whole
   and played from this device instead (Alex, 9 Oct: "the audio does not play", the play button did
   nothing and said nothing). If that fails too, `err` says why, for the page to show under the player.
   Hand `onError` to the <audio> and use `play(audio)` instead of audio.play(). */
export function useTrackSource(track) {
  const [url, setUrl] = useState('')
  const [err, setErr] = useState('')
  const tried = useRef(false)
  const local = useRef('')
  const drop = () => { if (local.current) { URL.revokeObjectURL(local.current); local.current = '' } }

  const fallBack = async (linked) => {
    if (tried.current || !track) return false
    tried.current = true
    if (!track.fileid && !linked) { setErr(lastTrackError || 'The song could not be loaded. Reload the page and try again.'); return false }
    try {
      const blob = await trackBlob(track, linked)
      drop()
      local.current = URL.createObjectURL(blob)
      setUrl(local.current)
      setErr('')
      return true
    } catch (e) {
      setErr(e.message || 'The song could not be downloaded.')
      return false
    }
  }

  useEffect(() => {
    let alive = true
    tried.current = false
    setErr('')
    setUrl('')
    trackUrl(track).then((u) => {
      if (!alive) return
      setUrl(u)
      if (!u && track) fallBack('')
    })
    return () => { alive = false }
  }, [track?.id, track?.path, track?.fileid])
  useEffect(() => drop, [])

  // the stored link failed in the browser (refused, expired, a format it will not stream)
  const onError = () => { if (url && url !== local.current) fallBack(url) }

  const play = (audio) => {
    if (!audio) return
    const p = audio.play()
    if (p && p.catch) p.catch(async (e) => {
      if (e?.name === 'AbortError') return
      if (!tried.current && url && url !== local.current) {
        // a fresh source: start it once it is in (a browser may still ask for one more tap)
        if (await fallBack(url)) setTimeout(() => audio.play().catch(() => setErr('Ready. Press play again.')), 50)
        return
      }
      // a failed download has already said why
      if (local.current || !tried.current) setErr(`The song could not be played (${e?.message || e?.name || 'unknown error'}).`)
    })
  }

  return { url, err, onError, play }
}
