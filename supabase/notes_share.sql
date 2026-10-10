-- THEMADLIONS Projects · Notes: share a note with chosen teammates, or by a link
-- Paste into Supabase > SQL Editor > New query > Run (after notes.sql and share_access.sql). Safe to run more than once.
--
-- Alex (10 Oct): every note is still seen only by whoever wrote it, administrators included. From a
-- note's Share window its writer can add one or more teammates, who then see it read only, or make a
-- link that anyone can open. Only the writer can change, share or delete a note.

alter table notes add column if not exists shared_with uuid[] not null default '{}';
alter table notes add column if not exists link boolean not null default false;

drop policy if exists notes_select on notes;
create policy notes_select on notes for select using (user_id = auth.uid() or auth.uid() = any(shared_with));
-- insert, update and delete stay the writer's alone (notes.sql)

-- A note's link is a row in shares of kind 'note'. Only the one who made it sees or changes that row,
-- so it never shows on the Share page or to anyone else in the team. The same policies as
-- share_access.sql, with that one kind added.
drop policy if exists shares_read on shares;
drop policy if exists shares_new on shares;
drop policy if exists shares_edit on shares;
drop policy if exists shares_gone on shares;

create policy shares_read on shares for select
  using (workspace_id = my_ws() and case kind
    when 'note' then created_by = auth.uid()
    when 'callsheet' then true
    when 'estimate' then is_admin()
    else my_perm('share') <> 'none' end);

create policy shares_new on shares for insert
  with check (workspace_id = my_ws() and case kind
    when 'note' then created_by = auth.uid()
    when 'callsheet' then true
    when 'estimate' then is_admin()
    else my_perm('share') = 'edit' end);

create policy shares_edit on shares for update
  using (workspace_id = my_ws() and case kind
    when 'note' then created_by = auth.uid()
    when 'callsheet' then true
    when 'estimate' then is_admin()
    else my_perm('share') = 'edit' end)
  with check (workspace_id = my_ws() and case kind
    when 'note' then created_by = auth.uid()
    when 'callsheet' then true
    when 'estimate' then is_admin()
    else my_perm('share') = 'edit' end);

create policy shares_gone on shares for delete
  using (workspace_id = my_ws() and case kind
    when 'note' then created_by = auth.uid()
    when 'callsheet' then true
    when 'estimate' then is_admin()
    else my_perm('share') = 'edit' end);
