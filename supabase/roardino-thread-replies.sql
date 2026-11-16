-- Roardino: a thread can answer another thread (Alex, 16 Nov 2026: right click on a thread, or pick words in it, and
-- reply with a thread of your own). Safe to run again.
alter table public.roardino_posts add column if not exists reply_to uuid references public.roardino_posts(id) on delete set null;
alter table public.roardino_posts add column if not exists reply_quote text;
alter table public.roardino_posts add column if not exists reply_name text;
create index if not exists roardino_posts_reply_to on public.roardino_posts (reply_to);
