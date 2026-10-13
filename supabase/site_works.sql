-- The company site's work, kept in the database so Alex adds, edits, hides and reorders films from the
-- site's admin (13 Oct). Anyone reads the visible ones; only hub administrators change them. The first
-- run copies in the 44 films the site started with (the old themadlions.com's 43 and PENELOPE);
-- Rec Pop Up Concert comes in hidden (Alex: take it off the site).
-- Safe to run again.

create table if not exists site_works (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  client text,
  year int,
  categories jsonb not null default '[]',
  video text,
  kind text,
  video_id text,
  image text,
  visible boolean not null default true,
  position int not null default 0
);
alter table site_works enable row level security;
grant select on site_works to anon, authenticated;
grant insert, update, delete on site_works to authenticated;
drop policy if exists site_works_read on site_works;
create policy site_works_read on site_works for select to anon, authenticated using (visible or is_admin());
drop policy if exists site_works_admin on site_works;
create policy site_works_admin on site_works for all to authenticated using (is_admin()) with check (is_admin());

insert into site_works (title, categories, video, kind, video_id, image, position, visible)
select * from (values
('PENELOPE', '["AI Films"]'::jsonb, 'https://www.youtube.com/watch?v=MOh7XEQSFSg', 'yt', 'MOh7XEQSFSg', null, 0, true),
('Rec Pop Up Concert', '["Events"]'::jsonb, 'https://www.youtube.com/watch?v=eblylyzRWdY', 'yt', 'eblylyzRWdY', 'https://themadlions.com/wp-content/uploads/2020/09/maxresdefault-copy.jpg', 1, false),
('Michalis Hatzigiannis – Horevo', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=1Y3h-3ka4bo', 'yt', '1Y3h-3ka4bo', 'https://themadlions.com/wp-content/uploads/2020/09/hatzigiannis.jpg', 2, true),
('Aperol Spritz', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=J6xyi0iE8KY', 'yt', 'J6xyi0iE8KY', 'https://themadlions.com/wp-content/uploads/2020/04/Aperol-website.png', 3, true),
('Christos Cholidis', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=SaR6dMibzX0', 'yt', 'SaR6dMibzX0', 'https://themadlions.com/wp-content/uploads/2020/04/CHOLIDIS-MATIA-MOU.png', 4, true),
('#Eumemes', '["Commercials", "Motion Graphics"]'::jsonb, 'https://www.youtube.com/watch?v=xfd_9Tllp6E', 'yt', 'xfd_9Tllp6E', 'https://themadlions.com/wp-content/uploads/2020/04/eumemes.png', 5, true),
('Media Strom', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=meAvXDOXg0M', 'yt', 'meAvXDOXg0M', 'https://themadlions.com/wp-content/uploads/2019/10/MEDIA.png', 6, true),
('Visa IG Stories', '["Commercials"]'::jsonb, 'https://vimeo.com/364353545', 'vm', '364353545', 'https://themadlions.com/wp-content/uploads/2019/10/visa.png', 7, true),
('Tresemmé', '["Commercials", "Motion Graphics"]'::jsonb, 'https://vimeo.com/364348936', 'vm', '364348936', 'https://themadlions.com/wp-content/uploads/2019/10/tresemme.png', 8, true),
('L’Oréal – UNESCO For Women In Science', '["Corporate"]'::jsonb, 'https://vimeo.com/346422749', 'vm', '346422749', 'https://themadlions.com/wp-content/uploads/2019/10/Loreal.png', 9, true),
('Helena Paparizou – Askopa Xenihtia', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=yeC9OCVQrts', 'yt', 'yeC9OCVQrts', 'https://themadlions.com/wp-content/uploads/2019/10/paparizou-2.png', 10, true),
('Thiseas Rehab', '["Corporate"]'::jsonb, 'https://vimeo.com/364394817', 'vm', '364394817', 'https://themadlions.com/wp-content/uploads/2019/10/thiseas.png', 11, true),
('Christmas Theater', '["Commercials"]'::jsonb, 'https://vimeo.com/304595691', 'vm', '304595691', 'https://themadlions.com/wp-content/uploads/2018/12/Christmas-Theater.png', 12, true),
('Helena Paparizou – Kati Skoteino', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=uqmSrvt9JmY', 'yt', 'uqmSrvt9JmY', 'https://themadlions.com/wp-content/uploads/2019/10/Paparizou.png', 13, true),
('Axe Gold – Video Game', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=x1GXb7NNmYg', 'yt', 'x1GXb7NNmYg', 'https://themadlions.com/wp-content/uploads/2018/09/Axe.png', 14, true),
('Wind F2G – Flame', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=dnCSvJah6N4', 'yt', 'dnCSvJah6N4', 'https://themadlions.com/wp-content/uploads/2018/09/wind.png', 15, true),
('Pot Pan', '["Corporate"]'::jsonb, 'https://vimeo.com/364391015', 'vm', '364391015', 'https://themadlions.com/wp-content/uploads/2019/10/potpan.png', 16, true),
('Gree – Στα άκρα', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=FQ-w-qq4XlQ', 'yt', 'FQ-w-qq4XlQ', 'https://themadlions.com/wp-content/uploads/2018/08/gree_sta_akra.png', 17, true),
('Melisses – Κρυφτό', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=x56pIWkL3AQ', 'yt', 'x56pIWkL3AQ', 'https://themadlions.com/wp-content/uploads/2019/07/melisses-1.png', 18, true),
('AbbVie', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=MBlEJhu28BA', 'yt', 'MBlEJhu28BA', 'https://themadlions.com/wp-content/uploads/2018/06/abbvie.png', 19, true),
('Carroten Kids', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=t5MJZXVib6Q', 'yt', 't5MJZXVib6Q', 'https://themadlions.com/wp-content/uploads/2018/05/carroten-kids-2.png', 20, true),
('Golden Virginia – GFX', '["Motion Graphics"]'::jsonb, 'https://www.youtube.com/watch?v=GRTaR6C1ZvI', 'yt', 'GRTaR6C1ZvI', 'https://themadlions.com/wp-content/uploads/2018/08/GOLDEN-VIRGINIA.png', 21, true),
('Softex & Galaxias', '["Commercials", "Motion Graphics"]'::jsonb, 'https://www.youtube.com/watch?v=hNmh6SAuVbw', 'yt', 'hNmh6SAuVbw', 'https://themadlions.com/wp-content/uploads/2018/09/softex.png', 22, true),
('Christodoulou – Juices', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=YqKu279zbf8', 'yt', 'YqKu279zbf8', 'https://themadlions.com/wp-content/uploads/2018/08/christodoulou_02.png', 23, true),
('Εθνική Ασφαλιστική', '["Events"]'::jsonb, 'https://www.youtube.com/watch?v=du6Px_FMGSM', 'yt', 'du6Px_FMGSM', 'https://themadlions.com/wp-content/uploads/2018/08/ethniki.png', 24, true),
('Melisses – Άλλου', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=95QMQbX_Ksc', 'yt', '95QMQbX_Ksc', 'https://themadlions.com/wp-content/uploads/2019/07/melisses-2.png', 25, true),
('Oikonomopoulos – Gia kapoio logo', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=OwUrBdn3HYU', 'yt', 'OwUrBdn3HYU', 'https://themadlions.com/wp-content/uploads/2020/02/oikonomo.png', 26, true),
('Loumidis', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=_UrYnpuzdBE', 'yt', '_UrYnpuzdBE', 'https://themadlions.com/wp-content/uploads/2019/10/loumidis.png', 27, true),
('ΟΠΕΚΕΠΕ', '["Commercials", "Corporate"]'::jsonb, 'https://www.youtube.com/watch?v=ZLp12SywGY4', 'yt', 'ZLp12SywGY4', 'https://themadlions.com/wp-content/uploads/2019/10/opekepe.png', 28, true),
('Gree – Classic', '["Commercials"]'::jsonb, 'https://vimeo.com/231192253', 'vm', '231192253', 'https://themadlions.com/wp-content/uploads/2017/08/greeclassic.jpg', 29, true),
('Christodoulou – Juices (2017)', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=7gSJOkG0Obo', 'yt', '7gSJOkG0Obo', 'https://themadlions.com/wp-content/uploads/2017/08/christodoulou.png', 30, true),
('Nescafé', '["Events"]'::jsonb, 'https://www.youtube.com/watch?v=jka_m3z1Xx8', 'yt', 'jka_m3z1Xx8', 'https://themadlions.com/wp-content/uploads/2019/10/nescafe.png', 31, true),
('What''s Up – X-Factor', '["Events"]'::jsonb, 'https://www.youtube.com/watch?v=oDPgnRbVQ5s', 'yt', 'oDPgnRbVQ5s', 'https://themadlions.com/wp-content/uploads/2017/03/Whats-up.png', 32, true),
('Star Academy', '["Commercials"]'::jsonb, 'https://vimeo.com/231087530', 'vm', '231087530', 'https://themadlions.com/wp-content/uploads/2017/02/academy.png', 33, true),
('Easy FM 97.2', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=LJmFH1_buIs', 'yt', 'LJmFH1_buIs', 'https://themadlions.com/wp-content/uploads/2017/02/Στιγμιότυπο-2017-02-24-8.57.51-μμ.png', 34, true),
('Christodoulou – Marathon', '["Events"]'::jsonb, 'https://www.youtube.com/watch?v=k9wycfdAL10', 'yt', 'k9wycfdAL10', 'https://themadlions.com/wp-content/uploads/2017/08/christodouilou-wide.png', 35, true),
('Fluo Live', '["Motion Graphics"]'::jsonb, 'https://www.youtube.com/watch?v=IIYKCXvb7JY', 'yt', 'IIYKCXvb7JY', 'https://themadlions.com/wp-content/uploads/2016/12/fluolive.png', 36, true),
('Germanos – The Voice', '["Events"]'::jsonb, 'https://www.youtube.com/watch?v=MSLQrRFrdsc', 'yt', 'MSLQrRFrdsc', 'https://themadlions.com/wp-content/uploads/2017/08/germanos.png', 37, true),
('Theodoridou', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=K9JAykHMtmk', 'yt', 'K9JAykHMtmk', 'https://themadlions.com/wp-content/uploads/2020/04/theo.png', 38, true),
('Boss – #Koloneis', '["Events"]'::jsonb, 'https://www.youtube.com/watch?v=TLO8uJ6lGlk', 'yt', 'TLO8uJ6lGlk', 'https://themadlions.com/wp-content/uploads/2019/10/boss.png', 39, true),
('Fluo', '["Commercials"]'::jsonb, 'https://www.youtube.com/watch?v=z-LZfkTOZeM', 'yt', 'z-LZfkTOZeM', 'https://themadlions.com/wp-content/uploads/2014/03/maxresdefault.jpg', 40, true),
('Claydee – Alena', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=K68UrdUOr2Y', 'yt', 'K68UrdUOr2Y', 'https://themadlions.com/wp-content/uploads/2014/03/maxresdefault-1.jpg', 41, true),
('Elpedison', '["Events"]'::jsonb, 'https://www.youtube.com/watch?v=DG16JBN2eZM', 'yt', 'DG16JBN2eZM', 'https://themadlions.com/wp-content/uploads/2017/08/elpedison.png', 42, true),
('Varsal & Zaava – Sujet', '["Music Videos"]'::jsonb, 'https://www.youtube.com/watch?v=6orY51pXS40', 'yt', '6orY51pXS40', 'https://themadlions.com/wp-content/uploads/2016/08/varsal.png', 43, true)
) v(title, categories, video, kind, video_id, image, position, visible)
where not exists (select 1 from site_works);
