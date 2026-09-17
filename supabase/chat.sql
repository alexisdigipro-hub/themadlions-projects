-- THEMADLIONS Projects · team chat
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.

create table if not exists messages (
  id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid,
  user_name text not null default '',
  text text not null,
  source text not null default 'app' check (source in ('app', 'telegram')),
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  updated_by uuid
);
create index if not exists messages_ws_created on messages (workspace_id, created_at);

drop trigger if exists messages_touch on messages;
create trigger messages_touch before insert or update on messages for each row execute function touch_updated_at();

alter table messages enable row level security;
drop policy if exists messages_select on messages;
drop policy if exists messages_insert on messages;
drop policy if exists messages_delete on messages;
create policy messages_select on messages for select using (workspace_id = my_ws());
create policy messages_insert on messages for insert with check (workspace_id = my_ws() and (user_id = auth.uid() or user_id is null));
create policy messages_delete on messages for delete using (workspace_id = my_ws() and (user_id = auth.uid() or is_admin()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
