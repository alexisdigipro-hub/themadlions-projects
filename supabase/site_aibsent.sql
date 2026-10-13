-- Aibsent Studios, The Mad Lions' post-production & AI studio (Alex, 13 Oct): a film made by it carries
-- the mark "by Aibsent" on the company site and shows in its section. Set per film in the site's admin.
-- The first run marks the AI and motion graphics films and the VFX / Motion / Beauty showreels. Safe to run again.

alter table site_works add column if not exists aibsent boolean not null default false;
update site_works set aibsent = true
where not exists (select 1 from site_works where aibsent)
  and (categories ?| array['AI Films', 'Motion Graphics'] or title in ('Visual FX Showreel', 'Motion Graphics Showreel', 'Beauty Showreel'));
