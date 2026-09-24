-- THEMADLIONS Projects · a notice can only be edited by whoever sent it
-- Paste into Supabase > SQL Editor > New query > Run (after notices.sql). Safe to run more than once.
--
-- Until now the update rule let any recipient rewrite a notice, text and all, because recipients
-- had to update the row to record their "Got it". The row is now sender-or-administrator only, and
-- "Got it" goes through this one narrow function, which can write nothing but the caller's own
-- acknowledgement. Same idea as set_my_profile().

create or replace function ack_notice(p_id text) returns void
language sql security definer set search_path = public as $$
  update notices
     set data = jsonb_set(
       coalesce(data, '{}'::jsonb),
       array['acks', auth.uid()::text],
       to_jsonb(to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
       true)
   where id = p_id
     and workspace_id = my_ws()
     and notice_for_me(recipients, from_id)
$$;
revoke all on function ack_notice(text) from public;
grant execute on function ack_notice(text) to authenticated;

drop policy if exists notices_update on notices;
create policy notices_update on notices for update
  using (workspace_id = my_ws() and (from_id = auth.uid() or is_admin()))
  with check (workspace_id = my_ws() and (from_id = auth.uid() or is_admin()));

-- Note: notices.sql creates the older, wider update rule, so if that file is ever re-run, run this
-- one after it.
