// THEMADLIONS Projects · Telegram -> app
// Receives Telegram updates for the team bot and stores group messages in the chat.
// Deploy: Supabase dashboard > Edge Functions > New function "telegram-webhook" > paste this file > Deploy
//         (turn "Verify JWT" off; Telegram does not send one)
//   or:   npx supabase functions deploy telegram-webhook --no-verify-jwt
// Then register the webhook once (replace TOKEN, PROJECT and SECRET from the telegram table):
//   https://api.telegram.org/botTOKEN/setWebhook?url=https://PROJECT.supabase.co/functions/v1/telegram-webhook&secret_token=SECRET
// The secret is shown in the app under Chat > Telegram after saving the bot.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  const secret = req.headers.get('x-telegram-bot-api-secret-token') || ''
  let update: any
  try { update = await req.json() } catch { return new Response('bad json', { status: 400 }) }
  const msg = update.message || update.channel_post
  if (!msg || !msg.text) return new Response('ignored')
  if (msg.from?.is_bot) return new Response('ignored')

  const chatId = String(msg.chat?.id ?? '')
  const { data: t } = await admin.from('telegram').select('workspace_id, webhook_secret').eq('chat_id', chatId).maybeSingle()
  if (!t) return new Response('unknown chat', { status: 200 })
  if (t.webhook_secret && secret !== t.webhook_secret) return new Response('forbidden', { status: 403 })

  const name = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.from?.username || 'Telegram'
  const id = 'tg-' + chatId.replace('-', 'n') + '-' + msg.message_id
  const { error } = await admin.from('messages').upsert({
    id,
    workspace_id: t.workspace_id,
    user_id: null,
    user_name: name,
    text: msg.text,
    source: 'telegram',
    telegram_message_id: msg.message_id,
    created_at: new Date((msg.date || Date.now() / 1000) * 1000).toISOString(),
  }, { onConflict: 'id' })
  if (error) return new Response(error.message, { status: 500 })
  return new Response('ok')
})
