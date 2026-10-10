-- THEMADLIONS Projects · Notes: a note shared with you can be edited, not only read
-- Paste into Supabase > SQL Editor > New query > Run (after notes.sql and share_access.sql). Safe to run more than once.
-- It carries everything notes_share.sql does as well, so this one file is enough on its own.
--
-- Alex (10 Oct): a note is seen only by whoever wrote it, unless its writer shares it. Whoever it is
-- shared with sees it under Shared Notes and can write in it straight away. Sharing it, its link, its
-- folder, its pin and deleting it stay the writer's alone: if a teammate's save tries to change any of
-- those, the database keeps the writer's values. A note with a link has its public page refreshed by
-- the database on every save, whoever made the change.

alter table notes add column if not exists shared_with uuid[] not null default '{}';
alter table notes add column if not exists link boolean not null default false;

drop policy if exists notes_select on notes;
create policy notes_select on notes for select using (user_id = auth.uid() or auth.uid() = any(shared_with));
drop policy if exists notes_update on notes;
create policy notes_update on notes for update
  using (user_id = auth.uid() or auth.uid() = any(shared_with))
  with check (user_id = auth.uid() or auth.uid() = any(shared_with));
-- insert and delete stay the writer's alone (notes.sql)

-- what only the writer may change
create or replace function notes_guard() returns trigger language plpgsql as $$
begin
  new.id := old.id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  if old.user_id is distinct from auth.uid() then
    new.kind := old.kind;
    new.shared_with := old.shared_with;
    new.link := old.link;
    new.folder_id := old.folder_id;
    new.pinned := old.pinned;
    new.deleted_at := old.deleted_at;
  end if;
  return new;
end $$;
drop trigger if exists notes_guard on notes;
create trigger notes_guard before update on notes for each row execute function notes_guard();

-- a note's link shows the latest text, whoever wrote it (the public page cleans the html before showing it)
create or replace function notes_link_refresh() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.link and new.kind = 'note' and (new.body is distinct from old.body or new.title is distinct from old.title) then
    update shares
      set data = coalesce(data, '{}'::jsonb) || jsonb_build_object('html', new.body, 'title', coalesce(nullif(new.title, ''), 'Note'), 'updatedAt', new.updated_at),
          updated_at = now()
      where kind = 'note' and ref = 'note:' || new.id;
  end if;
  return null;
end $$;
drop trigger if exists notes_link_refresh on notes;
create trigger notes_link_refresh after update on notes for each row execute function notes_link_refresh();

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
