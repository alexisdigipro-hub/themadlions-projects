-- THEMADLIONS Projects · "Locked until paid" on a delivery (Alex, 10 Nov 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to run more than once; run it after share_safety.sql
-- (and again if share_safety.sql or share_pin.sql is ever re-run, since both rewrite share_get).
--
-- A delivery link can be locked until the final payment is settled. While shares.pay_locked is on, share_get still
-- opens the page (title, client, message, credits, fine print) but strips every downloadable part out of the data
-- before it leaves the database: the download link, each file's link and pCloud id, the pCloud folder, the
-- thumbnails' pictures and their download addresses, and any transfer password. The client's browser never receives
-- them, so nothing on the page or in its network traffic can download a file. Only the files' names and sizes and the
-- thumbnails' names and sizes go out, so the page can list them as locked. Turning the lock off gives the same link
-- its files back at once.
--
-- Everything else in share_get is exactly as in share_safety.sql: closed and expired links, the access code, five
-- wrong tries lock the link for 15 minutes, the open counter, the two-argument signature.

alter table shares add column if not exists pay_locked boolean not null default false;

-- the old one-argument share_get must stay gone (it skipped the code; see share_safety.sql)
drop function if exists share_get(text);

create or replace function share_get(p_token text, p_pin text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r shares%rowtype;
declare d jsonb;
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
  d := r.data;
  -- Locked until paid: the page without anything that downloads
  if coalesce(r.pay_locked, false) and r.kind = 'delivery' and jsonb_typeof(d) = 'object' then
    d := (d - 'link' - 'files' - 'thumbs' - 'pcFolder' - 'password')
      || jsonb_build_object(
        'payLocked', true,
        'link', '',
        'files', coalesce((
          select jsonb_agg(jsonb_build_object('name', coalesce(f->>'name', ''), 'size', f->'size'))
          from jsonb_array_elements(case when jsonb_typeof(r.data->'files') = 'array' then r.data->'files' else '[]'::jsonb end) f
        ), '[]'::jsonb),
        'thumbs', coalesce((
          select jsonb_agg(jsonb_build_object('name', coalesce(t->>'name', ''), 'w', t->'w', 'h', t->'h'))
          from jsonb_array_elements(case when jsonb_typeof(r.data->'thumbs') = 'array' then r.data->'thumbs' else '[]'::jsonb end) t
        ), '[]'::jsonb)
      );
  end if;
  return jsonb_build_object('kind', r.kind, 'data', d, 'updated_at', r.updated_at);
end
$$;
grant execute on function share_get(text, text) to anon, authenticated;
