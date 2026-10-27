// The door the screens use: in the hub always the hub's store (hub-api.ts), on the hub's database.
import { hubApi } from './hub-api'

if (!window.roarlist) (window as any).roarlist = hubApi
export const api = window.roarlist
export const isWeb = true
export const isDemo = false
