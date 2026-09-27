-- THEMADLIONS Projects · chat rooms (Telegram-style: team room, one room per project, groups, direct messages)
-- Paste into Supabase > SQL Editor > New query > Run (after chat.sql and files.sql). Safe to run more than once.
--
-- Rooms are addressed by a text id the app builds:
--   'team'            the whole team, where every old message lands
--   'p:<projectId>'   the project's own room, readable by whoever can see the project
--   a row in `chats`  a group (administrators create it and pick the members) or a direct
--                     message between two people (id 'd:<uid>:<uid>', the two ids sorted)
-- Nobody outside a group or a direct conversation can read it, administrators included: the
-- messages policies below go through can_read_chat(), which asks the chats row for its members.

create table if not exists chats (
  id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('group', 'direct')),
  name text not null default '',
  members uuid[] not null default '{}',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  updated_by uuid
);
create index if not exists chats_ws on chats (workspace_id);

drop trigger if exists chats_touch on chats;
create trigger chats_touch before insert or update on chats for each row execute function touch_updated_at();

-- messages learn which room they belong to, what they answer, when they were edited, and what they carry
alter table messages add column if not exists chat_id text not null default 'team';
alter table messages add column if not exists reply_to text;
alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table messages add column if not exists mentions uuid[] not null default '{}';
create index if not exists messages_ws_chat_created on messages (workspace_id, chat_id, created_at);

-- Who may read (and write into) a room. Stable and security definer so the policies on
-- messages and on storage can call it without a member needing to read the chats table directly.
create or replace function can_read_chat(p_chat text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p_chat is null or p_chat = '' or p_chat = 'team' then my_ws() is not null
    when left(p_chat, 2) = 'p:' then can_view_project(substr(p_chat, 3))
    else exists (select 1 from chats where id = p_chat and workspace_id = my_ws() and auth.uid() = any(members))
  end
$$;
revoke all on function can_read_chat(text) from public;
grant execute on function can_read_chat(text) to authenticated;

-- rooms: members read theirs; administrators make and change groups; anyone opens a direct
-- conversation that includes themselves and exactly one other person
alter table chats enable row level security;
drop policy if exists chats_select on chats;
drop policy if exists chats_insert on chats;
drop policy if exists chats_update on chats;
drop policy if exists chats_delete on chats;
create policy chats_select on chats for select using (workspace_id = my_ws() and auth.uid() = any(members));
create policy chats_insert on chats for insert with check (
  workspace_id = my_ws() and (
    (kind = 'group' and is_admin() and auth.uid() = any(members))
    or (kind = 'direct' and auth.uid() = any(members) and cardinality(members) = 2 and members[1] <> members[2]
        and id = 'd:' || least(members[1]::text collate "C", members[2]::text collate "C") || ':' || greatest(members[1]::text collate "C", members[2]::text collate "C"))
  )
);
create policy chats_update on chats for update using (workspace_id = my_ws() and kind = 'group' and is_admin());
create policy chats_delete on chats for delete using (workspace_id = my_ws() and kind = 'group' and is_admin());

-- messages: read and write only inside rooms you belong to; edit only your own
drop policy if exists messages_select on messages;
drop policy if exists messages_insert on messages;
drop policy if exists messages_update on messages;
drop policy if exists messages_delete on messages;
create policy messages_select on messages for select using (workspace_id = my_ws() and can_read_chat(chat_id));
create policy messages_insert on messages for insert with check (workspace_id = my_ws() and user_id = auth.uid() and can_read_chat(chat_id));
create policy messages_update on messages for update using (workspace_id = my_ws() and user_id = auth.uid() and can_read_chat(chat_id));
create policy messages_delete on messages for delete using (workspace_id = my_ws() and can_read_chat(chat_id) and (user_id = auth.uid() or is_admin()));

-- attachments live in the private "files" bucket under chat/<roomId>/<fileId>-<name>, with the
-- colons of a room id written as underscores (no id contains one). The existing files_* policies
-- key on a project id in the first folder, so chat paths need their own.
create or replace function chat_of_path(p_name text) returns text
language sql immutable as $$ select replace(split_part(p_name, '/', 2), '_', ':') $$;
drop policy if exists chat_files_select on storage.objects;
drop policy if exists chat_files_insert on storage.objects;
drop policy if exists chat_files_delete on storage.objects;
create policy chat_files_select on storage.objects for select using (bucket_id = 'files' and split_part(name, '/', 1) = 'chat' and can_read_chat(chat_of_path(name)));
create policy chat_files_insert on storage.objects for insert with check (bucket_id = 'files' and split_part(name, '/', 1) = 'chat' and can_read_chat(chat_of_path(name)));
create policy chat_files_delete on storage.objects for delete using (bucket_id = 'files' and split_part(name, '/', 1) = 'chat' and can_read_chat(chat_of_path(name)) and (owner = auth.uid() or is_admin()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chats') then
    alter publication supabase_realtime add table chats;
  end if;
end $$;
