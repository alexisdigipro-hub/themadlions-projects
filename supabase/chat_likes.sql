-- THEMADLIONS Projects · hearts on chat messages (double tap a message on a phone)
-- Paste into Supabase > SQL Editor > New query > Run (after chat_rooms.sql). Safe to run more than once.
-- Everyone may only change their own messages, so a heart goes through this function: it adds or
-- removes the caller's own id, on a message in a conversation they can read, and nothing else.

alter table messages add column if not exists likes uuid[] not null default '{}';

create or replace function chat_like(p_id text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_chat text;
  v_ws uuid;
begin
  select chat_id, workspace_id into v_chat, v_ws from messages where id = p_id;
  if v_ws is null then raise exception 'Message not found'; end if;
  if v_ws <> my_ws() or not can_read_chat(v_chat) then raise exception 'Not allowed'; end if;
  if p_on then
    update messages set likes = array_append(array_remove(likes, auth.uid()), auth.uid()) where id = p_id;
  else
    update messages set likes = array_remove(likes, auth.uid()) where id = p_id;
  end if;
end $$;

revoke all on function chat_like(text, boolean) from public;
grant execute on function chat_like(text, boolean) to authenticated;
