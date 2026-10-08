import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '../components/ui.jsx'
import { sendAutoNotice } from '../components/Notices.jsx'
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js'
import { remote, supabase } from './supabase.js'
import { uid, useCurrentUser, useStore } from './store.jsx'

/*
  Voice and video calls in a one-to-one conversation (Alex, 8 Oct), like Telegram's.

  The call itself goes straight from phone to phone (WebRTC, built into every browser): sound and
  picture never pass through Supabase or any server of ours, and are encrypted end to end. Only
  the few lines that set it up (the "ring", the answer, hang up) go through Supabase Realtime:
  each person listens on their own private line, call:u:<their id>, and the others drop a
  message on it through Realtime's REST door. supabase/chat_calls.sql says who may: only you
  listen on yours, and only people of the same workspace write to it.

  It rings where that person has the app (or TML Chat) open, on every device at once; the first
  to answer takes it and the others stop. A closed app does not ring (that would need push
  notifications); the caller's missed call becomes a message in the conversation and a notice.

  Setting up: the caller makes an offer and waits for the network routes to be gathered, then
  sends it whole (no trickling), and the answer comes back the same way. Public STUN servers find
  the route; a network that blocks direct connections (some 4G operators, strict office Wi-Fi)
  would need a TURN relay, not set up yet.
*/

const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }]
const RING_FOR = 45000
const line = (userId) => `call:u:${userId}`

/* A message onto someone's line, through Realtime's REST door (no need to join their line). */
async function signal(to, payload) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Not signed in')
  const res = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ topic: line(to), event: 'call', payload, private: true }] }),
    keepalive: true, // still goes out when the page is closing (hang up on leaving)
  })
  if (!res.ok) throw new Error(`The call could not be sent (${res.status})`)
}

/* All the routes found, or as many as a couple of seconds give. */
const gathered = (pc, ms = 2500) => new Promise((resolve) => {
  if (pc.iceGatheringState === 'complete') { resolve(); return }
  const done = () => { clearTimeout(t); pc.removeEventListener('icegatheringstatechange', check); resolve() }
  const check = () => { if (pc.iceGatheringState === 'complete') done() }
  const t = setTimeout(done, ms)
  pc.addEventListener('icegatheringstatechange', check)
})

const media = (video, facing = 'user') => navigator.mediaDevices.getUserMedia({
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: video ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
})

const clock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/* Ring and ringback, made on the spot like the chat's chime. */
let actx = null
/* The iPhone keeps sound made outside a tap silent, so the first tap anywhere wakes it up, ready
   for a ring that comes later. */
function wakeAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    actx = actx || new Ctx()
    if (actx.state === 'suspended') actx.resume().catch(() => {})
  } catch {}
}
function tone(kind) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return () => {}
    actx = actx || new Ctx()
    if (actx.state === 'suspended') actx.resume().catch(() => {})
    const beep = () => {
      const t0 = actx.currentTime
      const notes = kind === 'in' ? [[1046.5, 0], [1318.5, 0.16], [1046.5, 0.32], [1318.5, 0.48]] : [[440, 0], [480, 0]]
      const len = kind === 'in' ? 0.15 : 1.2
      notes.forEach(([f, at]) => {
        const o = actx.createOscillator()
        const g = actx.createGain()
        o.type = 'sine'
        o.frequency.value = f
        g.gain.setValueAtTime(0.0001, t0 + at)
        g.gain.exponentialRampToValueAtTime(kind === 'in' ? 0.2 : 0.06, t0 + at + 0.02)
        g.gain.setValueAtTime(kind === 'in' ? 0.2 : 0.06, t0 + at + len - 0.04)
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len)
        o.connect(g).connect(actx.destination)
        o.start(t0 + at)
        o.stop(t0 + at + len + 0.02)
      })
      if (kind === 'in') navigator.vibrate?.([300, 200, 300])
    }
    beep()
    const timer = setInterval(beep, kind === 'in' ? 2000 : 4000)
    return () => { clearInterval(timer); navigator.vibrate?.(0) }
  } catch {
    return () => {}
  }
}

const CallsCtx = createContext({ start: () => {}, ready: false, busy: false })
export const useCalls = () => useContext(CallsCtx)

