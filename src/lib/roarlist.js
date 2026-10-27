import { supabase } from './supabase.js'

/* RoarList in the hub (Alex, 27 Oct 2026): the shot lists live in roarlist_lists (supabase/roarlist.sql), made and
   opened in the side menu's RoarList (roarlist/). The Breakdown's "Also draft a first shot list" writes one there,
   tied to the project, in RoarList's own shape (roarlist/shared/api.ts: scenes with shots). */
const SIZES = ['ECU', 'CU', 'MCU', 'MS', 'MWS', 'WS', 'EWS', 'INS', 'OTS', 'POV', '2S']
const MOVES = ['static', 'pan', 'tilt', 'push', 'pull', 'dolly', 'track', 'handheld', 'steadicam', 'gimbal', 'crane', 'drone', 'zoom']
const uuid = () => crypto.randomUUID()

const sizeOf = (s) => { const u = String(s || '').trim().toUpperCase(); return SIZES.includes(u) ? u : String(s || '').trim() }
const moveOf = (m) => { const l = String(m || '').trim().toLowerCase(); return MOVES.find((x) => l.startsWith(x)) || l }

// setups: the AI's [{ number, heading, shots: [{ size, movement, description }] }], scenes: the project's new scenes
export async function draftShotList(project, setups, scenes) {
  if (!supabase) throw new Error('RoarList needs the online database')
  const now = Date.now()
  const data = {
    title: project.title || '', client: project.client || '', director: project.director || '', dop: '',
    date: /^\d{4}-\d{2}-\d{2}$/.test(project.startDate || '') ? project.startDate : '', aspect: '16:9', notes: '',
    scenes: setups.map((st, i) => ({
      id: uuid(), number: scenes[i]?.number || st.number || String(i + 1), heading: st.heading || '',
      shots: (st.shots || []).map((sh) => ({ id: uuid(), size: sizeOf(sh.size), angle: '', move: moveOf(sh.movement), lens: '', description: sh.description || '', cast: '', duration: 0, notes: '', image: '', done: false })),
    })).filter((sc) => sc.shots.length),
    createdAt: now, updatedAt: now,
  }
  if (!data.scenes.length) return 0
  const { error } = await supabase.from('roarlist_lists').insert({ id: uuid(), project_id: project.id, data })
  if (error) throw new Error(error.code === '42P01' ? 'Run supabase/roarlist.sql to switch RoarList on' : error.message)
  return data.scenes.reduce((a, sc) => a + sc.shots.length, 0)
}
