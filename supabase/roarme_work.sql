-- RoarMe shows a member's hub tasks and calendar (Alex, 20 Oct 2026: phase 6; the hub stays the one source,
-- RoarMe only shows). Safe to run again. Used only by the Edge Function roarme-signin (action "work"), with the
-- service role, for one member at a time; the same rules the app and the database apply to that member:
--   * nothing for an inactive member or one whose access ended (permissions.accessUntil in the past);
--   * tasks only with the Tasks module (can(user, 'tasks')): project tasks in projects they can see, and to-dos,
--     assigned to them (assigneeId, or no id and their name, as TasksAll does); open ones, and done ones of the last week;
--   * events only with the Calendar module: in projects they can see (or no project), and only the event types
--     Settings > Calendar lets them see (can_see_calendar), from a week ago to three months ahead.

create or replace function public.roarme_member_work(uid uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  m record; w record; is_admin boolean; ended boolean; can_tasks boolean; can_cal boolean;
  tasks jsonb := '[]'; evs jsonb := '[]';
begin
  select * into m from members where user_id = uid and active limit 1;
  if not found then return null; end if;
  select * into w from workspaces where id = m.workspace_id;
  is_admin := m.role = 'admin';
  ended := not is_admin and coalesce(m.permissions->>'accessUntil', '') ~ '^\d{4}-\d{2}-\d{2}' and (m.permissions->>'accessUntil')::date < current_date;
  can_tasks := not ended and (is_admin or coalesce(m.permissions->>'tasks', 'none') in ('view', 'edit'));
  can_cal := not ended and (is_admin or coalesce(m.permissions->>'calendar', 'none') in ('view', 'edit'));

  if can_tasks then
    select coalesce(jsonb_agg(x order by (x->>'due') nulls last, x->>'title'), '[]') into tasks from (
      select jsonb_build_object('id', t->>'id', 'title', t->>'title', 'due', nullif(t->>'due', ''), 'priority', t->>'priority',
        'status', t->>'status', 'notes', left(coalesce(t->>'notes', ''), 300), 'project', p.data->>'title', 'projectId', p.id) x
      from projects p, jsonb_array_elements(case when jsonb_typeof(p.data->'tasks') = 'array' then p.data->'tasks' else '[]' end) t
      where p.workspace_id = m.workspace_id
        and (is_admin or m.project_access = '"all"'::jsonb or m.project_access ? p.id)
        and (t->>'assigneeId' = uid::text or (coalesce(t->>'assigneeId', '') = '' and lower(coalesce(t->>'assignee', '')) = lower(coalesce(m.name, '-'))))
        and (coalesce(t->>'status', '') <> 'done' or (case when coalesce(t->>'doneAt', '') ~ '^\d{4}-\d{2}-\d{2}' then (t->>'doneAt')::timestamptz end) > now() - interval '7 days')
      union all
      select jsonb_build_object('id', l.data->>'id', 'title', l.data->>'title', 'due', nullif(l.data->>'due', ''), 'priority', l.data->>'priority',
        'status', l.data->>'status', 'notes', left(coalesce(l.data->>'notes', ''), 300), 'project', null, 'projectId', null) x
      from library l
      where l.workspace_id = m.workspace_id and l.kind = 'task'
        and (l.data->>'assigneeId' = uid::text or (coalesce(l.data->>'assigneeId', '') = '' and lower(coalesce(l.data->>'assignee', '')) = lower(coalesce(m.name, '-'))))
        and (coalesce(l.data->>'status', '') <> 'done' or (case when coalesce(l.data->>'doneAt', '') ~ '^\d{4}-\d{2}-\d{2}' then (l.data->>'doneAt')::timestamptz end) > now() - interval '7 days')
    ) q;
  end if;

  if can_cal then
    select coalesce(jsonb_agg(x order by x->>'date', x->>'start'), '[]') into evs from (
      select jsonb_build_object('id', e.id, 'title', e.data->>'title', 'type', e.data->>'type',
        'typeLabel', (select tt->>'label' from jsonb_array_elements(case when jsonb_typeof(w.settings->'eventTypes') = 'array' then w.settings->'eventTypes' else '[]' end) tt where tt->>'key' = e.data->>'type' limit 1),
        'color', (select tt->>'color' from jsonb_array_elements(case when jsonb_typeof(w.settings->'eventTypes') = 'array' then w.settings->'eventTypes' else '[]' end) tt where tt->>'key' = e.data->>'type' limit 1),
        'date', e.data->>'date', 'endDate', nullif(e.data->>'endDate', ''), 'start', nullif(e.data->>'start', ''), 'end', nullif(e.data->>'end', ''),
        'location', nullif(e.data->>'locationText', ''), 'person', nullif(e.data->>'personName', ''),
        'project', (select p.data->>'title' from projects p where p.id = e.project_id)) x
      from events e
      where e.workspace_id = m.workspace_id
        and case when coalesce(e.data->>'date', '') ~ '^\d{4}-\d{2}-\d{2}'
              then left(e.data->>'date', 10)::date between current_date - 7 and current_date + 90 else false end
        and (e.project_id is null or is_admin or m.project_access = '"all"'::jsonb or m.project_access ? e.project_id)
        and (is_admin
          or (coalesce(e.data->>'type', '') = 'unavailable' and e.data->>'personId' = uid::text)
          or case when jsonb_typeof(w.settings->'calendarAccess'->coalesce(e.data->>'type', '')) = 'array'
               then (w.settings->'calendarAccess'->coalesce(e.data->>'type', '')) ? uid::text else true end)
    ) q;
  end if;

  return jsonb_build_object('tasks', tasks, 'events', evs, 'canTasks', can_tasks, 'canCalendar', can_cal);
end $$;
revoke all on function public.roarme_member_work(uuid) from public, anon, authenticated;
grant execute on function public.roarme_member_work(uuid) to service_role;
