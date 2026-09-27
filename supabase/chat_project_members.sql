-- THEMADLIONS Projects · who is in a project's chat room
-- Paste into Supabase > SQL Editor > New query > Run (after chat_rooms.sql). Safe to run more than once.
--
-- A project's room is open to everyone who can see the project, unless an administrator took
-- them out of the conversation (Chat > project room > Members). The project document keeps the
-- list in data.chatExcluded (member ids). Administrators are never excluded.

create or replace function can_read_chat(p_chat text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p_chat is null or p_chat = '' or p_chat = 'team' then my_ws() is not null
    when left(p_chat, 2) = 'p:' then can_view_project(substr(p_chat, 3)) and (
      is_admin() or not exists (
        select 1 from projects
        where id = substr(p_chat, 3) and workspace_id = my_ws()
          and jsonb_typeof(data -> 'chatExcluded') = 'array'
          and (data -> 'chatExcluded') ? auth.uid()::text
      )
    )
    else exists (select 1 from chats where id = p_chat and workspace_id = my_ws() and auth.uid() = any(members))
  end
$$;
revoke all on function can_read_chat(text) from public;
grant execute on function can_read_chat(text) to authenticated;
