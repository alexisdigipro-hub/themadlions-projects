-- THEMADLIONS Projects · anyone on a project can add a receipt to its budget
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.
--
-- Alex (9 Oct): "whoever has no Budget permission sees one tab, Add Receipt, and can enter a
-- receipt, which goes into the budget as an expense."
--
-- Why a function: a project is one row, and only members with some edit permission may update it.
-- A crew member with view rights only cannot, and should not, write the project. This door opens
-- exactly one thing: appending ONE budget line that carries a receipt the caller added, on a
-- project they can see. It is paid by the company, or refunded to the caller themself, never to
-- anyone else. It cannot touch any other line or any other part of the project. Administrators
-- and members with an edit permission do not need it; the app writes the project directly.

create or replace function add_receipt_line(p_project text, p_line jsonb) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  ws uuid := my_ws();
  me text := auth.uid()::text;
  cur jsonb;
  lines jsonb;
  line jsonb;
  rc jsonb := p_line -> 'receipt';
  est numeric;
  vat numeric;
  refund boolean := coalesce(p_line ->> 'memberId', '') = me and me is not null;
begin
  if ws is null or me is null then raise exception 'not signed in'; end if;
  if not can_view_project(p_project) then raise exception 'no access to this project'; end if;
  if rc is null or jsonb_typeof(rc) <> 'object' then raise exception 'a receipt is needed'; end if;
  if coalesce(rc ->> 'addedBy', '') <> me then raise exception 'not your receipt'; end if;

  select data into cur from projects where id = p_project and workspace_id = ws for update;
  if cur is null then raise exception 'no such project'; end if;
  lines := coalesce(cur -> 'budget' -> 'lines', '[]'::jsonb);

  est := greatest(0, coalesce(nullif(p_line ->> 'estimate', '')::numeric, 0));
  vat := greatest(0, coalesce(nullif(p_line ->> 'vatPct', '')::numeric, 0));
  -- only the keys a receipt line has; the person, if any, pinned to the caller
  line := jsonb_build_object(
    'id', coalesce(nullif(p_line ->> 'id', ''), md5(random()::text || clock_timestamp()::text)),
    'category', left(coalesce(p_line ->> 'category', 'Misc'), 80),
    'description', left(coalesce(p_line ->> 'description', ''), 300),
    'qty', 1, 'unit', 'flat', 'rate', 0,
    'estimate', est, 'vatPct', case when vat > 0 then to_jsonb(vat) else to_jsonb(''::text) end, 'actual', '',
    'vendor', left(coalesce(p_line ->> 'vendor', ''), 120),
    'memberId', case when refund then me else '' end,
    'contactId', '', 'locationId', '',
    'date', left(coalesce(p_line ->> 'date', ''), 10),
    'notes', left(coalesce(p_line ->> 'notes', ''), 300),
    'receipt', jsonb_build_object(
      'id', left(coalesce(rc ->> 'id', ''), 80),
      'name', left(coalesce(rc ->> 'name', ''), 200),
      'type', left(coalesce(rc ->> 'type', ''), 80),
      'size', coalesce(rc -> 'size', '0'::jsonb),
      'path', left(coalesce(rc ->> 'path', ''), 300),
      'fileid', rc -> 'fileid',
      'scope', rc -> 'scope',
      'thumb', left(coalesce(rc ->> 'thumb', ''), 60000),
      'addedAt', left(coalesce(rc ->> 'addedAt', ''), 40),
      'addedBy', me,
      'addedByName', left(coalesce(rc ->> 'addedByName', ''), 120)
    )
  );
  line := jsonb_strip_nulls(line);
  if refund then line := line || jsonb_build_object('reimburse', true); end if;
  -- the same id twice (a double tap) adds nothing
  if exists (select 1 from jsonb_array_elements(lines) l where l ->> 'id' = line ->> 'id') then
    return line ->> 'id';
  end if;

  if cur -> 'budget' is null then
    cur := cur || jsonb_build_object('budget', jsonb_build_object('lines', '[]'::jsonb, 'contingencyPct', 10, 'currency', 'EUR'));
  end if;
  cur := jsonb_set(cur, '{budget,lines}', lines || jsonb_build_array(line), true);
  cur := cur || jsonb_build_object('updatedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));

  update projects set data = cur, updated_at = now(), updated_by = auth.uid() where id = p_project and workspace_id = ws;
  return line ->> 'id';
end $$;

revoke all on function add_receipt_line(text, jsonb) from public;
grant execute on function add_receipt_line(text, jsonb) to authenticated;
