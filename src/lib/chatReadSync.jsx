import { useEffect } from 'react'
import { remote, supabase } from './supabase.js'
import { useStore } from './store.jsx'
import { mergeRead, setReadWriter } from './chat.js'

/* Chat read times on every device (Alex, 11 Oct: "the chat notifications have no memory, can't it
   sync"). Mounted once inside the store, for the whole app and TML Chat alike: on sign-in it brings in
   the read times saved from the other devices (supabase/chat_reads.sql) and sends up the ones only this
   browser had, it hears the other devices live, and every new read time from here is saved. Before
   chat_reads.sql has run the table is missing and everything stays as it was, per browser. */
// kept as the database writes them, the same form as a message's created_at, so they compare as strings
const toMap = (rows) => Object.fromEntries((rows || []).map((r) => [r.room, r.read_at]))

export default function ChatReadSync() {
  const { authUser, membership } = useStore()
  const me = authUser?.id
  const ws = membership?.workspace_id
  useEffect(() => {
    if (!remote || !me || !ws) return undefined
    let off = false
    const save = (room, iso) => { supabase.rpc('mark_chat_read', { p_room: room, p_at: iso }).then(() => {}, () => {}) }
    ;(async () => {
      const { data, error } = await supabase.from('chat_reads').select('room, read_at')
      if (off || error) return // the table is not there yet: stay per browser
      const onlyHere = mergeRead(toMap(data))
      onlyHere.forEach(([room, iso]) => save(room, iso))
      setReadWriter(save)
    })()
    const ch = supabase
      .channel(`chat_reads:${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reads', filter: `user_id=eq.${me}` }, (p) => {
        if (p.new?.room) mergeRead({ [p.new.room]: p.new.read_at })
      })
      .subscribe()
    return () => {
      off = true
      setReadWriter(null)
      supabase.removeChannel(ch)
    }
  }, [me, ws])
  return null
}
