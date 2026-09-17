-- THEMADLIONS Projects · team chat
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.

create table if not exists messages (
  id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid,
  user_name text not null default '',
  text text not null,
  source text not null default 'app' check (source in ('app', 'telegram')),
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  updated_by uuid
);
create index if not exists messages_ws_created on messages (workspace_id, created_at);

drop trigger if exists messages_touch on messages;
create trigger messages_touch before insert or update on messages for each row execute function touch_updated_at();

alter table messages enable row level security;
drop policy if exists messages_select on messages;
drop policy if exists messages_insert on messages;
drop policy if exists messages_delete on messages;
create policy messages_select on messages for select using (workspace_id = my_ws());
create policy messages_insert on messages for insert with check (workspace_id = my_ws() and (user_id = auth.uid() or user_id is null));
create policy messages_delete on messages for delete using (workspace_id = my_ws() and (user_id = auth.uid() or is_admin()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- ---------- optional: mirror the chat to a Telegram group ----------
-- 1. Talk to @BotFather in Telegram, /newbot, copy the token.
-- 2. Add the bot to your team group, make it an admin (so it can read messages), send one message in the group.
-- 3. Open https://api.telegram.org/bot<TOKEN>/getUpdates in a browser and copy the "chat":{"id": -100...} number.
-- 4. In the app: Chat > Telegram (administrators) > paste token and chat id > Save. That writes the row below.
-- App -> Telegram works from here alone (pg_net). Telegram -> app needs the Edge Function in supabase/functions/telegram-webhook.

create extension if not exists pg_net;

create table if not exists telegram (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  bot_token text not null,
  chat_id text not null,
  webhook_secret text not null default encode(gen_random_bytes(16), 'hex'),
  updated_at timestamptz default now()
);
alter table telegram enable row level security;
drop policy if exists telegram_admin on telegram;
create policy telegram_admin on telegram for all using (is_admin() and workspace_id = my_ws()) with check (is_admin() and workspace_id = my_ws());

create or replace function messages_to_telegram() returns trigger
language plpgsql security definer set search_path = public, net as $$
declare
  t record;
  body text;
begin
  if new.source <> 'app' then return new; end if;
  select * into t from telegram where workspace_id = new.workspace_id;
  if t is null then return new; end if;
  body := new.user_name || ': ' || new.text;
  perform net.http_post(
    url := 'https://api.telegram.org/bot' || t.bot_token || '/sendMessage',
    body := jsonb_build_object('chat_id', t.chat_id, 'text', body),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end $$;

drop trigger if exists messages_to_telegram on messages;
create trigger messages_to_telegram after insert on messages for each row execute function messages_to_telegram();
