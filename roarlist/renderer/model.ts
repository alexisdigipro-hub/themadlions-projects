// Small pure helpers the screens use to change a project (each returns a new project, nothing is mutated).
import type { Project, Scene, Shot } from '../shared/api'

export const uid = () => crypto.randomUUID()
export const newShot = (from?: Partial<Shot>): Shot => ({
  id: uid(), size: '', angle: '', move: '', lens: from?.lens || '', description: '', cast: '', duration: 0, notes: '', image: '', done: false,
})
export const newScene = (number: string): Scene => ({ id: uid(), number, heading: '', shots: [newShot()] })

export const mapScene = (p: Project, sceneId: string, fn: (s: Scene) => Scene): Project =>
  ({ ...p, scenes: p.scenes.map((sc) => (sc.id === sceneId ? fn(sc) : sc)) })

export const mapShot = (p: Project, shotId: string, fn: (s: Shot) => Shot): Project =>
  ({ ...p, scenes: p.scenes.map((sc) => (sc.shots.some((s) => s.id === shotId) ? { ...sc, shots: sc.shots.map((s) => (s.id === shotId ? fn(s) : s)) } : sc)) })

export function addShot(p: Project, sceneId: string, afterId?: string): [Project, string] {
  const sc = p.scenes.find((x) => x.id === sceneId)
  if (!sc) return [p, '']
  const i = afterId ? sc.shots.findIndex((s) => s.id === afterId) : sc.shots.length - 1
  const prev = sc.shots[i]
  const shot = newShot(prev)
  const shots = [...sc.shots]
  shots.splice(i + 1, 0, shot)
  return [mapScene(p, sceneId, (x) => ({ ...x, shots })), shot.id]
}

export const removeShot = (p: Project, shotId: string): Project =>
  ({ ...p, scenes: p.scenes.map((sc) => ({ ...sc, shots: sc.shots.filter((s) => s.id !== shotId) })) })

// the next scene number after the last one that is a plain number
export function nextSceneNumber(p: Project) {
  const nums = p.scenes.map((s) => parseInt(s.number, 10)).filter((n) => !isNaN(n))
  return String(nums.length ? Math.max(...nums) + 1 : p.scenes.length + 1)
}

export function moveShot(p: Project, shotId: string, toScene: string, toIndex: number): Project {
  let shot: Shot | undefined
  let fromScene = ''
  let fromIndex = -1
  for (const sc of p.scenes) {
    const i = sc.shots.findIndex((s) => s.id === shotId)
    if (i >= 0) { shot = sc.shots[i]; fromScene = sc.id; fromIndex = i }
  }
  if (!shot) return p
  // dropping below itself in the same scene: the gap it leaves shifts the target up by one
  if (fromScene === toScene && fromIndex < toIndex) toIndex--
  const out = removeShot(p, shotId)
  return mapScene(out, toScene, (sc) => {
    const shots = [...sc.shots]
    shots.splice(Math.max(0, Math.min(toIndex, shots.length)), 0, shot!)
    return { ...sc, shots }
  })
}

export function moveScene(p: Project, sceneId: string, by: number): Project {
  const i = p.scenes.findIndex((s) => s.id === sceneId)
  const j = i + by
  if (i < 0 || j < 0 || j >= p.scenes.length) return p
  const scenes = [...p.scenes]
  ;[scenes[i], scenes[j]] = [scenes[j], scenes[i]]
  return { ...p, scenes }
}

// "1:30", "90", "1.30", "1m30" all mean ninety seconds
export function parseDur(s: string): number {
  const v = s.trim()
  if (!v) return 0
  const m = /^(\d+)\s*[:.m]\s*(\d{1,2})\s*s?$/.exec(v)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  const n = parseFloat(v)
  return isFinite(n) && n > 0 ? Math.round(n) : 0
}

const OK = /^image\/(png|jpeg|webp|gif)$/
const MAX = 2400

// a dropped or pasted picture, made a sensible size (big photos are scaled to 2400px, kept as JPEG) and saved to the project
export async function ingestImage(projectId: string, file: Blob): Promise<string> {
  if (!OK.test(file.type)) throw new Error('type')
  let blob: Blob = file
  let ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  if (file.type !== 'image/gif') {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height))
    if (scale < 1 || file.size > 3e6) {
      const c = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale))
      const g = c.getContext('2d')!
      g.fillStyle = '#fff' // transparent PNG sketches stay readable as JPEG
      g.fillRect(0, 0, c.width, c.height)
      g.drawImage(bmp, 0, 0, c.width, c.height)
      blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.88 })
      ext = 'jpg'
    }
    bmp.close()
  }
  return window.roarlist.saveImage(projectId, await blob.arrayBuffer(), ext)
}
