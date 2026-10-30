-- alexisk.gr's admin (Alex, 30 Oct 2026: "a backend for alexisk like themadlions, to set the order of the projects").
-- One row: the order of the films on alexisk.gr (their ids: the site's own, and tml-<video id> for themadlions.com's)
-- and the ones hidden there. Anyone reads it (the page does); only hub administrators change it, from alexisk.gr/admin/.
-- Safe to run again.

create table if not exists alexisk_site (
  id int primary key default 1 check (id = 1),
  ord jsonb not null default '[]',
  hidden jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
alter table alexisk_site enable row level security;
grant select on alexisk_site to anon, authenticated;
grant insert, update on alexisk_site to authenticated;
drop policy if exists alexisk_site_read on alexisk_site;
create policy alexisk_site_read on alexisk_site for select to anon, authenticated using (true);
drop policy if exists alexisk_site_admin on alexisk_site;
create policy alexisk_site_admin on alexisk_site for all to authenticated using (is_admin()) with check (is_admin());
insert into alexisk_site (id) values (1) on conflict (id) do nothing;
