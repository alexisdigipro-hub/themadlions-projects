// What a shot list is, and the only door between the screens and the computer (files, images, PDF).

export type Shot = {
  id: string
  size: string        // ECU, CU, MCU, MS, MWS, WS, EWS, INS, OTS, POV, 2S, or anything typed
  angle: string       // eye, high, low, dutch, overhead, ground
  move: string        // static, pan, tilt, dolly, track, handheld, steadicam, gimbal, crane, drone, zoom
  lens: string        // free text: 35mm, 24-70…
  description: string
  cast: string
  duration: number    // seconds, 0 = not set
  notes: string
  image: string       // file name inside the project's images folder, '' = none
  done: boolean
}

export type Scene = {
  id: string
  number: string      // "1", "12A"…
  heading: string     // INT. KITCHEN - NIGHT
  shots: Shot[]
}

export type Project = {
  id: string
  projectId: string   // the hub project the list belongs to ('' = none); the hub's copy only
  title: string
  client: string
  director: string
  dop: string
  date: string        // shoot day, YYYY-MM-DD
  aspect: string      // storyboard frames: 16:9, 2.39:1, 1.85:1, 4:3, 1:1, 9:16
  notes: string
  scenes: Scene[]
  createdAt: number
  updatedAt: number
}

export type ProjectSummary = { id: string; projectId: string; title: string; date: string; updatedAt: number; shots: number; done: number; cover: string }

export type PrintMode = 'list' | 'board'

// the words the printed page needs, in the app's language
export type PrintLabels = Record<'scene' | 'shot' | 'frame' | 'size' | 'angle' | 'move' | 'lens' | 'description' | 'cast' | 'duration'
  | 'notes' | 'client' | 'director' | 'dop' | 'date' | 'shots' | 'total' | 'done', string> & {
  values: Record<string, string>
  paper?: 'A4' | 'Letter'
  hide?: string[] // columns left out: frame, size, angle, move, lens, cast, duration, notes
}

export type MenuCommand = 'new' | 'import' | 'export-pdf' | 'export-board' | 'export-html' | 'export-file' | 'add-scene' | 'add-shot' | 'settings'

export interface ListApi {
  platform: string // darwin, win32… or 'web'
  imageSrc(projectId: string, file: string): string | Promise<string>
  list(): Promise<ProjectSummary[]>
  get(id: string): Promise<Project | null>
  create(title: string): Promise<Project>
  save(p: Project): Promise<void>
  saveNow(p: Project): void // blocking, for the moment the window closes
  duplicate(id: string, title: string): Promise<Project>
  remove(id: string): Promise<void>
  saveImage(projectId: string, bytes: ArrayBuffer, ext: string): Promise<string>
  exportPdf(id: string, mode: PrintMode, labels: PrintLabels): Promise<boolean>
  exportHtml(id: string, mode: PrintMode, labels: PrintLabels): Promise<boolean>
  exportFile(id: string): Promise<boolean>
  importFile(): Promise<Project | null>
  onMenu(cb: (c: MenuCommand) => void): () => void
  onOpened(cb: (p: Project) => void): () => void
}

