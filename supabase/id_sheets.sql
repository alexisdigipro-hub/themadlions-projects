-- Database > ID sheets (Alex, 25 Oct): photos of people's ID sheets (ID card, passport, licence, contract
-- sheet), kept in a folder per person. The pictures themselves are in pCloud, uploaded as they are (no
-- compression), in <root>/ID sheets/<name>/; these tables keep who, what and when. Who sees them is the
-- permission "ID sheets" (members.permissions.idsheets: view or edit); administrators always. Safe to run again.

create table if not exists id_people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default my_ws() references workspaces(id) on delete cascade,
  name text not null,
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists id_people_ws on id_people(workspace_id, name);

create table if not exists id_sheets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default my_ws() references workspaces(id) on delete cascade,
  person_id uuid not null references id_people(id) on delete cascade,
  fileid bigint not null,        -- the picture in pCloud
  name text not null default '', -- its file name
  size bigint not null default 0,
  width int,
  height int,
  title text not null default '',  -- e.g. ID card front, Passport
  doc_date date,                   -- the date that matters on it (issued, expires, signed)
  note text not null default '',
  folder text not null default '', -- where it is in pCloud
  uploaded_by uuid default auth.uid(),
  uploaded_at timestamptz not null default now()
);
create index if not exists id_sheets_person on id_sheets(person_id, uploaded_at desc);
create index if not exists id_sheets_file on id_sheets(fileid);

alter table id_people enable row level security;
alter table id_sheets enable row level security;

drop policy if exists id_people_read on id_people;
drop policy if exists id_people_write on id_people;
create policy id_people_read on id_people for select to authenticated
  using (workspace_id = my_ws() and my_perm('idsheets') in ('view', 'edit'));
create policy id_people_write on id_people for all to authenticated
  using (workspace_id = my_ws() and my_perm('idsheets') = 'edit')
  with check (workspace_id = my_ws() and my_perm('idsheets') = 'edit');

drop policy if exists id_sheets_read on id_sheets;
drop policy if exists id_sheets_write on id_sheets;
create policy id_sheets_read on id_sheets for select to authenticated
  using (workspace_id = my_ws() and my_perm('idsheets') in ('view', 'edit'));
create policy id_sheets_write on id_sheets for all to authenticated
  using (workspace_id = my_ws() and my_perm('idsheets') = 'edit')
  with check (workspace_id = my_ws() and my_perm('idsheets') = 'edit'
    and exists (select 1 from id_people p where p.id = person_id and p.workspace_id = my_ws()));

-- the small copy the page shows (25 Oct: the page does not need the full picture, only Download does):
-- a JPEG data URL at most 560 px on its long side, made in the browser at upload
alter table id_sheets add column if not exists thumb text not null default '';

grant select, insert, update, delete on id_people, id_sheets to authenticated;

-- an ID sheet's picture opens only through Database > ID sheets (security review, 25 Oct): the pcloud function asks
-- this before it opens a file for a project or the library, whose records anyone with edit rights can write
create or replace function is_id_sheet_file(p_fileid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from id_sheets where fileid = p_fileid)
$$;
revoke all on function is_id_sheet_file(bigint) from public, anon;
grant execute on function is_id_sheet_file(bigint) to authenticated;
