-- Public links, tightened (security review, 25 Oct 2026). Safe to run again, after share_pin.sql and estimates.sql.
-- 1. The old one-argument share_get (from shares.sql) was still there next to share_pin.sql's: it gave a link's
--    content with no code and even when the link was closed. The app only calls the two-argument one.
-- 2. A link's six-digit code: five wrong tries lock the link for 15 minutes, so it cannot be guessed.
-- 3. A reply (approve / changes) only on a link that is open, not past its date, and with its code.
-- 4. Old call sheet links (kind 'callsheet'): only for members with the Ordino permission (were open to every member).

drop function if exists share_get(text);

alter table shares add column if not exists pin_fails int not null default 0;
alter table shares add column if not exists pin_locked_until timestamptz;

create or replace function share_get(p_token text, p_pin text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r shares%rowtype;
begin
  select * into r from shares where token = p_token;
  if not found then
    return null;
  end if;
  if r.closed or (r.expires_at is not null and r.expires_at < current_date) then
    return jsonb_build_object('kind', r.kind, 'closed', true);
  end if;
  if coalesce(r.pin, '') <> '' then
    if r.pin_locked_until is not null and r.pin_locked_until > now() then
      return jsonb_build_object('kind', r.kind, 'locked', true, 'wait', true);
    end if;
    if r.pin <> btrim(coalesce(p_pin, '')) then
      -- only a wrong code counts, not the first visit without one
      if coalesce(btrim(p_pin), '') <> '' then
        update shares set pin_fails = case when pin_fails + 1 >= 5 then 0 else pin_fails + 1 end,
          pin_locked_until = case when pin_fails + 1 >= 5 then now() + interval '15 minutes' else pin_locked_until end
        where token = p_token;
      end if;
      return jsonb_build_object('kind', r.kind, 'locked', true);
    end if;
  end if;
  update shares set opens = coalesce(opens, 0) + 1, opened_at = now(), pin_fails = 0, pin_locked_until = null where token = p_token;
  return jsonb_build_object('kind', r.kind, 'data', r.data, 'updated_at', r.updated_at);
end
$$;
grant execute on function share_get(text, text) to anon, authenticated;

drop function if exists share_respond(text, text, text, text);
create or replace function share_respond(p_token text, p_name text, p_status text, p_note text, p_pin text default null) returns void
language sql security definer set search_path = public as $$
  update shares set responses = coalesce(responses, '[]'::jsonb) || jsonb_build_object(
      'at', now(),
      'name', left(coalesce(p_name, ''), 120),
      'status', case when p_status in ('approved', 'changes', 'seen') then p_status else 'seen' end,
      'note', left(coalesce(p_note, ''), 4000)
    )
  where token = p_token
    and kind in ('delivery', 'estimate')
    and not coalesce(closed, false)
    and (expires_at is null or expires_at >= current_date)
    and (coalesce(pin, '') = '' or pin = btrim(coalesce(p_pin, '')))
    and jsonb_array_length(coalesce(responses, '[]'::jsonb)) < 200
$$;
grant execute on function share_respond(text, text, text, text, text) to anon, authenticated;

drop policy if exists shares_read on shares;
drop policy if exists shares_new on shares;
drop policy if exists shares_edit on shares;
drop policy if exists shares_gone on shares;
create policy shares_read on shares for select using (workspace_id = my_ws() and case kind
  when 'note' then created_by = auth.uid()
  when 'callsheet' then my_perm('callsheets') <> 'none'
  when 'estimate' then is_admin()
  else my_perm('share') <> 'none' end);
create policy shares_new on shares for insert with check (workspace_id = my_ws() and case kind
  when 'note' then created_by = auth.uid()
  when 'callsheet' then my_perm('callsheets') = 'edit'
  when 'estimate' then is_admin()
  else my_perm('share') = 'edit' end);
create policy shares_edit on shares for update using (workspace_id = my_ws() and case kind
  when 'note' then created_by = auth.uid()
  when 'callsheet' then my_perm('callsheets') = 'edit'
  when 'estimate' then is_admin()
  else my_perm('share') = 'edit' end)
  with check (workspace_id = my_ws() and case kind
  when 'note' then created_by = auth.uid()
  when 'callsheet' then my_perm('callsheets') = 'edit'
  when 'estimate' then is_admin()
  else my_perm('share') = 'edit' end);
create policy shares_gone on shares for delete using (workspace_id = my_ws() and case kind
  when 'note' then created_by = auth.uid()
  when 'callsheet' then my_perm('callsheets') = 'edit'
  when 'estimate' then is_admin()
  else my_perm('share') = 'edit' end);
