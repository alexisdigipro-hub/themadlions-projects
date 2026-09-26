-- THEMADLIONS Projects · a job in My work puts the person's fee into the project budget
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql, worklog.sql and
-- share_access.sql, which defines my_perm()). Safe to run more than once.
--
-- Alex: "when someone enters a job in their My work with an existing project, it should update
-- the project's budget too, if we have not already put their fee in the budget."
--
-- Why a function: a project is one row, and only members with an edit permission may update it.
-- A crew member with nothing but My work cannot, and should not, write the project. This door
-- opens exactly one thing: appending ONE budget line that pays the caller themself, on a project
-- they can see, and only when no line for them is there yet. It cannot touch any other line, any
-- other person, or any other part of the project. Administrators and members with Budget = edit
-- do not need it; the app writes the project directly for them.

create or replace function claim_budget_line(p_project text, p_line jsonb) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  ws uuid := my_ws();
  me text := auth.uid()::text;
  cur jsonb;
  lines jsonb;
  line jsonb;
  est numeric;
begin
  if ws is null or me is null then raise exception 'not signed in'; end if;
  if not can_view_project(p_project) then raise exception 'no access to this project'; end if;

  select data into cur from projects where id = p_project and workspace_id = ws for update;
  if cur is null then raise exception 'no such project'; end if;
  lines := coalesce(cur -> 'budget' -> 'lines', '[]'::jsonb);

  -- already there: the fee was entered by the production, nothing to add
  if exists (select 1 from jsonb_array_elements(lines) l where l ->> 'memberId' = me) then
    return null;
  end if;

  est := greatest(0, coalesce((p_line ->> 'estimate')::numeric, 0));
  -- only the keys a budget line has, with the person pinned to the caller
  line := jsonb_build_object(
    'id', coalesce(nullif(p_line ->> 'id', ''), md5(random()::text || clock_timestamp()::text)),
    'category', left(coalesce(p_line ->> 'category', 'Production staff'), 80),
    'description', left(coalesce(p_line ->> 'description', ''), 300),
    'qty', 1, 'unit', 'flat', 'rate', 0,
    'estimate', est, 'actual', '',
    'vendor', left(coalesce(p_line ->> 'vendor', ''), 120),
    'memberId', me,
    'date', left(coalesce(p_line ->> 'date', ''), 10),
    'notes', left(coalesce(p_line ->> 'notes', 'From My work'), 300)
  );

  if cur -> 'budget' is null then
    cur := cur || jsonb_build_object('budget', jsonb_build_object('lines', '[]'::jsonb, 'contingencyPct', 10, 'currency', 'EUR'));
  end if;
  cur := jsonb_set(cur, '{budget,lines}', lines || jsonb_build_array(line), true);
  cur := cur || jsonb_build_object('updatedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));

  update projects set data = cur, updated_at = now(), updated_by = auth.uid() where id = p_project and workspace_id = ws;
  return line ->> 'id';
end $$;

revoke all on function claim_budget_line(text, jsonb) from public;
grant execute on function claim_budget_line(text, jsonb) to authenticated;
