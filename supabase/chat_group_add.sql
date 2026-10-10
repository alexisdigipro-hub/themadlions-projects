-- THEMADLIONS Projects · the people in a chat group can add others to it
-- Paste into Supabase > SQL Editor > New query > Run (after chat_rooms.sql). Safe to run more than once.
--
-- Alex (10 Oct): a new group starts with the administrator, Mariza and Elias, "and then they or I
-- add whoever we want". So anyone in a group may add people to it. Only an administrator may take
-- someone out, rename the group or delete it: if a member's save tries to, the database keeps
-- the group as it was and only adds the new people.

drop policy if exists chats_update on chats;
create policy chats_update on chats for update
  using (workspace_id = my_ws() and kind = 'group' and (is_admin() or auth.uid() = any(members)))
  with check (workspace_id = my_ws() and kind = 'group' and (is_admin() or auth.uid() = any(members)));

create or replace function chats_guard() returns trigger language plpgsql as $$
begin
  if not is_admin() then
    new.id := old.id;
    new.workspace_id := old.workspace_id;
    new.kind := old.kind;
    new.name := old.name;
    new.created_by := old.created_by;
    -- a member only adds: everyone already in stays in
    new.members := old.members || array(select distinct m from unnest(new.members) m where not (m = any(old.members)));
  end if;
  return new;
end $$;
drop trigger if exists chats_guard on chats;
create trigger chats_guard before update on chats for each row execute function chats_guard();
