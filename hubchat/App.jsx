import { useEffect, useState } from 'react'
import { supabase } from './lib.js'
import { applyLook, applyMode, setPrefs, themeFor, usePrefs, wearTheme } from './prefs.js'
import Chat from './Chat.jsx'
import { LockScreen, clearLock, useAutoLock } from './lock.jsx'
import { inHubFrame, wearHubLook } from './hubLook.js'

const HUB = './' // the hub itself, beside hubchat.html

/* The hub's chat signs nobody in: the hub does. It reads the hub's saved sign-in (lib.js); with none it says so and
   points to the hub. The person's chat profile (roar_profiles, read through roar_people) is made for every hub member
   by the database (supabase/hub_chat.sql); name and photo come from the hub. */
function Note({ title, children, action }) {
  return (
    <div className="splash blocked-screen hub-note">
      <b>{title}</b>
      <p>{children}</p>
      {action}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)
  const prefs = usePrefs()
  const { mode, lite, theme } = prefs
  useEffect(() => applyLook(prefs), [prefs.accent, prefs.font, prefs.density, prefs.radius, prefs.motion, prefs.focusRings, prefs.glassBubbles]) // eslint-disable-line react-hooks/exhaustive-deps
  // the theme: the hub's own look (the default), or Stone or Simba, each dark and light (Settings > Appearance)
  const t = themeFor(theme)
  useEffect(() => {
    wearHubLook(t === 'hub')
    if (t !== 'hub') { wearTheme(t); document.documentElement.dataset.theme = t }
  }, [t])
  useEffect(() => applyMode(mode), [mode, t])
  // the colour of the band under the clock on a phone follows the theme, day and night (the hub's look sets its own)
  useEffect(() => {
    if (t === 'hub') return undefined
    const m = document.querySelector('meta[name="theme-color"]')
    const set = () => { const d = document.documentElement.dataset; m?.setAttribute('content', d.theme === 'stone' ? (d.mode === 'light' ? '#e2e2e3' : '#ababac') : d.mode === 'light' ? '#eef2f7' : '#383d46') }
    set()
    const mq = window.matchMedia?.('(prefers-color-scheme: light)')
    mq?.addEventListener?.('change', set)
    return () => mq?.removeEventListener?.('change', set)
  }, [mode, t])
  useEffect(() => { if (lite) document.documentElement.dataset.lite = '1'; else delete document.documentElement.dataset.lite }, [lite])
  // a theme no longer offered moves to the hub's look for good
  useEffect(() => { if (theme && theme !== t) setPrefs({ theme: t }) }, [theme, t])

  useEffect(() => {
    if (!supabase) { setSession(null); return undefined }
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s || null))
    return () => data.subscription.unsubscribe()
  }, [])

  const [locked, unlock] = useAutoLock()
  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) { setProfile(undefined); return undefined }
    let alive = true
    supabase.from('roar_people').select('*').eq('id', uid).maybeSingle().then(({ data }) => { if (alive) setProfile(data || null) })
    return () => { alive = false }
  }, [uid])
  // an account blocked from the chat sees why it is empty
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    if (!uid) { setBlocked(false); return }
    supabase.rpc('roar_am_blocked').then(({ data }) => setBlocked(data === true), () => setBlocked(false))
  }, [uid])

  const openHub = () => { if (inHubFrame()) window.parent.location.assign(`${HUB}#/login`); else window.location.assign(`${HUB}#/login`) }
  if (session === undefined || (uid && profile === undefined)) return <div className="splash" />
  if (!session) {
    return (
      <Note title="Sign in to the hub" action={<button type="button" className="btn btn-main" onClick={openHub}>Open the hub</button>}>
        {supabase ? 'The chat uses your THEMADLIONS hub account. Sign in to the hub and the chat opens by itself.' : 'The chat needs the online database.'}
      </Note>
    )
  }
  if (locked) return <LockScreen onUnlock={unlock} onSignOut={() => { clearLock(); supabase.auth.signOut() }} />
  if (blocked) return <Note title="The chat is closed for this account">If you think this is a mistake, ask your administrator.</Note>
  if (!profile) {
    return (
      <Note title="The chat is getting ready" action={<button type="button" className="btn" onClick={() => window.location.reload()}>Try again</button>}>
        Your chat profile is not there yet. If this stays, ask your administrator to run supabase/hub_chat.sql.
      </Note>
    )
  }
  return <Chat me={profile} setMe={setProfile} />
}
