-- Enquiries from the company site's "Tell us about your project" form (Alex, 13 Oct). Anyone visiting
-- the site may send one (no sign-in, so the anon key may only add a row, never read one back);
-- administrators read them, mark them and delete them in the app. Safe to run again.

create table if not exists site_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null,
  company text,
  kind text,
  budget text,
  needed_by text,
  message text,
  lang text,
  status text not null default 'new'
);

alter table site_leads enable row level security;

grant insert on site_leads to anon, authenticated;
grant select, update, delete on site_leads to authenticated;

-- a visitor adds one sensible row: an address with an @, short fields, always starting as new
drop policy if exists site_leads_send on site_leads;
create policy site_leads_send on site_leads for insert to anon, authenticated
  with check (
    status = 'new'
    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200
    and char_length(coalesce(name, '')) <= 200
    and char_length(coalesce(company, '')) <= 200
    and char_length(coalesce(kind, '')) <= 100
    and char_length(coalesce(budget, '')) <= 100
    and char_length(coalesce(needed_by, '')) <= 100
    and char_length(coalesce(message, '')) <= 4000
    and char_length(coalesce(lang, '')) <= 10
  );

-- only administrators see and handle them
drop policy if exists site_leads_admin_read on site_leads;
create policy site_leads_admin_read on site_leads for select to authenticated using (is_admin());
drop policy if exists site_leads_admin_edit on site_leads;
create policy site_leads_admin_edit on site_leads for update to authenticated using (is_admin()) with check (is_admin());
drop policy if exists site_leads_admin_delete on site_leads;
create policy site_leads_admin_delete on site_leads for delete to authenticated using (is_admin());

-- the app hears a new enquiry the moment it arrives
do $$ begin
  alter publication supabase_realtime add table site_leads;
exception when others then null;
end $$;
