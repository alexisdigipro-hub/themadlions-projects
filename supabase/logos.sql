-- THEMADLIONS Projects · Database > Logos (Alex, 28 Oct 2026): the logos of clients, labels and brands, a folder a
-- brand (Alex: "they have different versions for different uses": white, black, horizontal, the icon alone). The files
-- themselves are in pCloud, uploaded as they are, in <root>/Logos/<brand>/; these tables keep the brand, each version's
-- name and a small preview. Who sees them is the permission "Logos" (members.permissions.logos: view or edit);
-- administrators always. Paste into Supabase > SQL Editor > New query > Run. Safe to run again.

create table if not exists logo_brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default my_ws() references workspaces(id) on delete cascade,
  name text not null,
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists logo_brands_ws on logo_brands(workspace_id, name);

create table if not exists logos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default my_ws() references workspaces(id) on delete cascade,
  brand_id uuid not null references logo_brands(id) on delete cascade,
  fileid bigint not null,           -- the file in pCloud
  name text not null default '',    -- its file name
  size bigint not null default 0,
  width int,
  height int,
  title text not null default '',   -- which version: White, Black, Horizontal, Icon
  note text not null default '',
  thumb text not null default '',   -- a small PNG (transparency kept) made in the browser at upload
  folder text not null default '',  -- where it is in pCloud
  uploaded_by uuid default auth.uid(),
  uploaded_at timestamptz not null default now()
);
create index if not exists logos_brand on logos(brand_id, uploaded_at desc);
create index if not exists logos_file on logos(fileid);

alter table logo_brands enable row level security;
alter table logos enable row level security;

drop policy if exists logo_brands_read on logo_brands;
drop policy if exists logo_brands_write on logo_brands;
create policy logo_brands_read on logo_brands for select to authenticated
  using (workspace_id = my_ws() and my_perm('logos') in ('view', 'edit'));
create policy logo_brands_write on logo_brands for all to authenticated
  using (workspace_id = my_ws() and my_perm('logos') = 'edit')
  with check (workspace_id = my_ws() and my_perm('logos') = 'edit');

drop policy if exists logos_read on logos;
drop policy if exists logos_write on logos;
create policy logos_read on logos for select to authenticated
  using (workspace_id = my_ws() and my_perm('logos') in ('view', 'edit'));
create policy logos_write on logos for all to authenticated
  using (workspace_id = my_ws() and my_perm('logos') = 'edit')
  with check (workspace_id = my_ws() and my_perm('logos') = 'edit'
    and exists (select 1 from logo_brands b where b.id = brand_id and b.workspace_id = my_ws()));

revoke all on logo_brands, logos from anon;
grant select, insert, update, delete on logo_brands, logos to authenticated;
