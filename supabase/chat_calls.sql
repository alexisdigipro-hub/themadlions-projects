-- THEMADLIONS Projects · voice and video calls in the chat (Alex, 8 Oct 2026)
--
-- A call is set up through Supabase Realtime: each person listens on a private line of their own,
-- "call:u:<their user id>", and the caller drops the ring (and later the answer, hang up) on the
-- other person's line. The sound and picture themselves go straight between the two devices
-- (WebRTC), never through Supabase.
--
-- Who may: only you listen on your own line; anyone of the same workspace may write to it.
-- Safe to run again.


drop policy if exists tml_call_listen on realtime.messages;
create policy tml_call_listen on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'call:u:' || auth.uid()::text
  );

drop policy if exists tml_call_ring on realtime.messages;
create policy tml_call_ring on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) like 'call:u:%'
    and exists (
      select 1 from public.members m
      where m.user_id::text = substr((select realtime.topic()), 8)
        and m.active
        and m.workspace_id = public.my_ws()
    )
  );
