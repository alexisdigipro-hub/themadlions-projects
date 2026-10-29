import { useRef, useState } from 'react'
import { Button, Modal } from './ui.jsx'
import { fmtBytes } from '../lib/photos.js'
import { fmtTime } from '../lib/audio.js'

/* Before a WAV, AIFF or FLAC goes up (Alex, 29 Oct: "ask me whether to compress it"): keep the original, as it is,
   or make it an MP3 here first. Both go to pCloud like any song. ask(file) answers 'original', 'mp3' or null. */
const MP3_KBPS = 192

/* The length from the file's own header, without decoding it all; 0 when the browser cannot tell. */
function lengthOf(file) {
  return new Promise((done) => {
    const a = document.createElement('audio')
    const url = URL.createObjectURL(file)
    const end = (d) => { URL.revokeObjectURL(url); done(Number.isFinite(d) ? d : 0) }
    a.preload = 'metadata'
    a.onloadedmetadata = () => end(a.duration)
    a.onerror = () => end(0)
    setTimeout(() => end(a.duration), 4000)
    a.src = url
  })
}

export function useAudioChoice() {
  const [ask, setAsk] = useState(null)
  const answer = useRef(null)
  const open = async (file) => {
    const duration = await lengthOf(file)
    // an MP3 of the same length; without a length, about a seventh of an uncompressed file (a third of a FLAC)
    const mp3 = duration ? (duration * MP3_KBPS * 1000) / 8 : file.size / (/\.flac$/i.test(file.name) ? 3 : 7)
    return new Promise((resolve) => { answer.current = resolve; setAsk({ file, duration, mp3 }) })
  }
  const close = (v) => { answer.current?.(v); answer.current = null; setAsk(null) }
  const kind = (ask?.file.name.split('.').pop() || 'WAV').toUpperCase()
  const modal = ask && (
    <Modal open title="Upload the song" onClose={() => close(null)}
      footer={<Button variant="ghost" onClick={() => close(null)}>Cancel</Button>}>
      <div className="stack">
        <p className="small muted">{ask.file.name}{ask.duration ? ` · ${fmtTime(ask.duration)}` : ''}. Either way it goes to pCloud, in the project's Music folder.</p>
        <div className="audio-choice">
          <button type="button" onClick={() => close('original')}>
            <b>Keep the original</b>
            <span className="chip-kind">{kind} · {fmtBytes(ask.file.size)}</span>
            <small>Full quality, nothing changed. Bigger, so it takes longer to upload and to load.</small>
          </button>
          <button type="button" onClick={() => close('mp3')}>
            <b>Compress to MP3</b>
            <span className="chip-kind">MP3 {MP3_KBPS} kbps · about {fmtBytes(ask.mp3)}</span>
            <small>Made on this device before it goes up. Plays at once everywhere; enough for playback on set.</small>
          </button>
        </div>
      </div>
    </Modal>
  )
  return [open, modal]
}
