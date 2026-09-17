-- THEMADLIONS Projects · personal work log (My work): each member's jobs, amounts, paid / pending
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.

create table if not exists worklog (
  id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,
  data jsonb not null,   -- { date, client, description, amount, status: 'pending'|'paid', paidDate, method, notes, projectId }
  updated_at timestamptz default now(),
  updated_by uuid
);
create index if not exists worklog_ws_user on worklog (workspace_id, user_id);

drop trigger if exists worklog_touch on worklog;
create trigger worklog_touch before insert or update on worklog for each row execute function touch_updated_at();

alter table worklog enable row level security;
drop policy if exists worklog_select on worklog;
drop policy if exists worklog_write on worklog;
-- everyone sees and edits their own rows; administrators see and edit everyone's
create policy worklog_select on worklog for select using (workspace_id = my_ws() and (user_id = auth.uid() or is_admin()));
create policy worklog_write on worklog for all using (workspace_id = my_ws() and (user_id = auth.uid() or is_admin())) with check (workspace_id = my_ws() and (user_id = auth.uid() or is_admin()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'worklog') then
    alter publication supabase_realtime add table worklog;
  end if;
end $$;
