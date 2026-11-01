/* TODO: LiveKit needs Alex's OK to add livekit-client and the roar-livekit Edge Function in the hub's Supabase.
   Until then this stands in for `import('livekit-client')` (calls.jsx), so the hub builds without the package: it
   always refuses. calls.jsx never gets this far anyway, because livekitPass() answers "no LiveKit" (null), which sends
   every call the direct way (WebRTC between the two people, the ringing over Supabase Realtime). */
export async function loadLiveKit() {
  throw new Error('Calls through LiveKit are not set up in the hub yet.')
}
