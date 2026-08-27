import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireTelegramUser, TelegramRequest } from '../middleware/telegramAuth.js';

const router = Router();

function safeError(e: any, res: any) {
  console.error('[settings]', e?.message || e);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({ error: isProd ? 'Internal server error' : e?.message || 'Error' });
}

router.get('/global', async (_req, res) => {
  try {
    const rows: any[] = await query('SELECT value FROM settings WHERE `key` = ?', ['global']);
    if (!rows.length) {
      return res.json({
        depositEnabled: true,
        withdrawEnabled: true,
        maintenanceMode: false,
        minTransferAmount: 0,
        minWithdrawAmount: 10,
      });
    }
    const value = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
    const { botToken, hotWalletPrivateKey, ...safe } = value;
    res.json(safe);
  } catch (e: any) {
    safeError(e, res);
  }
});

router.get('/content', async (_req, res) => {
  try {
    const rows: any[] = await query('SELECT value FROM settings WHERE `key` = ?', ['app_content']);
    if (!rows.length) return res.json({ faq: [], news: [] });
    const value = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
    res.json(value);
  } catch (e: any) {
    safeError(e, res);
  }
});

router.get('/user/:telegramId', requireTelegramUser, async (req: TelegramRequest, res) => {
  try {
    if (req.telegramId !== String(req.params.telegramId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rows: any[] = await query(
      'SELECT language, currency, notifications, passcode_enabled as passcodeEnabled FROM user_settings WHERE telegram_id = ?',
      [req.params.telegramId]
    );
    if (!rows.length) {
      return res.json({ language: 'en', currency: 'USD', notifications: true, passcodeEnabled: false });
    }
    res.json({
      language: rows[0].language,
      currency: rows[0].currency,
      notifications: !!rows[0].notifications,
      passcodeEnabled: !!rows[0].passcodeEnabled,
    });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.put('/user/:telegramId', requireTelegramUser, async (req: TelegramRequest, res) => {
  try {
    if (req.telegramId !== String(req.params.telegramId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { language, currency, notifications, passcodeEnabled } = req.body;
    const allowedLangs = ['en', 'bn', 'hi', 'ar', 'zh'];
    const allowedCurrencies = ['USD', 'EUR', 'BDT', 'INR'];
    const lang = allowedLangs.includes(language) ? language : 'en';
    const curr = allowedCurrencies.includes(currency) ? currency : 'USD';
    await query(
      `INSERT INTO user_settings (telegram_id, language, currency, notifications, passcode_enabled)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         language = COALESCE(VALUES(language), language),
         currency = COALESCE(VALUES(currency), currency),
         notifications = COALESCE(VALUES(notifications), notifications),
         passcode_enabled = COALESCE(VALUES(passcode_enabled), passcode_enabled)`,
      [
        req.params.telegramId,
        lang,
        curr,
        notifications !== undefined ? (notifications ? 1 : 0) : 1,
        passcodeEnabled !== undefined ? (passcodeEnabled ? 1 : 0) : 0,
      ]
    );
    res.json({ success: true });
  } catch (e: any) {
    safeError(e, res);
  }
});

export default router;
