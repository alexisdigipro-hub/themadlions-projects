-- RoarMask (themadlions.com/lab/roarmask/), Alex 24 Nov 2026: "with the cloud too, like RoarRef; wherever I sign in, I see my masks".
-- Runs on RoarMe's Supabase project (bzmjhbnwhdwmncxkqkdl), where the Roar Accounts live. Only its own table roarmask_masks;
-- never touches roar_* tables. Each person reads and writes only their own masks. Safe to re-run.

create table if not exists roarmask_masks (
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         text not null,                               -- the mask's own id, made in the browser
  name       text not null default 'LED mask',
  data       jsonb not null default '{}'::jsonb,          -- { doc, shapes }: the screen, its settings and every shape
  thumb      text,                                        -- a small PNG of the mask (data URL) for Home
  ref        text,                                        -- the reference picture (data URL), never part of the export
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner, id),
  constraint roarmask_id check (char_length(id) between 1 and 40),
  constraint roarmask_name check (char_length(name) <= 120),
  constraint roarmask_data_size check (octet_length(data::text) <= 3000000),
  constraint roarmask_thumb_size check (thumb is null or octet_length(thumb) <= 600000),
  constraint roarmask_ref_size check (ref is null or octet_length(ref) <= 6000000)
);
create index if not exists roarmask_masks_owner on roarmask_masks (owner, updated_at desc);

alter table roarmask_masks enable row level security;
drop policy if exists roarmask_own on roarmask_masks;
create policy roarmask_own on roarmask_masks for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
revoke all on roarmask_masks from anon;
grant select, insert, update, delete on roarmask_masks to authenticated;

-- at most 500 masks a person, so nobody fills the database by accident
create or replace function roarmask_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from roarmask_masks where owner = new.owner) >= 500 then
    raise exception 'roarmask_limit: up to 500 masks' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function roarmask_limit() from public, anon, authenticated;
drop trigger if exists roarmask_limit on roarmask_masks;
create trigger roarmask_limit before insert on roarmask_masks for each row execute function roarmask_limit();
