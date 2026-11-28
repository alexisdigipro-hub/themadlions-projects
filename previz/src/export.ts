import type { Project } from './state'
import type { World } from './scene'
import { aspectRatio, shotsOf } from './camera'
import { muxMp4, type Sample } from './mp4'

/** Frame size of the reference video for each aspect (even numbers, as H.264 wants). */
export function frameSize(p: Project): { w: number; h: number } {
  switch (p.shot.aspect) {
    case '9:16':
      return { w: 1080, h: 1920 }
    case '2.39:1':
      return { w: 1920, h: 804 }
    case '1:1':
      return { w: 1080, h: 1080 }
    default:
      return { w: 1920, h: 1080 }
  }
}
export const frameCount = (p: Project) => Math.round(p.shot.duration * p.shot.fps)

const CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640032', 'avc1.42001f']

export async function videoSupport(p: Project): Promise<string | null> {
  if (!('VideoEncoder' in window) || !('VideoFrame' in window)) return null
  const { w, h } = frameSize(p)
  for (const codec of CODECS) {
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width: w, height: h, bitrate: 10e6, framerate: p.shot.fps, avc: { format: 'avc' } })
      if (r.supported) return codec
    } catch {
      /* try the next profile */
    }
  }
  return null
}

/**
 * The Shot view as an MP4, drawn and encoded frame by frame: exactly duration x fps frames,
 * however slow the device. A cut always lands on a keyframe of the video.
 */
export async function exportVideo(world: World, p: Project, onProgress: (done: number, total: number) => void, stop: { now: boolean }): Promise<Blob> {
  const codec = await videoSupport(p)
  if (!codec) throw new Error('nosupport')
  const { w, h } = frameSize(p)
  const fps = p.shot.fps
  const total = frameCount(p)
  const ex = world.exporter(w, h)
  const samples: Sample[] = []
  let avcC: Uint8Array | null = null
  let failed: Error | null = null
  let lastTs = -1
  const enc = new VideoEncoder({
    output: (chunk, meta) => {
      const d = meta?.decoderConfig?.description
      if (d && !avcC) avcC = new Uint8Array(d instanceof ArrayBuffer ? d : (d as ArrayBufferView).buffer.slice(0))
      if (chunk.timestamp < lastTs) failed = new Error('order')
      lastTs = chunk.timestamp
      const data = new Uint8Array(chunk.byteLength)
      chunk.copyTo(data)
      samples.push({ data, key: chunk.type === 'key' })
    },
    error: (e) => (failed = e as Error),
  })
  enc.configure({ codec, width: w, height: h, bitrate: w * h > 1.5e6 ? 12e6 : 8e6, framerate: fps, avc: { format: 'avc' }, latencyMode: 'quality' })
  const cuts = new Set(shotsOf(p.keys).slice(1).map((g) => Math.round(g[0].t * fps)))
  const a = aspectRatio(p.shot.aspect)
  try {
    for (let i = 0; i < total; i++) {
      if (stop.now) throw new Error('stopped')
      if (failed) throw failed
      ex.render(p, i / fps, a)
      const frame = new VideoFrame(ex.canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) })
      enc.encode(frame, { keyFrame: i % (fps * 2) === 0 || cuts.has(i) })
      frame.close()
      onProgress(i + 1, total)
      // let the encoder and the page breathe
      if (enc.encodeQueueSize > 3 || i % 4 === 0) await new Promise((r) => setTimeout(r, 0))
      while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 8))
    }
    await enc.flush()
    if (failed) throw failed
    if (!avcC || samples.length !== total) throw new Error('encode')
    return muxMp4(samples, { width: w, height: h, fps, avcC })
  } finally {
    if (enc.state !== 'closed') enc.close()
    ex.dispose()
  }
}

/** PNG stills of the Shot view at the given times. */
export async function exportFrames(world: World, p: Project, times: number[]): Promise<Blob[]> {
  const { w, h } = frameSize(p)
  const ex = world.exporter(w, h)
  const out: Blob[] = []
  try {
    for (const t of times) {
      ex.render(p, t, aspectRatio(p.shot.aspect))
      out.push(await new Promise<Blob>((res, rej) => ex.canvas.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png')))
    }
  } finally {
    ex.dispose()
  }
  return out
}
