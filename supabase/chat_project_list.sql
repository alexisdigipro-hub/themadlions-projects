-- A project's conversation with a members list (Alex, 11 Oct: "a project's group starts with only
-- Mariza and Elias, then we add people"). A project room switched on since then keeps
-- data.chatMembers; only those people (who must also be able to see the project) and the
-- administrators read it. Older rooms without the list keep working as before: everyone who can see
-- the project, minus data.chatExcluded. Same rule as chatExcluded in src/lib/chat.js. Safe to run again.

create or replace function can_read_chat(p_chat text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p_chat is null or p_chat = '' or p_chat = 'team' then my_ws() is not null
    when left(p_chat, 2) = 'p:' then can_view_project(substr(p_chat, 3)) and (
      is_admin() or not exists (
        select 1 from projects
        where id = substr(p_chat, 3) and workspace_id = my_ws()
          and (
            (jsonb_typeof(data -> 'chatMembers') = 'array' and not ((data -> 'chatMembers') ? auth.uid()::text))
            or (jsonb_typeof(data -> 'chatMembers') is distinct from 'array'
                and jsonb_typeof(data -> 'chatExcluded') = 'array' and (data -> 'chatExcluded') ? auth.uid()::text)
          )
      )
    )
    else exists (select 1 from chats where id = p_chat and workspace_id = my_ws() and auth.uid() = any(members))
  end
$$;
