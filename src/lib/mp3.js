// WAV (and AIFF, FLAC) to MP3 in the browser, before anything is uploaded. A stereo WAV is about
// 10 MB a minute; an MP3 at 192 kbps about 1.4 MB. The master never leaves the person's disk.
//
// The encoder is lamejs (LGPL, https://github.com/zhuker/lamejs), kept as its own file under
// public/vendor/lamejs and loaded only when a file needs converting. Kept out of the bundle on
// purpose: the LGPL asks for it to stay a separate, replaceable file, and most uploads (MP3, M4A)
// never need it.

const KBPS = 192
const FRAME = 1152 // samples per MP3 frame, what the encoder wants per call

const LOSSLESS = /\.(wav|wave|aif|aiff|aifc|flac|caf)$/i
const LOSSLESS_MIME = /^audio\/(wav|x-wav|wave|vnd\.wave|aiff|x-aiff|flac|x-flac|x-caf)$/i

/* Files worth converting: uncompressed or lossless. An MP3, M4A, AAC or OGG passes as it is. */
export function needsEncoding(file) {
  return LOSSLESS.test(file?.name || '') || LOSSLESS_MIME.test(file?.type || '')
}

let loading = null
/* Loads the encoder script once, from the app's own files (works under any base path). */
export function loadLame() {
  if (globalThis.lamejs?.Mp3Encoder) return Promise.resolve(globalThis.lamejs)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `${import.meta.env.BASE_URL}vendor/lamejs/lame.min.js`
    s.async = true
    s.onload = () => (globalThis.lamejs?.Mp3Encoder ? resolve(globalThis.lamejs) : reject(new Error('The MP3 encoder did not load.')))
    s.onerror = () => { loading = null; reject(new Error('Could not load the MP3 encoder. Check the connection and try again.')) }
    document.head.appendChild(s)
  })
  return loading
}

const toInt16 = (f32) => {
  const out = new Int16Array(f32.length)
  for (let i = 0; i < f32.length; i++) {
    const v = Math.max(-1, Math.min(1, f32[i]))
    out[i] = v < 0 ? v * 32768 : v * 32767
  }
  return out
}

/*
 * Encodes decoded PCM (one or two Float32 channels, as an AudioBuffer gives them) to MP3 bytes.
 * Pure apart from the encoder object, so it runs in node for tests. Yields to the event loop
 * every `yieldEvery` frames so the page stays responsive and progress can be shown.
 */
export async function encodeMp3(channels, sampleRate, { lame = globalThis.lamejs, kbps = KBPS, onProgress, yieldEvery = 200 } = {}) {
  if (!lame?.Mp3Encoder) throw new Error('MP3 encoder not loaded')
  if (!channels?.length || !channels[0]?.length) throw new Error('Nothing to encode')
  const stereo = channels.length > 1
  const left = toInt16(channels[0])
  const right = stereo ? toInt16(channels[1]) : null
  const enc = new lame.Mp3Encoder(stereo ? 2 : 1, sampleRate, kbps)
  const parts = []
  let total = 0
  const n = left.length
  let frames = 0
  for (let i = 0; i < n; i += FRAME) {
    const l = left.subarray(i, i + FRAME)
    const buf = stereo ? enc.encodeBuffer(l, right.subarray(i, i + FRAME)) : enc.encodeBuffer(l)
    if (buf.length) { parts.push(buf); total += buf.length }
    if (++frames % yieldEvery === 0) {
      onProgress?.(Math.min(0.99, i / n))
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  const tail = enc.flush()
  if (tail.length) { parts.push(tail); total += tail.length }
  onProgress?.(1)
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) { out.set(p, off); off += p.length }
  return out
}

/* A lossless audio File becomes an MP3 File with the same name. Anything else comes back as is. */
export async function toMp3(file, onProgress) {
  if (!needsEncoding(file)) return file
  const lame = await loadLame()
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  let buf
  try {
    buf = await ctx.decodeAudioData(await file.arrayBuffer())
  } finally {
    ctx.close?.()
  }
  const channels = buf.numberOfChannels > 1 ? [buf.getChannelData(0), buf.getChannelData(1)] : [buf.getChannelData(0)]
  const bytes = await encodeMp3(channels, buf.sampleRate, { lame, onProgress })
  const name = (file.name || 'audio').replace(/\.[^.]+$/, '') + '.mp3'
  return new File([bytes], name, { type: 'audio/mpeg', lastModified: file.lastModified || Date.now() })
}
