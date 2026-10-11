-- Sign up without an invite (Alex, 11 Oct): anyone who creates an account and is not on the team yet
-- leaves a request to join; an administrator accepts it (or declines it) on the Team page. Accepting
-- adds the member row from the app (members_admin already lets an administrator do that) and removes
-- the request. Invites keep working as before. Safe to run again.

create table if not exists join_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null unique,
  name text,
  email text,
  created_at timestamptz not null default now()
);

alter table join_requests enable row level security;
drop policy if exists join_requests_admin on join_requests;
create policy join_requests_admin on join_requests for all
  using (is_admin() and workspace_id = my_ws())
  with check (is_admin() and workspace_id = my_ws());

-- the Team page hears a new request the moment it arrives
do $$ begin
  alter publication supabase_realtime add table join_requests;
exception when others then null;
end $$;

-- bootstrap as before (a member, an invite, or the very first account), and otherwise a request to join
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
    delete from join_requests where user_id = uid;
    return to_jsonb(m);
  end if;
  if not exists (select 1 from workspaces) then
    insert into workspaces (name) values ('THEMADLIONS') returning id into ws;
    insert into members (workspace_id, user_id, name, email, role, permissions, project_access)
    values (ws, uid, coalesce(nullif(p_name, ''), split_part(em, '@', 1)), em, 'admin', '{}'::jsonb, '"all"'::jsonb)
    returning * into m;
    return to_jsonb(m);
  end if;
  -- not on the team yet: ask to join
  select id into ws from workspaces order by created_at nulls last limit 1;
  insert into join_requests (workspace_id, user_id, name, email)
  values (ws, uid, coalesce(nullif(p_name, ''), split_part(em, '@', 1)), em)
  on conflict (user_id) do update set name = coalesce(nullif(p_name, ''), join_requests.name), email = excluded.email;
  return jsonb_build_object('requested', true);
end $$;
