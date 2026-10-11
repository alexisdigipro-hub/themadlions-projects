-- Who sees which calendar (Alex, 11 Oct; Settings > Calendar & projects). workspaces.settings
-- -> calendarAccess maps an event type's key to the ids of the people who see it; no entry means
-- everyone. Administrators see every calendar and everyone sees their own days off, the same rule as
-- canSeeCalendar in the app. The old events_write (for all) also opened reading to anyone with edit
-- rights, so it becomes separate insert / update / delete policies and reading goes through
-- events_select alone. Safe to run again.

create or replace function can_see_calendar(p_type text, p_person text) returns boolean
language sql stable security definer set search_path = public as $$
  select
    coalesce((select role = 'admin' from members where user_id = auth.uid() and active limit 1), false)
    or (p_type = 'unavailable' and p_person = auth.uid()::text)
    or coalesce((
      select case
        when jsonb_typeof(w.settings -> 'calendarAccess' -> p_type) = 'array'
          then (w.settings -> 'calendarAccess' -> p_type) ? auth.uid()::text
        else true
      end
      from workspaces w where w.id = my_ws()
    ), true)
$$;

drop policy if exists events_select on events;
create policy events_select on events for select
  using (workspace_id = my_ws()
    and (project_id is null or can_view_project(project_id))
    and can_see_calendar(coalesce(data ->> 'type', ''), coalesce(data ->> 'personId', '')));

drop policy if exists events_write on events;
drop policy if exists events_insert on events;
drop policy if exists events_update on events;
drop policy if exists events_delete on events;
create policy events_insert on events for insert
  with check (workspace_id = my_ws() and ((project_id is null and can_edit_any()) or can_edit_project(project_id)));
create policy events_update on events for update
  using (workspace_id = my_ws() and ((project_id is null and can_edit_any()) or can_edit_project(project_id)))
  with check (workspace_id = my_ws() and ((project_id is null and can_edit_any()) or can_edit_project(project_id)));
create policy events_delete on events for delete
  using (workspace_id = my_ws() and ((project_id is null and can_edit_any()) or can_edit_project(project_id)));
