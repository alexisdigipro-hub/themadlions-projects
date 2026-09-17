-- THEMADLIONS Projects · notices (pop-up messages to chosen teammates, with "got it" confirmations)
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.

create table if not exists notices (
  id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  from_id uuid,
  recipients jsonb not null default '["all"]'::jsonb,   -- ["all"] or a list of member user ids
  data jsonb not null,                                   -- { title, body, fromName, to, acks: {userId: iso}, createdAt }
  updated_at timestamptz default now(),
  updated_by uuid
);
create index if not exists notices_ws on notices (workspace_id);

drop trigger if exists notices_touch on notices;
create trigger notices_touch before insert or update on notices for each row execute function touch_updated_at();

create or replace function notice_for_me(r jsonb, sender uuid) returns boolean
language sql stable as $$
  select is_admin() or sender = auth.uid() or r ? 'all' or r ? (auth.uid()::text)
$$;

alter table notices enable row level security;
drop policy if exists notices_select on notices;
drop policy if exists notices_insert on notices;
drop policy if exists notices_update on notices;
drop policy if exists notices_delete on notices;
create policy notices_select on notices for select using (workspace_id = my_ws() and notice_for_me(recipients, from_id));
create policy notices_insert on notices for insert with check (workspace_id = my_ws() and from_id = auth.uid());
-- recipients update the row to record their "got it"; the sender and admins can edit too
create policy notices_update on notices for update using (workspace_id = my_ws() and notice_for_me(recipients, from_id));
create policy notices_delete on notices for delete using (workspace_id = my_ws() and (from_id = auth.uid() or is_admin()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notices') then
    alter publication supabase_realtime add table notices;
  end if;
end $$;
