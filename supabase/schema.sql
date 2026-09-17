-- THEMADLIONS Projects · Phase 2 schema (document model)
-- Paste the whole file into Supabase > SQL Editor > New query > Run. Safe to run more than once.
--
-- Design: each project is stored as one JSON document (same shape the app already uses),
-- so every module works unchanged. Membership, project access and edit rights are enforced
-- by Row Level Security; per-module view/edit levels are applied by the app.

create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'THEMADLIONS',
  subtitle text not null default 'Projects',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  email text,
  role text not null default 'member' check (role in ('admin','member')),
  permissions jsonb not null default '{}'::jsonb,
  project_access jsonb not null default '"all"'::jsonb,
  active boolean not null default true,
  created_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'member' check (role in ('admin','member')),
  permissions jsonb not null default '{}'::jsonb,
  project_access jsonb not null default '"all"'::jsonb,
  created_at timestamptz default now(),
  unique (workspace_id, email)
);

create table if not exists projects (
  id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid
);

create table if not exists events (
  id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id text,
  data jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid
);

-- ---------- helpers (security definer breaks RLS recursion on members) ----------
create or replace function my_ws() returns uuid
language sql stable security definer set search_path = public as $$
  select workspace_id from members where user_id = auth.uid() and active limit 1
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from members where user_id = auth.uid() and active limit 1), false)
$$;

create or replace function can_view_project(pid text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select role = 'admin' or project_access = '"all"'::jsonb or project_access ? pid
    from members where user_id = auth.uid() and active limit 1
  ), false)
$$;

create or replace function can_edit_any() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select role = 'admin' or exists (select 1 from jsonb_each_text(permissions) where value = 'edit')
    from members where user_id = auth.uid() and active limit 1
  ), false)
$$;

create or replace function can_edit_project(pid text) returns boolean
language sql stable security definer set search_path = public as $$
  select can_view_project(pid) and can_edit_any()
$$;

-- First sign-in: creates the workspace for the very first user (who becomes admin),
-- or turns a pending invite into a membership. Returns the membership row or null.
create or replace function bootstrap(p_name text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  em text;
  ws uuid;
  m members;
  inv invites;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into m from members where user_id = uid limit 1;
  if found then return to_jsonb(m); end if;
  select lower(email) into em from auth.users where id = uid;
  select * into inv from invites where lower(email) = em limit 1;
  if found then
    insert into members (workspace_id, user_id, name, email, role, permissions, project_access)
    values (inv.workspace_id, uid, coalesce(nullif(p_name, ''), inv.name, split_part(em, '@', 1)), em, inv.role, inv.permissions, inv.project_access)
    returning * into m;
    delete from invites where id = inv.id;
    return to_jsonb(m);
  end if;
  if not exists (select 1 from workspaces) then
    insert into workspaces (name) values ('THEMADLIONS') returning id into ws;
    insert into members (workspace_id, user_id, name, email, role, permissions, project_access)
    values (ws, uid, coalesce(nullif(p_name, ''), split_part(em, '@', 1)), em, 'admin', '{}'::jsonb, '"all"'::jsonb)
    returning * into m;
    return to_jsonb(m);
  end if;
  return null;
end $$;

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end $$;
drop trigger if exists projects_touch on projects;
create trigger projects_touch before insert or update on projects for each row execute function touch_updated_at();
drop trigger if exists events_touch on events;
create trigger events_touch before insert or update on events for each row execute function touch_updated_at();

-- ---------- row level security ----------
alter table workspaces enable row level security;
alter table members enable row level security;
alter table invites enable row level security;
alter table projects enable row level security;
alter table events enable row level security;

drop policy if exists ws_select on workspaces;
drop policy if exists ws_update on workspaces;
create policy ws_select on workspaces for select using (id = my_ws());
create policy ws_update on workspaces for update using (is_admin() and id = my_ws());

drop policy if exists members_select on members;
drop policy if exists members_admin on members;
create policy members_select on members for select using (workspace_id = my_ws());
create policy members_admin on members for all using (is_admin() and workspace_id = my_ws()) with check (is_admin() and workspace_id = my_ws());

drop policy if exists invites_admin on invites;
create policy invites_admin on invites for all using (is_admin() and workspace_id = my_ws()) with check (is_admin() and workspace_id = my_ws());

drop policy if exists projects_select on projects;
drop policy if exists projects_insert on projects;
drop policy if exists projects_update on projects;
drop policy if exists projects_delete on projects;
create policy projects_select on projects for select using (workspace_id = my_ws() and can_view_project(id));
create policy projects_insert on projects for insert with check (workspace_id = my_ws() and can_edit_any());
create policy projects_update on projects for update using (workspace_id = my_ws() and can_edit_project(id));
create policy projects_delete on projects for delete using (workspace_id = my_ws() and is_admin());

drop policy if exists events_select on events;
drop policy if exists events_write on events;
create policy events_select on events for select using (workspace_id = my_ws() and (project_id is null or can_view_project(project_id)));
create policy events_write on events for all
  using (workspace_id = my_ws() and (project_id is null and can_edit_any() or can_edit_project(project_id)))
  with check (workspace_id = my_ws() and (project_id is null and can_edit_any() or can_edit_project(project_id)));

-- live updates for everyone with the app open
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'projects') then
    alter publication supabase_realtime add table projects;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'events') then
    alter publication supabase_realtime add table events;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'members') then
    alter publication supabase_realtime add table members;
  end if;
end $$;
