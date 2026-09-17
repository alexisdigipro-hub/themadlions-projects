-- THEMADLIONS Projects · removes the Telegram mirror that an earlier chat.sql created. Safe to run even if it was never set up.
drop trigger if exists messages_to_telegram on messages;
drop function if exists messages_to_telegram();
drop table if exists telegram;
