-- THEMADLIONS Projects · who is allowed to send delivery links
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql, shares.sql and deliveries.sql).
-- Safe to run more than once. Run it again any time you re-run shares.sql, because that file
-- recreates the old wide-open policy.
--
-- Three levels, decided per kind of page:
--   call sheets  : every member, as before. They are made from inside the shooting day.
--   estimates    : administrators only. A cost estimation is money, like Finance.
--   everything else (deliveries, status pages, and anything added later): needs the Share
--                  permission, so a new kind of page is covered by default rather than escaping.

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
  using (workspace_id = my_ws() and case kind
    when 'callsheet' then true
    when 'estimate' then is_admin()
    else my_perm('share') <> 'none' end);

create policy shares_new on shares for insert
  with check (workspace_id = my_ws() and case kind
    when 'callsheet' then true
    when 'estimate' then is_admin()
    else my_perm('share') = 'edit' end);

create policy shares_edit on shares for update
  using (workspace_id = my_ws() and case kind
    when 'callsheet' then true
    when 'estimate' then is_admin()
    else my_perm('share') = 'edit' end)
  with check (workspace_id = my_ws() and case kind
    when 'callsheet' then true
    when 'estimate' then is_admin()
    else my_perm('share') = 'edit' end);

create policy shares_gone on shares for delete
  using (workspace_id = my_ws() and case kind
    when 'callsheet' then true
    when 'estimate' then is_admin()
    else my_perm('share') = 'edit' end);

-- share_get stays SECURITY DEFINER, so a client opening the link is unaffected by any of this.
