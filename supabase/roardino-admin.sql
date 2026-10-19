-- Roardino admin panel (RoarMe's Supabase project bzmjhbnwhdwmncxkqkdl, NOT the hub's).
-- Already applied by Claude on 19 Oct 2026. Safe to re-run.
-- Logs every open of a published ordino link and gives RoarMe admins (roar_admins) one stats call.

create table if not exists public.roardino_opens (
  id bigserial primary key,
  ordino_id uuid not null,
  visitor text not null default '',
  opened_at timestamptz not null default now()
);
alter table public.roardino_opens enable row level security;
revoke all on public.roardino_opens from anon, authenticated;
create index if not exists roardino_opens_ordino_idx on public.roardino_opens (ordino_id, opened_at);

-- The link page sends an anonymous per-browser id, so unique viewers can be counted.
create or replace function public.roardino_get(p_token text, p_visitor text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v jsonb; u timestamptz; oid uuid;
begin
  update public.roardino_ordinos set opens = opens + 1 where token = p_token and published is not null
    returning id, published, published_at into oid, v, u;
  if v is null then return null; end if;
  insert into public.roardino_opens (ordino_id, visitor) values (oid, left(coalesce(p_visitor, ''), 40));
  return jsonb_build_object('data', v, 'updatedAt', u);
end $$;
grant execute on function public.roardino_get(text, text) to anon, authenticated;

create or replace function public.roardino_admin_stats() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare r jsonb;
begin
  if not exists (select 1 from public.roar_admins where user_id = auth.uid()) then
    raise exception 'not allowed';
  end if;
  with o as (
    select x.id, x.owner, x.token, x.published is not null as pub, x.published_at, x.opens, x.updated_at, x.created_at,
      coalesce(nullif(x.data #>> '{project,title}', ''), 'Χωρίς τίτλο') as title,
      coalesce(x.data #>> '{day,label}', '') as label,
      coalesce(x.data #>> '{day,date}', '') as day,
      (select count(distinct nullif(v.visitor, '')) from public.roardino_opens v where v.ordino_id = x.id) as visitors,
      (select max(v.opened_at) from public.roardino_opens v where v.ordino_id = x.id) as last_open,
      (select count(*) from public.roar_messages m where m.file ? 'ordino' and x.token is not null
         and m.file #>> '{ordino,url}' like '%t=' || x.token) as sent
    from public.roardino_ordinos x
  ), sent as (
    select m.user_id, count(*) as n, max(m.created_at) as last from public.roar_messages m
    where m.file ? 'ordino' group by m.user_id
  ), people as (
    select u.id, u.email,
      coalesce(nullif(dp.name, ''), nullif(rp.display_name, ''), split_part(u.email, '@', 1)) as name,
      coalesce(dp.company, '') as company, coalesce(rp.username, '') as username
    from auth.users u
    left join public.roardino_profiles dp on dp.id = u.id
    left join public.roar_profiles rp on rp.id = u.id
    where u.id in (select owner from o) or u.id in (select user_id from sent)
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'users', (select count(distinct owner) from o),
      'ordinos', (select count(*) from o),
      'published', (select count(*) from o where pub),
      'opens', (select coalesce(sum(opens), 0) from o),
      'visitors', (select count(distinct nullif(visitor, '')) from public.roardino_opens),
      'sent', (select coalesce(sum(n), 0) from sent)),
    'users', coalesce((select jsonb_agg(jsonb_build_object(
        'name', p.name, 'company', p.company, 'email', p.email, 'username', p.username,
        'ordinos', (select count(*) from o where o.owner = p.id),
        'published', (select count(*) from o where o.owner = p.id and o.pub),
        'opens', (select coalesce(sum(o.opens), 0) from o where o.owner = p.id),
        'visitors', (select count(distinct nullif(v.visitor, '')) from public.roardino_opens v join o on o.id = v.ordino_id where o.owner = p.id),
        'sent', coalesce((select s.n from sent s where s.user_id = p.id), 0),
        'last', greatest((select max(o.updated_at) from o where o.owner = p.id), (select s.last from sent s where s.user_id = p.id))
      ) order by (select coalesce(sum(o.opens), 0) from o where o.owner = p.id) desc, p.name) from people p), '[]'::jsonb),
    'ordinos', coalesce((select jsonb_agg(jsonb_build_object(
        'title', o.title, 'label', o.label, 'day', o.day, 'published', o.pub, 'published_at', o.published_at,
        'opens', o.opens, 'visitors', o.visitors, 'last_open', o.last_open, 'sent', o.sent,
        'owner', (select p.name from people p where p.id = o.owner)
      ) order by o.updated_at desc) from (select * from o order by updated_at desc limit 300) o), '[]'::jsonb),
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', d::date,
        'opens', (select count(*) from public.roardino_opens v where v.opened_at::date = d::date)) order by d)
      from generate_series(current_date - 13, current_date, interval '1 day') d), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.roardino_admin_stats() from public, anon;
grant execute on function public.roardino_admin_stats() to authenticated;