export function CallProvider({ children }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [call, setCallState] = useState(null)
  const [ready, setReady] = useState(false)
  const [, tick] = useState(0)
  const callRef = useRef(null)
  const pcRef = useRef(null)
  const localRef = useRef(null)
  const remoteRef = useRef(null)
  const stopTone = useRef(() => {})
  const timers = useRef({})
  const stateRef = useRef(state)
  stateRef.current = state
  const userRef = useRef(user)
  userRef.current = user

  const setCall = useCallback((next) => {
    const v = typeof next === 'function' ? next(callRef.current) : next
    callRef.current = v
    setCallState(v)
  }, [])
  const patch = useCallback((p) => setCall((c) => (c ? { ...c, ...p } : c)), [setCall])

  const clearTimers = () => { Object.values(timers.current).forEach((t) => clearTimeout(t)); timers.current = {} }
  const silence = () => { stopTone.current(); stopTone.current = () => {} }

  /* The caller writes the call into the conversation, as Telegram shows it. */
  const logCall = (c, dur, reason) => {
    const me = userRef.current
    if (!c || c.dir !== 'out' || !c.roomId || !me) return
    const kind = c.video ? 'video call' : 'voice call'
    const text = dur ? `${c.video ? '🎥' : '📞'} ${kind[0].toUpperCase()}${kind.slice(1)} · ${clock(dur)}` : `${c.video ? '🎥' : '📞'} Missed ${kind}`
    const now = new Date().toISOString()
    update((s) => {
      if (!(s.chats || []).some((r) => r.id === c.roomId) && c.roomId.startsWith('d:')) {
        s.chats = [...(s.chats || []), { id: c.roomId, kind: 'direct', name: '', members: c.roomId.slice(2).split(':'), createdBy: me.id, createdAt: now }]
      }
      s.chat = [...(s.chat || []), { id: uid(), chatId: c.roomId, userId: me.id, userName: me.name || 'Someone', text, source: 'app', createdAt: now, replyTo: '', editedAt: '', attachments: [], mentions: [] }]
      return s
    })
    // a missed call is a notice for them, but not one they turned down or missed for another call
    if (!dur && reason !== 'Declined' && reason !== 'Busy on another call') sendAutoNotice(update, { kind: 'chatMessage', key: `call:${c.id}`, fromId: me.id, fromName: me.name, to: [c.peerId], title: `Missed ${kind} from ${me.name || 'the team'}`, body: 'Open the chat to call back.' })
  }

  /* The end of a call, whoever ended it: everything let go, a moment of "Call ended", gone. */
  const finish = useCallback((reason = 'Call ended') => {
    const c = callRef.current
    if (!c || c.phase === 'ended') return
    silence()
    clearTimers()
    const dur = c.startedAt ? Date.now() - c.startedAt : 0
    try { pcRef.current?.close() } catch {}
    pcRef.current = null
    localRef.current?.getTracks().forEach((t) => t.stop())
    localRef.current = null
    remoteRef.current = null
    logCall(c, dur, reason)
    setCall({ ...c, phase: 'ended', reason: dur ? `${reason} · ${clock(dur)}` : reason })
    timers.current.close = setTimeout(() => setCall(null), 1800)
  }, [setCall]) // eslint-disable-line react-hooks/exhaustive-deps

  const makePc = (id) => {
    const pc = new RTCPeerConnection({ iceServers: ICE })
    pcRef.current = pc
    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track])
      remoteRef.current = stream
      tick((n) => n + 1)
    }
    const watch = () => {
      if (callRef.current?.id !== id) return
      const st = pc.connectionState || pc.iceConnectionState
      if (st === 'connected' || st === 'completed') {
        clearTimeout(timers.current.lost)
        if (!callRef.current.startedAt) patch({ phase: 'live', startedAt: Date.now() })
      } else if (st === 'failed') {
        signal(callRef.current.peerId, { kind: 'end', id }).catch(() => {})
        finish(callRef.current.startedAt ? 'Connection lost' : 'Could not connect')
      } else if (st === 'disconnected') {
        clearTimeout(timers.current.lost)
        timers.current.lost = setTimeout(() => { if (callRef.current?.id === id) { signal(callRef.current.peerId, { kind: 'end', id }).catch(() => {}); finish('Connection lost') } }, 10000)
      }
    }
    pc.onconnectionstatechange = watch
    pc.oniceconnectionstatechange = watch
    return pc
  }

  /* ---- the caller ---- */
  const start = useCallback(async (room, video = false) => {
    const me = userRef.current
    if (!remote || !me) return
    if (callRef.current) { toast('You are already in a call.', 'error'); return }
    if (!ready) { toast('Calls are not switched on yet: supabase/chat_calls.sql has to be run once.', 'error'); return }
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') { toast('This browser cannot make calls.', 'error'); return }
    const peer = (stateRef.current.users || []).find((u) => u.id === room.otherId)
    if (!peer || peer.id === me.id) return
    const id = uid()
    setCall({ id, dir: 'out', phase: 'calling', video, peerId: peer.id, peerName: peer.name, peerPhoto: peer.profile?.thumb || '', roomId: room.id, muted: false, camOff: false, facing: 'user' })
    try {
      const stream = await media(video)
      if (callRef.current?.id !== id) { stream.getTracks().forEach((t) => t.stop()); return }
      localRef.current = stream
      tick((n) => n + 1)
      const pc = makePc(id)
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      await pc.setLocalDescription(await pc.createOffer())
      await gathered(pc)
      if (callRef.current?.id !== id) return
      await signal(peer.id, { kind: 'ring', id, from: me.id, fromName: me.name || '', fromPhoto: me.profile?.thumb || '', video, room: room.id, sdp: pc.localDescription.sdp })
      stopTone.current = tone('out')
      timers.current.ring = setTimeout(() => {
        if (callRef.current?.id === id && !callRef.current.answered) { signal(peer.id, { kind: 'cancel', id }).catch(() => {}); finish('No answer') }
      }, RING_FOR)
    } catch (e) {
      if (callRef.current?.id !== id) return
      finish(e?.name === 'NotAllowedError' ? (video ? 'Camera or microphone not allowed' : 'Microphone not allowed') : e?.message || 'Could not call')
    }
  }, [ready, toast, setCall, finish]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- the one being called ---- */
  const accept = async (withVideo) => {
    const c = callRef.current
    if (!c || c.dir !== 'in' || c.phase !== 'ringing') return
    silence()
    clearTimeout(timers.current.ring)
    const video = c.video && withVideo
    patch({ phase: 'connecting', answered: true, video })
    signal(userRef.current.id, { kind: 'taken', id: c.id }).catch(() => {})
    try {
      let stream
      try { stream = await media(video) } catch (e) { if (video) stream = await media(false); else throw e }
      if (callRef.current?.id !== c.id) { stream.getTracks().forEach((t) => t.stop()); return }
      localRef.current = stream
      tick((n) => n + 1)
      const pc = makePc(c.id)
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))
      await pc.setRemoteDescription({ type: 'offer', sdp: c.offer })
      await pc.setLocalDescription(await pc.createAnswer())
      await gathered(pc)
      if (callRef.current?.id !== c.id) return
      await signal(c.peerId, { kind: 'answer', id: c.id, sdp: pc.localDescription.sdp })
    } catch (e) {
      signal(c.peerId, { kind: 'end', id: c.id }).catch(() => {})
      finish(e?.name === 'NotAllowedError' ? 'Microphone not allowed' : 'Could not answer')
    }
  }
  const decline = () => {
    const c = callRef.current
    if (!c) return
    signal(c.peerId, { kind: 'decline', id: c.id }).catch(() => {})
    signal(userRef.current.id, { kind: 'taken', id: c.id }).catch(() => {})
    silence()
    clearTimers()
    setCall(null)
  }
  const hangUp = () => {
    const c = callRef.current
    if (!c) return
    if (c.phase === 'ended') { clearTimers(); setCall(null); return }
    signal(c.peerId, { kind: c.dir === 'out' && !c.answered ? 'cancel' : 'end', id: c.id }).catch(() => {})
    finish(c.dir === 'out' && !c.answered ? 'Cancelled' : 'Call ended')
  }

  /* ---- what arrives on my line ---- */
  const onSignal = useCallback(async (m) => {
    const me = userRef.current
    if (!m || !m.id || !me) return
    const c = callRef.current
    if (m.kind === 'ring') {
      if (m.from === me.id) return
      if (c) { if (c.id !== m.id) signal(m.from, { kind: 'busy', id: m.id }).catch(() => {}); return }
      const peer = (stateRef.current.users || []).find((u) => u.id === m.from)
      setCall({ id: m.id, dir: 'in', phase: 'ringing', video: !!m.video, peerId: m.from, peerName: peer?.name || m.fromName || 'Someone', peerPhoto: peer?.profile?.thumb || m.fromPhoto || '', roomId: m.room, offer: m.sdp, muted: false, camOff: false, facing: 'user' })
      stopTone.current = tone('in')
      timers.current.ring = setTimeout(() => { if (callRef.current?.id === m.id && callRef.current.phase === 'ringing') { silence(); setCall(null) } }, RING_FOR + 3000)
      return
    }
    if (!c || c.id !== m.id) return
    if (m.kind === 'answer' && c.dir === 'out' && !c.answered) {
      silence()
      clearTimeout(timers.current.ring)
      patch({ phase: 'connecting', answered: true })
      try { await pcRef.current?.setRemoteDescription({ type: 'answer', sdp: m.sdp }) } catch { finish('Could not connect') }
    } else if (m.kind === 'decline' && c.dir === 'out') finish('Declined')
    else if (m.kind === 'busy' && c.dir === 'out') finish('Busy on another call')
    else if (m.kind === 'cancel' && c.dir === 'in') { silence(); clearTimers(); setCall(null) }
    else if (m.kind === 'taken' && c.dir === 'in' && c.phase === 'ringing') { silence(); clearTimers(); setCall(null) }
    else if (m.kind === 'end') finish('Call ended')
  }, [setCall, patch, finish]) // eslint-disable-line react-hooks/exhaustive-deps

  // my line, open while I am signed in
  const onSignalRef = useRef(onSignal)
  onSignalRef.current = onSignal
  useEffect(() => {
    if (!remote || !user?.id) return undefined
    const ch = supabase.channel(line(user.id), { config: { private: true } })
      .on('broadcast', { event: 'call' }, ({ payload }) => onSignalRef.current(payload))
      .subscribe((status) => setReady(status === 'SUBSCRIBED'))
    return () => { setReady(false); supabase.removeChannel(ch) }
  }, [user?.id])

  useEffect(() => {
    document.addEventListener('pointerdown', wakeAudio, { once: true, capture: true })
    return () => document.removeEventListener('pointerdown', wakeAudio, { capture: true })
  }, [])

  // leaving the page ends the call for the other side too
  useEffect(() => {
    const bye = () => { const c = callRef.current; if (c && c.phase !== 'ended' && c.peerId) signal(c.peerId, { kind: c.dir === 'out' && !c.answered ? 'cancel' : c.phase === 'ringing' ? 'decline' : 'end', id: c.id }).catch(() => {}) }
    window.addEventListener('pagehide', bye)
    return () => window.removeEventListener('pagehide', bye)
  }, [])

  // the timer on screen
  useEffect(() => {
    if (call?.phase !== 'live') return undefined
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [call?.phase])

  const toggleMute = () => {
    const c = callRef.current
    localRef.current?.getAudioTracks().forEach((t) => { t.enabled = !!c.muted })
    patch({ muted: !c.muted })
  }
  const toggleCam = () => {
    const c = callRef.current
    localRef.current?.getVideoTracks().forEach((t) => { t.enabled = !!c.camOff })
    patch({ camOff: !c.camOff })
  }
  const flip = async () => {
    const c = callRef.current
    const facing = c.facing === 'user' ? 'environment' : 'user'
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } })
      const track = fresh.getVideoTracks()[0]
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(track)
      const old = localRef.current?.getVideoTracks()[0]
      if (old) { localRef.current.removeTrack(old); old.stop() }
      localRef.current?.addTrack(track)
      patch({ facing, camOff: false })
    } catch { toast('Could not switch the camera.', 'error') }
  }

  const value = { start, ready, busy: !!call }
  return (
    <CallsCtx.Provider value={value}>
      {children}
      {call && createPortal(
        <CallScreen call={call} local={localRef.current} remote={remoteRef.current} onAccept={accept} onDecline={decline} onHangUp={hangUp} onMute={toggleMute} onCam={toggleCam} onFlip={flip} />,
        document.body,
      )}
    </CallsCtx.Provider>
  )
}

