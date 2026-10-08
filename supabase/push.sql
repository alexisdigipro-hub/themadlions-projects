-- THEMADLIONS Projects · push notifications (calls and chat messages ring with the app closed)
-- Paste into Supabase > SQL Editor > New query > Run (after chat_rooms.sql and chat_project_members.sql).
-- Safe to run more than once.
--
-- push_subscriptions: one row per phone / browser that said yes to notifications. Each person
--   sees, adds and removes only their own; the "push" Edge Function reads everyone's with the
--   service key to deliver.
-- push_config: the function's own VAPID key pair, made by the function the first time it runs.
--   Row Level Security on and no policy at all, so no app user can read it, only the function.
-- push_recipients(room): who may read a room, minus the one asking, worked out the same way
--   can_read_chat() decides it, so a message only rings for the people who can open it.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  app text not null default 'main',
  ua text not null default '',
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index if not exists push_subscriptions_user on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
drop policy if exists push_subs_select on push_subscriptions;
drop policy if exists push_subs_insert on push_subscriptions;
drop policy if exists push_subs_update on push_subscriptions;
drop policy if exists push_subs_delete on push_subscriptions;
create policy push_subs_select on push_subscriptions for select using (user_id = auth.uid());
create policy push_subs_insert on push_subscriptions for insert with check (user_id = auth.uid() and workspace_id = my_ws());
create policy push_subs_update on push_subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid() and workspace_id = my_ws());
create policy push_subs_delete on push_subscriptions for delete using (user_id = auth.uid());

-- A browser that moves to another account on the same phone keeps one endpoint: the new owner
-- takes the row over. Security definer because the old row belongs to someone else.
create or replace function push_claim(p_endpoint text, p_p256dh text, p_auth text, p_app text, p_ua text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or my_ws() is null then raise exception 'not signed in'; end if;
  insert into push_subscriptions (user_id, workspace_id, endpoint, p256dh, auth, app, ua)
  values (auth.uid(), my_ws(), p_endpoint, p_p256dh, p_auth, coalesce(nullif(p_app, ''), 'main'), coalesce(p_ua, ''))
  on conflict (endpoint) do update set user_id = excluded.user_id, workspace_id = excluded.workspace_id,
    p256dh = excluded.p256dh, auth = excluded.auth, app = excluded.app, ua = excluded.ua, created_at = now();
end
$$;
revoke all on function push_claim(text, text, text, text, text) from public;
grant execute on function push_claim(text, text, text, text, text) to authenticated;

create table if not exists push_config (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_jwk jsonb not null,
  created_at timestamptz not null default now()
);
alter table push_config enable row level security;
-- (no policies on purpose: only the service key, i.e. the Edge Function, reads or writes it)

create or replace function push_recipients(p_chat text) returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.user_id from members m
  where can_read_chat(p_chat)
    and m.workspace_id = my_ws() and m.active and m.user_id <> auth.uid()
    and case
      when p_chat is null or p_chat = '' or p_chat = 'team' then true
      when left(p_chat, 2) = 'p:' then
        (m.role = 'admin' or m.project_access = '"all"'::jsonb or m.project_access ? substr(p_chat, 3))
        and (m.role = 'admin' or not exists (
          select 1 from projects
          where id = substr(p_chat, 3) and workspace_id = my_ws()
            and jsonb_typeof(data -> 'chatExcluded') = 'array'
            and (data -> 'chatExcluded') ? m.user_id::text
        ))
      else exists (select 1 from chats where id = p_chat and workspace_id = my_ws() and m.user_id = any(members))
    end
$$;
revoke all on function push_recipients(text) from public;
grant execute on function push_recipients(text) to authenticated;
