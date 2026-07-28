import { createHmac } from 'crypto';

const ALLOWED_USER_ID = 1040381598;

export function validateAuth(req, res) {
  const initData = req.headers['x-telegram-init-data'];

  // Allow dev bypass
  if (process.env.NODE_ENV !== 'production' && !initData) {
    return true;
  }

  if (!initData) {
    res.status(403).json({ error: 'Missing auth' });
    return false;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();

  const expected = createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  if (expected !== hash) {
    res.status(403).json({ error: 'Invalid signature' });
    return false;
  }

  const user = JSON.parse(params.get('user') || '{}');
  if (user.id !== ALLOWED_USER_ID) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }

  return true;
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Telegram-Init-Data');
}
