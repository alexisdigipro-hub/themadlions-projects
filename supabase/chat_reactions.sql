-- THEMADLIONS Projects · reactions (🎥 ❤️ 👍 🔥 …) and pinned messages in the chat
-- Paste into Supabase > SQL Editor > New query > Run (after chat_rooms.sql). Safe to run more than once.
-- Everyone may only change their own messages, so a reaction or a pin goes through these
-- functions: they work on any message in a conversation the caller can read, and change nothing else.

alter table messages add column if not exists reactions jsonb not null default '{}'::jsonb;
alter table messages add column if not exists pinned_at timestamptz;

-- one reaction per person, as in Telegram: the caller's id is taken off every emoji, then put on p_emoji
-- when p_on; the old 🎥 likes (chat_likes.sql) of the caller are folded in at the same time
create or replace function chat_react(p_id text, p_emoji text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_chat text;
  v_ws uuid;
  me text := auth.uid()::text;
begin
  if p_emoji is null or length(p_emoji) = 0 or length(p_emoji) > 16 then raise exception 'Bad reaction'; end if;
  select chat_id, workspace_id into v_chat, v_ws from messages where id = p_id;
  if v_ws is null then raise exception 'Message not found'; end if;
  if v_ws <> my_ws() or not can_read_chat(v_chat) then raise exception 'Not allowed'; end if;
  update messages set reactions = coalesce((
    select jsonb_object_agg(k, v) from (
      select e.key as k, (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from jsonb_array_elements_text(e.value) as x where x <> me) as v
      from jsonb_each(coalesce(reactions, '{}'::jsonb)) as e
    ) t where jsonb_array_length(v) > 0
  ), '{}'::jsonb)
  where id = p_id;
  if p_on then
    update messages set reactions = jsonb_set(reactions, array[p_emoji], coalesce(reactions -> p_emoji, '[]'::jsonb) || to_jsonb(me)) where id = p_id;
  end if;
  begin
    update messages set likes = array_remove(likes, auth.uid()) where id = p_id;
  exception when undefined_column then null; -- chat_likes.sql never run
  end;
end $$;
revoke all on function chat_react(text, text, boolean) from public;
grant execute on function chat_react(text, text, boolean) to authenticated;

-- pin or unpin a message for everyone in the conversation
create or replace function chat_pin(p_id text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_chat text;
  v_ws uuid;
begin
  select chat_id, workspace_id into v_chat, v_ws from messages where id = p_id;
  if v_ws is null then raise exception 'Message not found'; end if;
  if v_ws <> my_ws() or not can_read_chat(v_chat) then raise exception 'Not allowed'; end if;
  update messages set pinned_at = case when p_on then now() else null end where id = p_id;
end $$;
revoke all on function chat_pin(text, boolean) from public;
grant execute on function chat_pin(text, boolean) to authenticated;
