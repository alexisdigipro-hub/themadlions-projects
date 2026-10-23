-- Roardino inside the hub (Alex, 23 Oct 2026): the ordino maker of themadlions.com/roardino, copied into the hub
-- (hub.themadlions.com/roardino/, side menu Roardino). It replaces the old project Ordino (project.shootingDays
-- call sheets), whose ordinos are moved in here once by the page itself (legacy_key = project id : shoot day id).
-- Who: the Ordino permission (my_perm('callsheets')): edit makes and sends, view sees; everyone on a project
-- also sees that project's ordinos (the Overview's Ordino button). Safe to re-run.

create table if not exists roardino_ordinos (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default my_ws() references workspaces(id) on delete cascade,
  project_id   text,
  legacy_key   text,
  data         jsonb not null default '{}'::jsonb,
  token        text unique,
  published    jsonb,
  published_at timestamptz,
  opens        integer not null default 0,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint roardino_ordinos_size check (octet_length(data::text) <= 2000000)
);
create index if not exists roardino_ordinos_ws on roardino_ordinos (workspace_id, updated_at desc);
create index if not exists roardino_ordinos_project on roardino_ordinos (project_id);
do $$ begin
  alter table roardino_ordinos add constraint roardino_ordinos_legacy unique (workspace_id, legacy_key);
exception when duplicate_object or duplicate_table then null; end $$;

alter table roardino_ordinos enable row level security;

drop policy if exists roardino_select on roardino_ordinos;
create policy roardino_select on roardino_ordinos for select to authenticated using (
  workspace_id = my_ws() and (
    (my_perm('callsheets') in ('view', 'edit') and (project_id is null or can_view_project(project_id)))
    or (project_id is not null and can_view_project(project_id))
  ));

drop policy if exists roardino_insert on roardino_ordinos;
create policy roardino_insert on roardino_ordinos for insert to authenticated with check (
  workspace_id = my_ws() and my_perm('callsheets') = 'edit' and (project_id is null or can_view_project(project_id)));

drop policy if exists roardino_update on roardino_ordinos;
create policy roardino_update on roardino_ordinos for update to authenticated
  using (workspace_id = my_ws() and my_perm('callsheets') = 'edit' and (project_id is null or can_view_project(project_id)))
  with check (workspace_id = my_ws() and my_perm('callsheets') = 'edit' and (project_id is null or can_view_project(project_id)));

drop policy if exists roardino_delete on roardino_ordinos;
create policy roardino_delete on roardino_ordinos for delete to authenticated using (
  workspace_id = my_ws() and my_perm('callsheets') = 'edit' and (project_id is null or can_view_project(project_id)));

-- the page writes the working copy only; the link fields are set by roardino_publish
revoke all on roardino_ordinos from anon;
revoke insert, update on roardino_ordinos from authenticated;
grant insert (project_id, legacy_key, data) on roardino_ordinos to authenticated;
grant update (project_id, data, updated_at) on roardino_ordinos to authenticated;
grant select, delete on roardino_ordinos to authenticated;

-- Send: the working copy is copied behind the ordino's short link (the same link on every republish)
create or replace function roardino_publish(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text; v_pid text;
begin
  select token, project_id into v_token, v_pid from roardino_ordinos where id = p_id and workspace_id = my_ws();
  if not found or my_perm('callsheets') <> 'edit' or (v_pid is not null and not can_view_project(v_pid)) then
    raise exception 'roardino: not allowed';
  end if;
  if v_token is null then
    loop
      v_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
      exit when not exists (select 1 from roardino_ordinos where token = v_token);
    end loop;
  end if;
  update roardino_ordinos set token = v_token, published = data, published_at = now() where id = p_id;
  return v_token;
end $$;

-- the link page, without sign-in: only the published copy, and it counts the open
create or replace function roardino_get(p_token text, p_visitor text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb; u timestamptz;
begin
  update roardino_ordinos set opens = opens + 1
    where token = p_token and published is not null
    returning published, published_at into v, u;
  if v is null then return null; end if;
  return jsonb_build_object('data', v, 'updatedAt', u);
end $$;

revoke all on function roardino_publish(uuid) from public, anon;
revoke all on function roardino_get(text, text) from public;
grant execute on function roardino_publish(uuid) to authenticated;
grant execute on function roardino_get(text, text) to anon, authenticated;
