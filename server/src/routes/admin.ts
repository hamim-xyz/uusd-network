import { Router } from 'express';
import { decryptPrivateKey } from '../utils/walletCrypto.js';
import { query } from '../db/pool.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';
import { generateId } from '../utils/crypto.js';

const router = Router();
router.use(requireAdmin);

router.get('/dashboard', async (_req, res) => {
  try {
    const [usersCount]: any = await query('SELECT COUNT(*) as c FROM users');
    const [walletsCount]: any = await query('SELECT COUNT(*) as c FROM wallets');
    const [actsCount]: any = await query('SELECT COUNT(*) as c FROM activities');
    const [tasksCount]: any = await query('SELECT COUNT(*) as c FROM tasks WHERE is_active = 1');
    res.json({
      totalUsers: usersCount[0]?.c || 0,
      totalWallets: walletsCount[0]?.c || 0,
      totalActivities: actsCount[0]?.c || 0,
      activeTasks: tasksCount[0]?.c || 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const rows: any[] = await query(
      `SELECT u.telegram_id as telegramId, u.address, u.first_name as firstName,
              u.username, u.photo_url as photoUrl, u.joined_at as joinedAt, u.blocked,
              w.balances, w.available_balance as availableBalance
       FROM users u
       LEFT JOIN wallets w ON w.telegram_id = u.telegram_id
       ORDER BY u.joined_at DESC
       LIMIT ?`,
      [limit]
    );
    const users = rows.map((r) => {
      let balances = {};
      try {
        balances = typeof r.balances === 'string' ? JSON.parse(r.balances) : (r.balances || {});
      } catch {}
      return {
        ...r,
        balances,
        balance: Number((balances as any).UUSD || r.availableBalance || 0),
        blocked: !!r.blocked,
      };
    });
    res.json({ users });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/users/:telegramId/block', async (req, res) => {
  try {
    const blocked = req.body.blocked ? 1 : 0;
    await query('UPDATE users SET blocked = ? WHERE telegram_id = ?', [blocked, req.params.telegramId]);
    await query('UPDATE wallets SET blocked = ? WHERE telegram_id = ?', [blocked, req.params.telegramId]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/users/:telegramId/credit', async (req, res) => {
  try {
    const { amount, symbol = 'UUSD', note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const rows: any[] = await query('SELECT balances FROM wallets WHERE telegram_id = ?', [req.params.telegramId]);
    if (!rows.length) return res.status(404).json({ error: 'Wallet not found' });
    let balances: Record<string, number> = {};
    try {
      balances = typeof rows[0].balances === 'string' ? JSON.parse(rows[0].balances) : (rows[0].balances || {});
    } catch {}
    balances[symbol] = Number(balances[symbol] || 0) + Number(amount);
    await query('UPDATE wallets SET balances = ? WHERE telegram_id = ?', [
      JSON.stringify(balances),
      req.params.telegramId,
    ]);
    const id = generateId('earn_');
    await query(
      `INSERT INTO activities (id, telegram_id, type, amount, symbol, status, note)
       VALUES (?, ?, 'earn', ?, ?, 'completed', ?)`,
      [id, req.params.telegramId, amount, symbol, note || 'Admin credit']
    );
    res.json({ success: true, balances });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/activities', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const rows: any[] = await query(
      `SELECT id, telegram_id as telegramId, type, amount, symbol, status,
              to_address as toAddress, to_name as toName,
              from_address as fromAddress, from_name as fromName,
              note, created_at as timestamp
       FROM activities ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    res.json({ activities: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/settings/:key', async (req, res) => {
  try {
    const rows: any[] = await query('SELECT value FROM settings WHERE `key` = ?', [req.params.key]);
    if (!rows.length) return res.json({ value: null });
    const value = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
    res.json({ value });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/settings/:key', async (req, res) => {
  try {
    const { value } = req.body;
    await query(
      `INSERT INTO settings (\`key\`, value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [req.params.key, JSON.stringify(value)]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/users/:telegramId/private-key', async (req, res) => {
  try {
    const rows: any[] = await query(
      'SELECT address, encrypted_private_key FROM wallets WHERE telegram_id = ? LIMIT 1',
      [req.params.telegramId]
    );
    if (!rows.length || !rows[0].encrypted_private_key) {
      return res.status(404).json({ error: 'Wallet or private key not found' });
    }
    const privateKey = decryptPrivateKey(rows[0].encrypted_private_key);
    res.json({
      telegramId: req.params.telegramId,
      address: rows[0].address,
      privateKey,
      network: 'BSC (BNB Smart Chain)',
      warning: 'Keep this secret. Never share with users.',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
