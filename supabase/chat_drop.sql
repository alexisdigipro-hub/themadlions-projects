-- The old Hub Chat is gone (Alex, 20 Oct 2026): the team talks in RoarMe. Safe to run again.
-- Its 23 messages and 4 rooms are backed up on Alex's Mac (~/Desktop/ClaudeStuff/backups/hub-chat-2026-10-20.json).
drop policy if exists chat_files_select on storage.objects;
drop policy if exists chat_files_insert on storage.objects;
drop policy if exists chat_files_delete on storage.objects;
do $$ begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then alter publication supabase_realtime drop table public.messages; end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chats') then alter publication supabase_realtime drop table public.chats; end if;
end $$;
drop table if exists public.messages cascade;
drop table if exists public.chats cascade;
drop function if exists public.chat_pin(text, boolean);
drop function if exists public.chat_like(text, boolean);
drop function if exists public.chat_react(text, text, boolean);
drop function if exists public.chat_of_path(text);
drop function if exists public.can_read_chat(text);
drop function if exists public.chats_guard();
