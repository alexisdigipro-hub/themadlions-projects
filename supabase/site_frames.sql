-- Framing for every picture on the company site (Alex, 13 Oct: "adjust & scale any image"): where the
-- picture sits in its frame (x, y in %, 50/50 = centre) and how far it is zoomed (z, 1 = as is).
-- Set in the site's admin by dragging the picture and moving a zoom slider. The opening picture's
-- framing lives in site_settings as hero_frame. Safe to run again.

alter table site_works add column if not exists frame jsonb;
alter table site_products add column if not exists frame jsonb;
