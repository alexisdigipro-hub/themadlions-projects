// What a project read from disk, the browser or a file someone sent must look like: only what a project has,
// with the right types. Used by the desktop store and the web store alike.
import type { Project, Scene, Shot } from './api'

export const IMG = /^[a-z0-9-]{8,40}\.(png|jpe?g|webp|gif)$/

export const newShot = (): Shot => ({ id: crypto.randomUUID(), size: '', angle: '', move: '', lens: '', description: '', cast: '', duration: 0, notes: '', image: '', done: false })
export const newScene = (n: number): Scene => ({ id: crypto.randomUUID(), number: String(n), heading: '', shots: [newShot()] })

// whatever comes from disk or a file someone sent: keep only what a project has, with the right types
export function clean(raw: any, id: string): Project {
  const str = (x: any) => (typeof x === 'string' ? x : '')
  const shots = (a: any): Shot[] => (Array.isArray(a) ? a : []).map((s: any) => ({
    id: str(s?.id) || crypto.randomUUID(), size: str(s?.size), angle: str(s?.angle), move: str(s?.move), lens: str(s?.lens),
    description: str(s?.description), cast: str(s?.cast), duration: Math.max(0, Number(s?.duration) || 0), notes: str(s?.notes),
    image: IMG.test(str(s?.image)) ? s.image : '', done: !!s?.done,
  }))
  return {
    id, projectId: str(raw?.projectId), title: str(raw?.title), client: str(raw?.client), director: str(raw?.director), dop: str(raw?.dop),
    date: /^\d{4}-\d{2}-\d{2}$/.test(str(raw?.date)) ? raw.date : '', aspect: str(raw?.aspect) || '16:9', notes: str(raw?.notes),
    scenes: (Array.isArray(raw?.scenes) ? raw.scenes : []).map((sc: any) => ({ id: str(sc?.id) || crypto.randomUUID(), number: str(sc?.number), heading: str(sc?.heading), shots: shots(sc?.shots) })),
    createdAt: Number(raw?.createdAt) || Date.now(), updatedAt: Number(raw?.updatedAt) || Date.now(),
  }
}

