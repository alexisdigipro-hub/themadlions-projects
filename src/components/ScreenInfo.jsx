import { useEffect, useState } from 'react'

// A small line of numbers at the foot of Settings, only in an app added to the home screen: how tall
// the screen is against what the page is given. iOS gets these wrong in different ways (Alex, 9 Oct:
// a band at the foot, bars pushed off the screen), and a screenshot of this line says which.
export default function ScreenInfo() {
  const [line, setLine] = useState('')
  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (!standalone) return undefined
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;bottom:0;left:0;width:0;visibility:hidden;pointer-events:none;box-sizing:border-box;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
    const dvh = document.createElement('div')
    dvh.style.cssText = 'position:absolute;top:0;left:0;width:0;height:100dvh;visibility:hidden;pointer-events:none'
    document.body.append(probe, dvh)
    const read = () => {
      const cs = getComputedStyle(probe)
      const root = getComputedStyle(document.documentElement)
      setLine([
        `screen ${screen.width}×${screen.height}`,
        `inner ${window.innerHeight}`,
        `fixed ${Math.round(probe.getBoundingClientRect().height)}`,
        `dvh ${Math.round(dvh.getBoundingClientRect().height)}`,
        `vv ${Math.round(window.visualViewport?.height || 0)}`,
        `safe ${cs.paddingTop} / ${cs.paddingBottom}`,
        `gap ${root.getPropertyValue('--ios-gap').trim() || '0'}`,
      ].join(' · '))
    }
    read()
    window.addEventListener('resize', read)
    return () => { window.removeEventListener('resize', read); probe.remove(); dvh.remove() }
  }, [])
  if (!line) return null
  return <p className="muted small" style={{ textAlign: 'center', margin: '18px 0 8px', fontSize: 11 }}>{line}</p>
}
