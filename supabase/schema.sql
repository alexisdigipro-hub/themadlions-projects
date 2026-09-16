-- THEMADLIONS Projects · Phase 2 schema
-- Paste into Supabase > SQL editor > New query > Run.
-- Auth is handled by Supabase Auth (email + Google). Every table is protected by RLS.

create extension if not exists "pgcrypto";

-- One workspace (The Mad Lions). Multi-workspace is possible later.
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'THEMADLIONS',
  subtitle text not null default 'Projects',
  created_at timestamptz default now()
);

-- Membership + permissions. permissions is {module: 'none'|'view'|'edit'}, project_access is 'all' or an array of project ids.
create table if not exists members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  email text,
  role text not null default 'member' check (role in ('admin','member')),
  permissions jsonb not null default '{}'::jsonb,
  project_access jsonb not null default '"all"'::jsonb,
  active boolean not null default true,
  created_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  title text not null,
  category text not null check (category in ('Feature Film','Music Video','Advertise','Editing')),
  status text not null default 'Development',
  client text, director text, producer text,
  start_date date, end_date date,
  notes text, production_notes text,
  color text default '#C8503F',
  script_text text, script_file_name text, script_format text, script_imported_at timestamptz,
  breakdown_status text default 'none',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  number text, heading text, int_ext text, location text, time_of_day text,
  synopsis text, body text, eighths int default 1,
  characters jsonb default '[]'::jsonb,
  elements jsonb default '{}'::jsonb,
  flags jsonb default '[]'::jsonb,
  notes text,
  day_id uuid,
  sort_order int default 0
);

create table if not exists shooting_days (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  date date not null, unit text default 'Main unit',
  call_time time, wrap_time time,
  location_id uuid, notes text,
  scene_ids jsonb default '[]'::jsonb,
  call_sheet jsonb default '{}'::jsonb
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null, address text, type text, notes text, contact text, phone text,
  scene_locations jsonb default '[]'::jsonb
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  kind text check (kind in ('cast','crew')),
  name text not null, character text, dept text, role text, phone text, email text,
  call_offset int default 0
);

create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null, url text not null, kind text, note text
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  source_day_id uuid,
  type text not null default 'prep',
  title text not null, date date not null,
  start_time time, end_time time,
  location_text text, notes text,
  created_by uuid references auth.users(id)
);

-- Script files live in Storage bucket "scripts" (private). Path: {project_id}/{filename}.

-- ---------- helpers ----------
create or replace function my_member(ws uuid) returns members
language sql stable security definer as $$
  select * from members where workspace_id = ws and user_id = auth.uid() and active limit 1
$$;

create or replace function can_view_project(pid uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from projects p join members m on m.workspace_id = p.workspace_id
    where p.id = pid and m.user_id = auth.uid() and m.active
      and (m.role = 'admin' or m.project_access = '"all"'::jsonb or m.project_access ? pid::text)
  )
$$;

create or replace function can_edit_module(pid uuid, module text) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from projects p join members m on m.workspace_id = p.workspace_id
    where p.id = pid and m.user_id = auth.uid() and m.active
      and (m.role = 'admin' or (
        (m.project_access = '"all"'::jsonb or m.project_access ? pid::text)
        and m.permissions ->> module = 'edit'))
  )
$$;

-- ---------- RLS ----------
alter table workspaces enable row level security;
alter table members enable row level security;
alter table projects enable row level security;
alter table scenes enable row level security;
alter table shooting_days enable row level security;
alter table locations enable row level security;
alter table contacts enable row level security;
alter table links enable row level security;
alter table events enable row level security;

create policy "members see their workspace" on workspaces for select using (exists (select 1 from members m where m.workspace_id = id and m.user_id = auth.uid()));
create policy "admins edit workspace" on workspaces for update using (exists (select 1 from members m where m.workspace_id = id and m.user_id = auth.uid() and m.role = 'admin'));

create policy "members see members" on members for select using (exists (select 1 from members m where m.workspace_id = members.workspace_id and m.user_id = auth.uid()));
create policy "admins manage members" on members for all using (exists (select 1 from members m where m.workspace_id = members.workspace_id and m.user_id = auth.uid() and m.role = 'admin'));

create policy "view projects" on projects for select using (can_view_project(id));
create policy "edit projects" on projects for update using (can_edit_module(id, 'projects'));
create policy "create projects" on projects for insert with check (exists (select 1 from members m where m.workspace_id = projects.workspace_id and m.user_id = auth.uid() and (m.role = 'admin' or m.permissions ->> 'projects' = 'edit')));
create policy "delete projects" on projects for delete using (can_edit_module(id, 'projects'));

create policy "view scenes" on scenes for select using (can_view_project(project_id));
create policy "edit scenes" on scenes for all using (can_edit_module(project_id, 'breakdown')) with check (can_edit_module(project_id, 'breakdown'));
create policy "view days" on shooting_days for select using (can_view_project(project_id));
create policy "edit days" on shooting_days for all using (can_edit_module(project_id, 'schedule')) with check (can_edit_module(project_id, 'schedule'));
create policy "view locations" on locations for select using (can_view_project(project_id));
create policy "edit locations" on locations for all using (can_edit_module(project_id, 'locations')) with check (can_edit_module(project_id, 'locations'));
create policy "view contacts" on contacts for select using (can_view_project(project_id));
create policy "edit contacts" on contacts for all using (can_edit_module(project_id, 'contacts')) with check (can_edit_module(project_id, 'contacts'));
create policy "view links" on links for select using (can_view_project(project_id));
create policy "edit links" on links for all using (can_edit_module(project_id, 'files')) with check (can_edit_module(project_id, 'files'));
create policy "view events" on events for select using (project_id is null or can_view_project(project_id));
create policy "edit events" on events for all using (project_id is null or can_edit_module(project_id, 'calendar')) with check (project_id is null or can_edit_module(project_id, 'calendar'));

-- Edge Function "breakdown" (Deno) will hold ANTHROPIC_API_KEY as a secret and
-- accept {scenes:[...]} from the browser, so the key never ships to clients.
