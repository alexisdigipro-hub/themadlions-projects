-- RoarMe project chats, phase 3: the hub keeps each project's RoarMe group in step (Alex, 20 Oct 2026). Safe to run again.
-- Needs roarme_link.sql, and RoarMe's hub-bridge.sql on RoarMe's side.
--
-- A project gets a RoarMe group only when an administrator switches it on (projects.data.roarme = true; Alex chose
-- a switch per project). Who is in it follows the hub's own rule for a project's chat (src/lib/chat.js):
-- active members who can see the project (administrator, access "all", or the project in project_access), and,
-- unless an administrator, on data.chatMembers when the project keeps that list, otherwise not on data.chatExcluded.
-- RoarMe then keeps only those who linked their own RoarMe account.
--
-- Any change that can move someone in or out (the switch, the title, chat members, a member's access, role or
-- active flag, a RoarMe link) asks the Edge Function "roarme-sync" to run, through pg_net. It re-checks every
-- switched-on project and closes the groups of projects switched off or deleted, so a missed call is mended by
-- the next one; an administrator can also press Sync now. Taking people out is part of every run.

alter table public.roarme_conf add column if not exists sync_token text;
update public.roarme_conf set sync_token = encode(extensions.gen_random_bytes(32), 'hex') where id = 1 and sync_token is null;

create table if not exists public.roarme_groups (
  project_id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  room_id uuid,
  members int not null default 0,
  synced_at timestamptz,
  closed_at timestamptz,
  last_error text not null default ''
);
alter table public.roarme_groups enable row level security;
drop policy if exists roarme_groups_read on public.roarme_groups;
create policy roarme_groups_read on public.roarme_groups for select to authenticated
  using (workspace_id = public.my_ws() and public.is_admin());
-- written only by the roarme-sync function

-- every project to look at: switched on (people listed), or holding a group that must now close
create or replace function public.roarme_sync_plan()
returns table (project_id text, workspace_id uuid, title text, enabled boolean, people uuid[])
language sql stable security definer set search_path = public as $$
  select p.id, p.workspace_id, coalesce(nullif(trim(p.data->>'title'), ''), 'Project'), true,
    coalesce((select array_agg(m.user_id) from members m
      where m.workspace_id = p.workspace_id and m.active
        and (m.role = 'admin' or m.project_access = '"all"'::jsonb or m.project_access ? p.id)
        and (m.role = 'admin' or case when jsonb_typeof(p.data->'chatMembers') = 'array'
               then (p.data->'chatMembers') ? m.user_id::text
               else not coalesce((p.data->'chatExcluded') ? m.user_id::text, false) end)), '{}')
  from projects p where (p.data->>'roarme') = 'true'
  union all
  select g.project_id, g.workspace_id, '', false, '{}'::uuid[] from roarme_groups g
  where g.closed_at is null and not exists (select 1 from projects p where p.id = g.project_id and (p.data->>'roarme') = 'true')
$$;
revoke all on function public.roarme_sync_plan() from public, anon, authenticated;
grant execute on function public.roarme_sync_plan() to service_role;

-- ask roarme-sync to run (async, through pg_net; the token never leaves the database and the function)
create or replace function public.roarme_kick() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare t text;
begin
  select sync_token into t from roarme_conf where id = 1;
  if t is null then return; end if;
  perform net.http_post(
    url := 'https://naibamqexcqnqhbbqafa.supabase.co/functions/v1/roarme-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-token', t),
    body := '{"action":"run"}'::jsonb,
    timeout_milliseconds := 20000);
exception when others then
  -- a failed call must never stop the save that caused it; the next change or Sync now catches up
  null;
end $$;
revoke all on function public.roarme_kick() from public, anon, authenticated;

create or replace function public.roarme_kick_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.roarme_kick();
  return null;
end $$;

-- projects: only the changes that matter, so ordinary edits of a project do not call out
drop trigger if exists roarme_projects_ins on public.projects;
create trigger roarme_projects_ins after insert on public.projects for each row
  when ((new.data->>'roarme') = 'true') execute function public.roarme_kick_trigger();
drop trigger if exists roarme_projects_upd on public.projects;
create trigger roarme_projects_upd after update on public.projects for each row
  when ((old.data->'roarme') is distinct from (new.data->'roarme')
     or ((new.data->>'roarme') = 'true' and ((old.data->'title') is distinct from (new.data->'title')
        or (old.data->'chatMembers') is distinct from (new.data->'chatMembers')
        or (old.data->'chatExcluded') is distinct from (new.data->'chatExcluded'))))
  execute function public.roarme_kick_trigger();
drop trigger if exists roarme_projects_del on public.projects;
create trigger roarme_projects_del after delete on public.projects for each row
  when ((old.data->>'roarme') = 'true') execute function public.roarme_kick_trigger();

-- members: access, role, active, joining or leaving the team
drop trigger if exists roarme_members_ins_del on public.members;
create trigger roarme_members_ins_del after insert or delete on public.members for each row execute function public.roarme_kick_trigger();
drop trigger if exists roarme_members_upd on public.members;
create trigger roarme_members_upd after update on public.members for each row
  when (old.active is distinct from new.active or old.role is distinct from new.role or old.project_access is distinct from new.project_access)
  execute function public.roarme_kick_trigger();

-- a new RoarMe link puts the person in their projects' groups (a removed link is handled on RoarMe's side at once)
drop trigger if exists roarme_links_change on public.roarme_links;
create trigger roarme_links_change after insert or update or delete on public.roarme_links for each row execute function public.roarme_kick_trigger();
