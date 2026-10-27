import type { ListApi } from '../shared/api'

type UpdateState = { status: string; version: string; progress: number }

declare global {
  interface Window {
    roarlist: ListApi & {
      update: {
        state(): Promise<UpdateState>
        install(): Promise<boolean>
        on(cb: (s: UpdateState) => void): () => void
      }
    }
  }
}
export {}
