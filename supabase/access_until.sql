-- "Access until" kept by the database too (security review, 25 Oct 2026). A member's permissions.accessUntil
-- (YYYY-MM-DD, set on the Team page) was only checked by the app: after the date the screens went empty, but the
-- person's sign-in still opened the data through the API. Now the helpers every policy uses answer as if they were
-- not on the team from the day after (my_ws null, no modules, no projects). Administrators are never cut off, as in
-- the app (store.jsx accessEnded). Safe to run again.

create or replace function member_live(m members) returns boolean
language sql stable as $$
  -- compared as text, the way the app does (an odd value can never break every policy with a cast error)
  select m.active and (m.role = 'admin'
    or coalesce(m.permissions ->> 'accessUntil', '') = ''
    or (m.permissions ->> 'accessUntil') >= to_char(current_date, 'YYYY-MM-DD'))
$$;

create or replace function my_ws() returns uuid
language sql stable security definer set search_path = public as $$
  select workspace_id from members m where user_id = auth.uid() and member_live(m) limit 1
$$;

create or replace function can_edit_any() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select role = 'admin' or exists (select 1 from jsonb_each_text(permissions) where value = 'edit')
    from members m where user_id = auth.uid() and member_live(m) limit 1
  ), false)
$$;

create or replace function can_view_project(pid text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select role = 'admin' or project_access = '"all"'::jsonb or project_access ? pid
    from members m where user_id = auth.uid() and member_live(m) limit 1
  ), false)
$$;

create or replace function my_perm(p_module text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case when role = 'admin' then 'edit' else coalesce(permissions ->> p_module, 'none') end
    from members m where user_id = auth.uid() and member_live(m) limit 1
  ), 'none')
$$;
