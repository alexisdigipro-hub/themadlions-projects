-- Where you are signed in (Alex, 26 Nov 2026: "show me who signs in to my account and from where, like Facebook or
-- Instagram"; without the city, so no address leaves the hub). Safe to run again.
--   my_sessions()           my own signed-in devices (what the browser said it is, when it signed in, last seen)
--   end_session(id)         sign one of my devices out
--   end_other_sessions()    sign out every device but this one
--   team_sessions()         administrators: every member's devices
--   end_member_sessions(u)  administrators: sign a member out everywhere
-- A device signed out loses its refresh token at once; the page it has open keeps working until its access token
-- runs out (an hour at most) and then lands on the sign-in page.
-- A new device: when a sign-in comes from a browser this account has not used in 90 days, the Edge Function
-- signin-alert emails the person ("New sign-in to the TML Hub"). The trigger never stops a sign-in.

create or replace function public.my_sessions()
returns table (id uuid, user_agent text, created_at timestamptz, last_seen timestamptz, current boolean)
language sql stable security definer set search_path = '' as $$
  select s.id, s.user_agent, s.created_at,
         greatest(s.created_at, s.updated_at, (s.refreshed_at at time zone 'utc')),
         s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  from auth.sessions s
  where s.user_id = auth.uid() and (s.not_after is null or s.not_after > now())
  order by 4 desc nulls last
$$;

create or replace function public.end_session(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.sessions where id = p_id and user_id = auth.uid();
  return found;
end $$;

create or replace function public.end_other_sessions() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from auth.sessions where user_id = auth.uid()
    and id is distinct from nullif(auth.jwt() ->> 'session_id', '')::uuid;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.team_sessions()
returns table (user_id uuid, name text, email text, id uuid, user_agent text, created_at timestamptz, last_seen timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, m.name, m.email, s.id, s.user_agent, s.created_at,
         greatest(s.created_at, s.updated_at, (s.refreshed_at at time zone 'utc'))
  from public.members m
  join auth.sessions s on s.user_id = m.user_id and (s.not_after is null or s.not_after > now())
  where m.workspace_id = public.my_ws() and public.is_admin()
  order by m.name, 7 desc
$$;

create or replace function public.end_member_sessions(p_user uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_admin() or not exists (select 1 from public.members where user_id = p_user and workspace_id = public.my_ws()) then
    raise exception 'Only an administrator of this workspace.';
  end if;
  delete from auth.sessions where user_id = p_user
    and id is distinct from nullif(auth.jwt() ->> 'session_id', '')::uuid;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.my_sessions(), public.end_session(uuid), public.end_other_sessions(), public.team_sessions(), public.end_member_sessions(uuid) from public, anon;
grant execute on function public.my_sessions(), public.end_session(uuid), public.end_other_sessions(), public.team_sessions(), public.end_member_sessions(uuid) to authenticated;

-- the browsers each account has used, so only a new one is emailed about (kept 90 days)
create table if not exists public.signin_seen (
  user_id uuid not null,
  ua_hash text not null,
  last_at timestamptz not null default now(),
  primary key (user_id, ua_hash)
);
alter table public.signin_seen enable row level security;
revoke all on public.signin_seen from anon, authenticated;

-- every device signed in when this runs counts as seen, so only a truly new one is emailed about
insert into public.signin_seen (user_id, ua_hash, last_at)
select distinct s.user_id, md5(coalesce(s.user_agent, '')), now() from auth.sessions s
on conflict (user_id, ua_hash) do nothing;

-- the shared secret between the trigger and the Edge Function, made here once, read only by the service role
create table if not exists public.signin_hook (id int primary key default 1 check (id = 1), token uuid not null default gen_random_uuid());
insert into public.signin_hook (id) values (1) on conflict (id) do nothing;
alter table public.signin_hook enable row level security;
revoke all on public.signin_hook from anon, authenticated;
grant select on public.signin_hook to service_role;

create or replace function public.signin_new_device() returns trigger
language plpgsql security definer set search_path = '' as $$
declare h text; m record; tok uuid;
begin
  begin
    select name, email into m from public.members where user_id = new.user_id and coalesce(active, true) limit 1;
    if m.email is null then return new; end if;
    h := md5(coalesce(new.user_agent, ''));
    if exists (select 1 from public.signin_seen where user_id = new.user_id and ua_hash = h and last_at > now() - interval '90 days') then
      update public.signin_seen set last_at = now() where user_id = new.user_id and ua_hash = h;
      return new;
    end if;
    insert into public.signin_seen (user_id, ua_hash) values (new.user_id, h)
      on conflict (user_id, ua_hash) do update set last_at = now();
    select token into tok from public.signin_hook where id = 1;
    perform net.http_post(
      url := 'https://naibamqexcqnqhbbqafa.supabase.co/functions/v1/signin-alert',
      body := jsonb_build_object('email', m.email, 'name', m.name, 'ua', coalesce(new.user_agent, ''), 'at', new.created_at),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-signin-hook', tok::text)
    );
  exception when others then null;
  end;
  return new;
end $$;
revoke all on function public.signin_new_device() from public, anon, authenticated;

drop trigger if exists signin_new_device on auth.sessions;
create trigger signin_new_device after insert on auth.sessions for each row execute function public.signin_new_device();
