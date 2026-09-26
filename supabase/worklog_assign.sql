-- THEMADLIONS Projects · a budget line paid to a team member is mirrored into THEIR My work
-- Paste into Supabase > SQL Editor > New query > Run (after worklog.sql and share_access.sql,
-- which defines my_perm()). Safe to run more than once.
--
-- Why: worklog rows may only be written by their owner or an administrator (worklog.sql). Alex is
-- an administrator, so his budget lines reach a colleague's My work directly. A producer who has
-- Budget = edit but is not an administrator needs a door. These two functions are that door, and
-- they open no wider than this: the caller must hold Budget edit and access to the project, the
-- job must carry a budgetLineId that really exists on that project's budget with this member on
-- it, and the amount written is the line's own estimate, never the caller's number. Removing goes
-- through unassign_worklog(), which touches only budget-linked rows.

create or replace function assign_worklog(p_id text, p_user uuid, p_data jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  ws uuid := my_ws();
  pid text := p_data ->> 'projectId';
  lid text := p_data ->> 'budgetLineId';
  ln jsonb;
  est numeric;
  d jsonb;
begin
  if ws is null or my_perm('budget') <> 'edit' then raise exception 'not allowed'; end if;
  if pid is null or lid is null then raise exception 'not a budget-linked job'; end if;
  if not can_view_project(pid) then raise exception 'no access to this project'; end if;

  select l into ln
  from projects p, jsonb_array_elements(coalesce(p.data -> 'budget' -> 'lines', '[]'::jsonb)) l
  where p.id = pid and p.workspace_id = ws and l ->> 'id' = lid and l ->> 'memberId' = p_user::text
  limit 1;
  if ln is null then raise exception 'no such budget line for this member'; end if;

  -- the line's own money, recomputed here: flat estimate if given, else quantity × rate
  est := case
    when coalesce(ln ->> 'estimate', '') <> '' then (ln ->> 'estimate')::numeric
    else coalesce((ln ->> 'qty')::numeric, 0) * coalesce((ln ->> 'rate')::numeric, 0)
  end;

  -- only the keys My work reads, with the money and the identity pinned to the line
  d := jsonb_build_object(
    'id', p_id, 'userId', p_user, 'budgetLineId', lid, 'projectId', pid,
    'date', coalesce(p_data ->> 'date', to_char(current_date, 'YYYY-MM-DD')),
    'client', coalesce(p_data ->> 'client', ''),
    'description', coalesce(p_data ->> 'description', ''),
    'amount', est,
    'status', case when p_data ->> 'status' = 'paid' then 'paid' else 'pending' end,
    'paidDate', coalesce(p_data ->> 'paidDate', ''),
    'method', coalesce(p_data ->> 'method', 'Bank transfer'),
    'notes', coalesce(p_data ->> 'notes', ''),
    'createdAt', coalesce(p_data ->> 'createdAt', now()::text)
  );

  insert into worklog (id, workspace_id, user_id, data, updated_by)
  values (p_id, ws, p_user, d, auth.uid())
  on conflict (id) do update
    set user_id = excluded.user_id, data = excluded.data, updated_by = auth.uid()
    where worklog.workspace_id = ws and (worklog.data ->> 'budgetLineId') is not null;
end $$;

create or replace function unassign_worklog(p_id text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  ws uuid := my_ws();
begin
  if ws is null or my_perm('budget') <> 'edit' then raise exception 'not allowed'; end if;
  delete from worklog
  where id = p_id and workspace_id = ws
    and (data ->> 'budgetLineId') is not null
    and can_view_project(data ->> 'projectId');
end $$;

revoke all on function assign_worklog(text, uuid, jsonb) from public;
revoke all on function unassign_worklog(text) from public;
grant execute on function assign_worklog(text, uuid, jsonb) to authenticated;
grant execute on function unassign_worklog(text) to authenticated;
