-- The company site's team and clients, edited in Studio > People (Alex, 14 Oct: "settings where I can
-- enter the details and photo of the team, the same for the clients"). Anyone reads the ones shown;
-- administrators (is_admin()) add, change, hide and reorder them. Photos and logos go in the public
-- `site` bucket (team/ and clients/, see site_admin.sql). Seeded with what the site showed. Safe to run again.

create table if not exists site_team (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  role text,
  role_el text,
  photo text,
  frame jsonb,
  position int not null default 0,
  visible boolean not null default true
);
alter table site_team enable row level security;
grant select on site_team to anon, authenticated;
grant insert, update, delete on site_team to authenticated;
drop policy if exists site_team_read on site_team;
create policy site_team_read on site_team for select to anon, authenticated using (visible or is_admin());
drop policy if exists site_team_admin on site_team;
create policy site_team_admin on site_team for all to authenticated using (is_admin()) with check (is_admin());

-- a client's logo shows in one colour (white on dark, black on light) unless `mono` is off
create table if not exists site_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  logo text,
  mono boolean not null default true,
  position int not null default 0,
  visible boolean not null default true
);
alter table site_clients enable row level security;
grant select on site_clients to anon, authenticated;
grant insert, update, delete on site_clients to authenticated;
drop policy if exists site_clients_read on site_clients;
create policy site_clients_read on site_clients for select to anon, authenticated using (visible or is_admin());
drop policy if exists site_clients_admin on site_clients;
create policy site_clients_admin on site_clients for all to authenticated using (is_admin()) with check (is_admin());

insert into site_team (name, role, role_el, position)
select * from (values
  ('Alex', 'Producer · Film Director', 'Παραγωγός · Σκηνοθέτης', 0), ('Ioanna', 'Production Manager', 'Διευθύντρια παραγωγής', 1),
  ('Anastasia', 'Assistant Director', 'Βοηθός σκηνοθέτη', 2), ('Theofilos', 'Production Assistant', 'Βοηθός παραγωγής', 3),
  ('Triantafyllos', 'Filmmaker', 'Filmmaker', 4), ('Dimitris', 'Filmmaker', 'Filmmaker', 5), ('Gregory', 'Still Photographer', 'Φωτογράφος', 6)
) v(name, role, role_el, position)
where not exists (select 1 from site_team);

insert into site_clients (name, position)
select * from (values
  ('Visa', 0), ('L''Oréal', 1), ('UNESCO', 2), ('Aperol', 3), ('Nescafé', 4), ('Tresemmé', 5), ('Axe', 6), ('Wind', 7),
  ('Germanos', 8), ('Elpedison', 9), ('Εθνική Ασφαλιστική', 10), ('AbbVie', 11), ('Janssen', 12), ('Gree', 13), ('Loumidis', 14),
  ('Media Strom', 15), ('Christodoulou', 16), ('Softex', 17)
) v(name, position)
where not exists (select 1 from site_clients);
