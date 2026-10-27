import { useEffect, useState } from 'react'
import { get, subscribe, type Settings } from './settings'

// the current settings, redrawing when they change
export function useSettings(): Settings {
  const [s, setS] = useState(get())
  useEffect(() => subscribe(setS), [])
  return s
}
