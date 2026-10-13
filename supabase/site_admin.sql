-- The company site's own admin (Alex, 13 Oct): its theme, its visitor statistics and a small merch
-- shop. The site reads its settings and the shop's products without signing in; visitors add
-- anonymous visit events; only hub administrators (is_admin()) change anything or read the
-- statistics, from the site's admin page. Payments happen on Stripe (a Payment Link per product).
-- Safe to run again.

-- settings: one row per key, readable by anyone (the theme has to reach every visitor)
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table site_settings enable row level security;
grant select on site_settings to anon, authenticated;
grant insert, update, delete on site_settings to authenticated;
drop policy if exists site_settings_read on site_settings;
create policy site_settings_read on site_settings for select to anon, authenticated using (true);
drop policy if exists site_settings_admin on site_settings;
create policy site_settings_admin on site_settings for all to authenticated using (is_admin()) with check (is_admin());
insert into site_settings (key, value) values ('theme', '"dark"') on conflict (key) do nothing;

-- statistics: anonymous events, no names, no addresses. kind = view (a page opened), play (a film
-- played, ref = its title), shop (a Buy pressed, ref = the product), lead (the form sent).
-- visitor is a random id kept in that browser, so visits can be counted without knowing who.
create table if not exists site_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null,
  ref text,
  path text,
  referrer text,
  device text,
  lang text,
  visitor text
);
create index if not exists site_events_at on site_events (at desc);
alter table site_events enable row level security;
grant insert on site_events to anon, authenticated;
grant select, delete on site_events to authenticated;
drop policy if exists site_events_add on site_events;
create policy site_events_add on site_events for insert to anon, authenticated
  with check (
    kind in ('view', 'play', 'shop', 'lead')
    and char_length(coalesce(ref, '')) <= 200 and char_length(coalesce(path, '')) <= 200
    and char_length(coalesce(referrer, '')) <= 200 and char_length(coalesce(device, '')) <= 20
    and char_length(coalesce(lang, '')) <= 10 and char_length(coalesce(visitor, '')) <= 40
  );
drop policy if exists site_events_admin_read on site_events;
create policy site_events_admin_read on site_events for select to authenticated using (is_admin());
drop policy if exists site_events_admin_delete on site_events;
create policy site_events_admin_delete on site_events for delete to authenticated using (is_admin());

-- the shop: products with a Stripe Payment Link each; visitors see the ones switched on
create table if not exists site_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text,
  price numeric(10, 2),
  currency text not null default 'EUR',
  images jsonb not null default '[]',
  sizes jsonb not null default '[]',
  stripe_link text,
  active boolean not null default false,
  sold_out boolean not null default false,
  position int not null default 0
);
alter table site_products enable row level security;
grant select on site_products to anon, authenticated;
grant insert, update, delete on site_products to authenticated;
drop policy if exists site_products_read on site_products;
create policy site_products_read on site_products for select to anon, authenticated using (active or is_admin());
drop policy if exists site_products_admin on site_products;
create policy site_products_admin on site_products for all to authenticated using (is_admin()) with check (is_admin());

-- product photos: a public bucket, written by administrators only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
drop policy if exists site_files_read on storage.objects;
create policy site_files_read on storage.objects for select using (bucket_id = 'site');
drop policy if exists site_files_add on storage.objects;
create policy site_files_add on storage.objects for insert to authenticated with check (bucket_id = 'site' and is_admin());
drop policy if exists site_files_edit on storage.objects;
create policy site_files_edit on storage.objects for update to authenticated using (bucket_id = 'site' and is_admin());
drop policy if exists site_files_delete on storage.objects;
create policy site_files_delete on storage.objects for delete to authenticated using (bucket_id = 'site' and is_admin());
