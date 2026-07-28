const ALLOWED_USER_ID = 1040381598;

async function sendMessage(chatId, text, replyMarkup) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const update = req.body;
    const message = update.message || update.callback_query?.message;
    const userId = update.message?.from?.id || update.callback_query?.from?.id;
    const chatId = message?.chat?.id;
    const text = update.message?.text ?? '';

    // Only respond to allowed user
    if (userId !== ALLOWED_USER_ID) {
      return res.status(200).json({ ok: true });
    }

    if (text === '/start' || text.startsWith('/start')) {
      const appUrl = process.env.APP_URL;
      await sendMessage(chatId,
        '⚔️ <b>Добро пожаловать в твою игру</b>\n\nОткрой трекер чтобы видеть прогресс и управлять квестами.',
        {
          inline_keyboard: [[
            { text: '🎮 Открыть трекер', web_app: { url: appUrl } }
          ]]
        }
      );
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(200).json({ ok: true }); // Always 200 to Telegram
  }
}