/* ---------- the screen ---------- */
const I = {
  phone: (p) => <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>,
  video: (p) => <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>,
  mic: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 19v3" /></svg>,
  micOff: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2 2 20 20M9 9v1a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.7M19 10a7 7 0 0 1-1.2 3.9M5 10a7 7 0 0 0 10.6 6M12 19v3" /></svg>,
  camOff: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2 2 20 20M16 16H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2m4 0h4a2 2 0 0 1 2 2v3.3l6-4.3v10" /></svg>,
  flip: () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h3l2-3h8l2 3h3v12H3Z" /><path d="M9 13a3 3 0 0 0 5.2 2M15 13a3 3 0 0 0-5.2-2M14 15h.5v-.5M10 11h-.5v.5" /></svg>,
  down: () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>,
}

function Face({ name, photo, size = 112 }) {
  const initials = (name || '?').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  return photo ? <img className="call-face" src={photo} alt="" style={{ width: size, height: size }} /> : <span className="call-face call-face-i" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>
}

function useStream(ref, stream) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.srcObject !== stream) el.srcObject = stream || null
    if (stream) el.play?.().catch(() => {})
  })
}

function CallScreen({ call, local, remote: far, onAccept, onDecline, onHangUp, onMute, onCam, onFlip }) {
  const [small, setSmall] = useState(false)
  const farVideo = useRef(null)
  const farAudio = useRef(null)
  const nearVideo = useRef(null)
  useStream(farVideo, far)
  useStream(farAudio, far)
  useStream(nearVideo, local)
  const farHasVideo = !!far?.getVideoTracks().some((t) => t.readyState === 'live')
  const showFar = call.video && farHasVideo && call.phase === 'live'
  const showNear = call.video && !!local?.getVideoTracks().length && !call.camOff
  const status = call.phase === 'ringing' ? (call.video ? 'Video call' : 'Voice call')
    : call.phase === 'calling' ? (call.video ? 'Video calling…' : 'Calling…')
      : call.phase === 'connecting' ? 'Connecting…'
        : call.phase === 'live' ? clock(Date.now() - call.startedAt)
          : call.reason
  // the sound always plays through an audio element, so the video can stay muted and autoplay
  const audio = <audio ref={farAudio} autoPlay playsInline />
  if (small && call.phase !== 'ringing' && call.phase !== 'ended') {
    return (
      <>
        {audio}
        <button type="button" className="call-pill" onClick={() => setSmall(false)}>{I.phone({ width: 16, height: 16 })}<span>{call.peerName}</span><b>{status}</b></button>
      </>
    )
  }
  return (
    <div className={`call-screen${showFar ? ' has-video' : ''}`} role="dialog" aria-label={`Call with ${call.peerName}`}>
      {audio}
      {showFar ? <video ref={farVideo} className="call-far" autoPlay playsInline muted /> : <div className="call-bg" style={call.peerPhoto ? { backgroundImage: `url(${call.peerPhoto})` } : undefined} />}
      {showNear && <video ref={nearVideo} className={`call-near${showFar ? '' : ' alone'}${call.facing === 'user' ? ' mirror' : ''}`} autoPlay playsInline muted />}
      {call.phase !== 'ringing' && call.phase !== 'ended' && <button type="button" className="call-min" onClick={() => setSmall(true)} aria-label="Make the call small">{I.down()}</button>}
      <div className={`call-who${showFar || showNear ? ' over' : ''}`}>
        {!showFar && !(showNear && call.phase !== 'ringing') && <Face name={call.peerName} photo={call.peerPhoto} />}
        <strong>{call.peerName}</strong>
        <span>{status}</span>
      </div>
      <div className="call-btns">
        {call.phase === 'ringing' ? (
          <>
            <span className="call-btn-wrap"><button type="button" className="call-btn red" onClick={onDecline} aria-label="Decline">{I.phone({ style: { transform: 'rotate(135deg)' } })}</button><small>Decline</small></span>
            {call.video && <span className="call-btn-wrap"><button type="button" className="call-btn" onClick={() => onAccept(false)} aria-label="Answer with sound only">{I.phone()}</button><small>Sound only</small></span>}
            <span className="call-btn-wrap"><button type="button" className="call-btn green" onClick={() => onAccept(true)} aria-label="Answer">{call.video ? I.video() : I.phone()}</button><small>Answer</small></span>
          </>
        ) : call.phase === 'ended' ? null : (
          <>
            {call.video && <span className="call-btn-wrap"><button type="button" className="call-btn" onClick={onFlip} aria-label="Switch camera">{I.flip()}</button><small>Flip</small></span>}
            {call.video && <span className="call-btn-wrap"><button type="button" className={`call-btn${call.camOff ? ' on' : ''}`} onClick={onCam} aria-label={call.camOff ? 'Turn the camera on' : 'Turn the camera off'}>{call.camOff ? I.camOff() : I.video({ width: 24, height: 24 })}</button><small>{call.camOff ? 'Camera off' : 'Camera'}</small></span>}
            <span className="call-btn-wrap"><button type="button" className={`call-btn${call.muted ? ' on' : ''}`} onClick={onMute} aria-label={call.muted ? 'Unmute' : 'Mute'}>{call.muted ? I.micOff() : I.mic()}</button><small>{call.muted ? 'Muted' : 'Mute'}</small></span>
            <span className="call-btn-wrap"><button type="button" className="call-btn red" onClick={onHangUp} aria-label="End call">{I.phone({ style: { transform: 'rotate(135deg)' } })}</button><small>End</small></span>
          </>
        )}
      </div>
    </div>
  )
}
