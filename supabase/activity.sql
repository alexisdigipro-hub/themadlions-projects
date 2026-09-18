-- THEMADLIONS Projects · activity log (who changed what, when). Administrators read it under Settings > Data > Activity.
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.

create table if not exists activity (
  id bigserial primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid,
  user_name text not null default '',
  action text not null,        -- created | updated | deleted | locked | unlocked | removed_member ...
  target text not null,        -- 'project', 'event', 'member', ...
  target_name text not null default '',
  project_id text,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists activity_ws_time on activity (workspace_id, created_at desc);

alter table activity enable row level security;
drop policy if exists activity_insert on activity;
drop policy if exists activity_select on activity;
create policy activity_insert on activity for insert with check (workspace_id = my_ws() and user_id = auth.uid());
create policy activity_select on activity for select using (workspace_id = my_ws() and is_admin());

-- keep it tidy: drop entries older than 180 days whenever a new one lands (cheap enough at this size)
create or replace function activity_prune() returns trigger language plpgsql as $$
begin
  delete from activity where workspace_id = new.workspace_id and created_at < now() - interval '180 days';
  return new;
end $$;
drop trigger if exists activity_prune on activity;
create trigger activity_prune after insert on activity for each statement execute function activity_prune();
