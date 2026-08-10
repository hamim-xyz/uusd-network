import { Request, Response, NextFunction } from 'express';
import { validateInitData, ValidatedInitData } from '../utils/telegram.js';
import { query } from '../db/pool.js';

export interface TelegramRequest extends Request {
  telegram?: ValidatedInitData;
  telegramId?: string;
}

export async function optionalTelegramAuth(req: TelegramRequest, res: Response, next: NextFunction) {
  const initData = (req.headers['x-telegram-init-data'] as string) || '';
  const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';

  if (!initData) {
    return next();
  }

  if (!botToken) {
    try {
      const params = new URLSearchParams(initData);
      const userJson = params.get('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        req.telegram = {
          user,
          authDate: Number(params.get('auth_date') || 0),
          startParam: params.get('start_param') || undefined,
          raw: Object.fromEntries(params),
        };
        req.telegramId = String(user.id);
      }
    } catch { /* ignore */ }
    return next();
  }

  const validated = validateInitData(initData, botToken);
  if (!validated) {
    return res.status(401).json({ error: 'Invalid Telegram authentication' });
  }

  req.telegram = validated;
  req.telegramId = String(validated.user.id);
  next();
}

export async function requireTelegramUser(req: TelegramRequest, res: Response, next: NextFunction) {
  await new Promise<void>((resolve) => {
    optionalTelegramAuth(req, res, () => resolve());
  });

  if (res.headersSent) return;

  const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  const bodyId = req.body?.telegramId || req.params?.telegramId || req.query?.telegramId;
  const headerId = req.headers['x-telegram-id'] as string;

  if (req.telegramId) {
    if (bodyId && String(bodyId) !== req.telegramId) {
      return res.status(403).json({ error: 'Telegram ID mismatch' });
    }
    return next();
  }

  if (botToken) {
    return res.status(401).json({ error: 'Telegram authentication required' });
  }

  const fallbackId = bodyId || headerId;
  if (!fallbackId) {
    return res.status(401).json({ error: 'telegramId required' });
  }
  req.telegramId = String(fallbackId);
  next();
}

export async function rejectIfBlocked(req: TelegramRequest, res: Response, next: NextFunction) {
  const id = req.telegramId || req.body?.telegramId || req.params?.telegramId;
  if (!id) return next();
  try {
    const rows: any[] = await query(
      'SELECT blocked FROM wallets WHERE telegram_id = ? LIMIT 1',
      [id]
    );
    if (rows.length && rows[0].blocked) {
      return res.status(403).json({ error: 'Your wallet is blocked. Contact support.' });
    }
  } catch { /* DB may not be ready */ }
  next();
}
