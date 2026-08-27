import { Router } from 'express';
import { getConnection, query } from '../db/pool.js';
import { generateId, hashPin, makeSalt, verifyPin, roundAmount } from '../utils/crypto.js';
import { generateBscWallet } from '../utils/walletCrypto.js';
import { requireTelegramUser, rejectIfBlocked, TelegramRequest } from '../middleware/telegramAuth.js';

const router = Router();

function safeError(e: any, res: any) {
  console.error('[wallet]', e?.message || e);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({ error: isProd ? 'Internal server error' : e?.message || 'Error' });
}

function assertOwnTelegramId(req: TelegramRequest, paramId: string): boolean {
  return !!req.telegramId && req.telegramId === String(paramId);
}

// --- Specific routes FIRST (before /:telegramId) ---

router.get('/pin/has/:telegramId', requireTelegramUser, async (req: TelegramRequest, res) => {
  try {
    if (!assertOwnTelegramId(req, req.params.telegramId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rows: any[] = await query(
      'SELECT telegram_id FROM user_security WHERE telegram_id = ? LIMIT 1',
      [req.params.telegramId]
    );
    res.json({ hasPin: rows.length > 0 });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.post('/pin/set', requireTelegramUser, async (req: TelegramRequest, res) => {
  try {
    const telegramId = req.telegramId!;
    const { pin } = req.body;
    if (!pin || String(pin).length < 4 || String(pin).length > 8) {
      return res.status(400).json({ error: 'PIN must be 4-8 digits' });
    }
    const salt = makeSalt();
    const pinHash = await hashPin(String(pin));
    await query(
      `INSERT INTO user_security (telegram_id, pin_hash, salt) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE pin_hash = VALUES(pin_hash), salt = VALUES(salt)`,
      [telegramId, pinHash, salt]
    );
    res.json({ success: true });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.post('/pin/verify', requireTelegramUser, async (req: TelegramRequest, res) => {
  try {
    const telegramId = req.telegramId!;
    const { pin } = req.body;
    const rows: any[] = await query(
      'SELECT pin_hash, salt FROM user_security WHERE telegram_id = ? LIMIT 1',
      [telegramId]
    );
    if (!rows.length) return res.json({ hasPin: false, valid: false });
    const result = await verifyPin(String(pin), rows[0].pin_hash, rows[0].salt);
    if (result.valid && result.needsRehash) {
      const newHash = await hashPin(String(pin));
      await query('UPDATE user_security SET pin_hash = ?, salt = ? WHERE telegram_id = ?', [
        newHash,
        makeSalt(),
        telegramId,
      ]);
    }
    res.json({ hasPin: true, valid: result.valid });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.get('/referrals/:telegramId', requireTelegramUser, async (req: TelegramRequest, res) => {
  try {
    if (!assertOwnTelegramId(req, req.params.telegramId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rows: any[] = await query(
      `SELECT r.id, r.referred_telegram_id as referredTelegramId, r.created_at as createdAt, r.reward_given as rewardGiven,
              u.first_name as firstName, u.username
       FROM referrals r LEFT JOIN users u ON u.telegram_id = r.referred_telegram_id
       WHERE r.referrer_telegram_id = ? ORDER BY r.created_at DESC`,
      [req.params.telegramId]
    );
    res.json({ referrals: rows });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.post('/referrals/bind', requireTelegramUser, async (req: TelegramRequest, res) => {
  try {
    // referredTelegramId MUST come from authenticated session — never from body alone
    const referredTelegramId = req.telegramId!;
    const { referrerTelegramId } = req.body;
    if (!referrerTelegramId) {
      return res.status(400).json({ error: 'referrerTelegramId required' });
    }
    if (String(referrerTelegramId) === referredTelegramId) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }
    // referred user must exist in users table
    const users: any[] = await query('SELECT telegram_id FROM users WHERE telegram_id = ? LIMIT 1', [
      referredTelegramId,
    ]);
    if (!users.length) {
      return res.status(400).json({ error: 'Create wallet first before binding referral' });
    }
    const referrerExists: any[] = await query(
      'SELECT telegram_id FROM users WHERE telegram_id = ? LIMIT 1',
      [referrerTelegramId]
    );
    if (!referrerExists.length) {
      return res.status(400).json({ error: 'Invalid referrer' });
    }
    const existing: any[] = await query(
      'SELECT id FROM referrals WHERE referred_telegram_id = ? LIMIT 1',
      [referredTelegramId]
    );
    if (existing.length) return res.json({ success: true, alreadyBound: true });

    // Daily cap per referrer (anti-farming)
    const todayCount: any[] = await query(
      `SELECT COUNT(*) as c FROM referrals
       WHERE referrer_telegram_id = ? AND created_at >= CURDATE()`,
      [referrerTelegramId]
    );
    if (Number(todayCount[0]?.c || 0) >= 50) {
      return res.status(429).json({ error: 'Referrer daily limit reached' });
    }

    const id = generateId('ref_');
    await query(
      'INSERT INTO referrals (id, referrer_telegram_id, referred_telegram_id, reward_given) VALUES (?, ?, ?, 0)',
      [id, referrerTelegramId, referredTelegramId]
    );
    res.json({ success: true, id });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.get('/find-by-address/:address', async (req, res) => {
  try {
    const rows: any[] = await query(
      'SELECT telegram_id as telegramId, address, first_name as firstName, username, photo_url as photoUrl FROM users WHERE address = ? LIMIT 1',
      [req.params.address]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.post('/create', requireTelegramUser, rejectIfBlocked, async (req: TelegramRequest, res) => {
  const conn = await getConnection();
  try {
    const telegramId = req.telegramId!;
    const { firstName, username, photoUrl } = req.body;
    await conn.beginTransaction();
    const [existing]: any = await conn.execute(
      'SELECT telegram_id FROM wallets WHERE telegram_id = ? LIMIT 1',
      [telegramId]
    );
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ error: 'Wallet already exists' });
    }
    const { address, encryptedPrivateKey } = generateBscWallet();
    await conn.execute(
      `INSERT INTO users (telegram_id, address, first_name, username, photo_url) VALUES (?, ?, ?, ?, ?)`,
      [telegramId, address, firstName || null, username || null, photoUrl || null]
    );
    await conn.execute(
      `INSERT INTO wallets (telegram_id, address, available_balance, locked_balance, balances, encrypted_private_key, deposit_enabled)
       VALUES (?, ?, 0, 0, JSON_OBJECT('UUSD', 0, 'BNB', 0), ?, 1)`,
      [telegramId, address, encryptedPrivateKey]
    );
    await conn.execute(`INSERT INTO user_settings (telegram_id) VALUES (?)`, [telegramId]);
    await conn.commit();
    res.json({
      wallet: {
        telegramId,
        address,
        availableBalance: 0,
        lockedBalance: 0,
        balances: { UUSD: 0, BNB: 0 },
        depositEnabled: true,
        blocked: false,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    await conn.rollback();
    safeError(e, res);
  } finally {
    conn.release();
  }
});

router.post('/transfer', requireTelegramUser, rejectIfBlocked, async (req: TelegramRequest, res) => {
  const conn = await getConnection();
  try {
    const senderTelegramId = req.telegramId!;
    const { recipientAddress, amount, symbol = 'UUSD', pin } = req.body;
    if (!recipientAddress || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid transfer data' });
    }
    const amt = roundAmount(Number(amount));

    // H2: PIN is mandatory for transfers
    const [secRows]: any = await conn.execute(
      'SELECT pin_hash, salt FROM user_security WHERE telegram_id = ? LIMIT 1',
      [senderTelegramId]
    );
    if (!secRows.length) {
      return res.status(403).json({ error: 'Set a PIN before making transfers' });
    }
    if (!pin) return res.status(400).json({ error: 'PIN required' });
    const pinResult = await verifyPin(String(pin), secRows[0].pin_hash, secRows[0].salt);
    if (!pinResult.valid) {
      return res.status(403).json({ error: 'Wrong PIN' });
    }
    if (pinResult.needsRehash) {
      const newHash = await hashPin(String(pin));
      await conn.execute('UPDATE user_security SET pin_hash = ?, salt = ? WHERE telegram_id = ?', [
        newHash,
        makeSalt(),
        senderTelegramId,
      ]);
    }

    await conn.beginTransaction();
    const [recipients]: any = await conn.execute(
      'SELECT telegram_id, address, first_name, username FROM users WHERE address = ? LIMIT 1',
      [recipientAddress]
    );
    if (!recipients.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Recipient not found' });
    }
    const recipient = recipients[0];
    if (recipient.telegram_id === senderTelegramId) {
      await conn.rollback();
      return res.status(400).json({ error: 'Cannot send to yourself' });
    }
    const [senders]: any = await conn.execute(
      'SELECT * FROM wallets WHERE telegram_id = ? FOR UPDATE',
      [senderTelegramId]
    );
    if (!senders.length || senders[0].blocked) {
      await conn.rollback();
      return res
        .status(senders.length ? 403 : 404)
        .json({ error: senders.length ? 'Blocked' : 'Wallet not found' });
    }
    let senderBalances: any = {};
    try {
      senderBalances =
        typeof senders[0].balances === 'string'
          ? JSON.parse(senders[0].balances)
          : senders[0].balances || {};
    } catch {}
    if (Number(senderBalances[symbol] || 0) < amt) {
      await conn.rollback();
      return res.status(400).json({ error: 'Insufficient funds' });
    }
    const [recWallets]: any = await conn.execute(
      'SELECT * FROM wallets WHERE telegram_id = ? FOR UPDATE',
      [recipient.telegram_id]
    );
    if (!recWallets.length || recWallets[0].blocked) {
      await conn.rollback();
      return res.status(403).json({ error: 'Recipient unavailable' });
    }
    let recBalances: any = {};
    try {
      recBalances =
        typeof recWallets[0].balances === 'string'
          ? JSON.parse(recWallets[0].balances)
          : recWallets[0].balances || {};
    } catch {}
    senderBalances[symbol] = roundAmount(Number(senderBalances[symbol] || 0) - amt);
    recBalances[symbol] = roundAmount(Number(recBalances[symbol] || 0) + amt);
    await conn.execute('UPDATE wallets SET balances = ? WHERE telegram_id = ?', [
      JSON.stringify(senderBalances),
      senderTelegramId,
    ]);
    await conn.execute('UPDATE wallets SET balances = ? WHERE telegram_id = ?', [
      JSON.stringify(recBalances),
      recipient.telegram_id,
    ]);
    const outId = generateId('out_');
    const inId = generateId('in_');
    const [senderUser]: any = await conn.execute(
      'SELECT first_name, username, address FROM users WHERE telegram_id = ?',
      [senderTelegramId]
    );
    const sName = senderUser[0]?.first_name || 'User';
    const rName = recipient.first_name || 'User';
    await conn.execute(
      `INSERT INTO activities (id, telegram_id, type, amount, symbol, status, to_address, to_name, created_at)
       VALUES (?, ?, 'transfer_out', ?, ?, 'completed', ?, ?, NOW())`,
      [outId, senderTelegramId, amt, symbol, recipient.address, rName]
    );
    await conn.execute(
      `INSERT INTO activities (id, telegram_id, type, amount, symbol, status, from_address, from_name, created_at)
       VALUES (?, ?, 'transfer_in', ?, ?, 'completed', ?, ?, NOW())`,
      [inId, recipient.telegram_id, amt, symbol, senderUser[0]?.address || '', sName]
    );
    await conn.commit();
    res.json({ success: true, outId, inId });
  } catch (e: any) {
    await conn.rollback();
    safeError(e, res);
  } finally {
    conn.release();
  }
});

// Catch-all last — requires auth + ownership (C5)
router.get('/:telegramId', requireTelegramUser, async (req: TelegramRequest, res) => {
  try {
    const { telegramId } = req.params;
    if (!assertOwnTelegramId(req, telegramId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const wallets: any[] = await query('SELECT * FROM wallets WHERE telegram_id = ? LIMIT 1', [
      telegramId,
    ]);
    if (!wallets.length) return res.json({ wallet: null, activities: [], needsCreation: true });
    const wallet = wallets[0];
    let balances = {};
    try {
      balances =
        typeof wallet.balances === 'string' ? JSON.parse(wallet.balances) : wallet.balances || {};
    } catch {}
    const activities: any[] = await query(
      `SELECT id, type, amount, symbol, status, to_address as toAddress, to_name as toName,
              from_address as fromAddress, from_name as fromName, note, created_at as timestamp
       FROM activities WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 100`,
      [telegramId]
    );
    res.json({
      wallet: {
        telegramId: wallet.telegram_id,
        address: wallet.address,
        availableBalance: Number(wallet.available_balance),
        lockedBalance: Number(wallet.locked_balance),
        balances,
        depositEnabled: !!wallet.deposit_enabled,
        blocked: !!wallet.blocked,
        createdAt: wallet.created_at,
      },
      activities,
      needsCreation: false,
    });
  } catch (e: any) {
    safeError(e, res);
  }
});

export default router;
