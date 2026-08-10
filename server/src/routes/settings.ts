import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

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
    res.status(500).json({ error: e.message });
  }
});

router.get('/content', async (_req, res) => {
  try {
    const rows: any[] = await query('SELECT value FROM settings WHERE `key` = ?', ['app_content']);
    if (!rows.length) return res.json({ faq: [], news: [] });
    const value = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
    res.json(value);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/user/:telegramId', async (req, res) => {
  try {
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
    res.status(500).json({ error: e.message });
  }
});

router.put('/user/:telegramId', async (req, res) => {
  try {
    const { language, currency, notifications, passcodeEnabled } = req.body;
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
        language || 'en',
        currency || 'USD',
        notifications !== undefined ? (notifications ? 1 : 0) : 1,
        passcodeEnabled !== undefined ? (passcodeEnabled ? 1 : 0) : 0,
      ]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
