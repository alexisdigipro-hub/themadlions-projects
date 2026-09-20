-- THEMADLIONS Projects · who is allowed to send delivery links
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql, shares.sql and deliveries.sql).
-- Safe to run more than once. Run it again any time you re-run shares.sql, because that file
-- recreates the old wide-open policy.
--
-- Share is its own permission module now. A member sees and sends the pages made from the Share
-- screen (delivery pages, client status pages) only when their Share permission is view or edit
-- (administrators always can). Call sheet links are untouched: they are made from inside the
-- shooting day and keep working for every member exactly as before, so the rule is written as
-- "call sheets are open, everything else needs Share" rather than naming one kind.

-- the level a member has on one module, as text: 'none' | 'view' | 'edit' (administrators: 'edit')
create or replace function my_perm(p_module text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case when role = 'admin' then 'edit' else coalesce(permissions ->> p_module, 'none') end
    from members where user_id = auth.uid() and active limit 1
  ), 'none')
$$;
revoke all on function my_perm(text) from public;
grant execute on function my_perm(text) to authenticated;

alter table shares enable row level security;

drop policy if exists shares_members on shares;
drop policy if exists shares_read on shares;
drop policy if exists shares_new on shares;
drop policy if exists shares_edit on shares;
drop policy if exists shares_gone on shares;

create policy shares_read on shares for select
  using (workspace_id = my_ws() and (kind = 'callsheet' or my_perm('share') <> 'none'));

create policy shares_new on shares for insert
  with check (workspace_id = my_ws() and (kind = 'callsheet' or my_perm('share') = 'edit'));

create policy shares_edit on shares for update
  using (workspace_id = my_ws() and (kind = 'callsheet' or my_perm('share') = 'edit'))
  with check (workspace_id = my_ws() and (kind = 'callsheet' or my_perm('share') = 'edit'));

create policy shares_gone on shares for delete
  using (workspace_id = my_ws() and (kind = 'callsheet' or my_perm('share') = 'edit'));
