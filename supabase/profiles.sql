-- THEMADLIONS Projects · member profiles (photo, position, department, phone, a few words, birthday)
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.

alter table members add column if not exists profile jsonb not null default '{}'::jsonb;

-- Everyone may edit their own profile, but only an administrator may write to a member row,
-- because that row also carries role, permissions and project access. A plain "update your own
-- row" policy would therefore let anyone make themselves an administrator. This function is the
-- narrow door instead: it writes the profile column of the caller's own row and nothing else.
create or replace function set_my_profile(p jsonb) returns void
language sql security definer set search_path = public as $$
  update members set profile = coalesce(p, '{}'::jsonb)
  where workspace_id = my_ws() and user_id = auth.uid()
$$;

revoke all on function set_my_profile(jsonb) from public;
grant execute on function set_my_profile(jsonb) to authenticated;
