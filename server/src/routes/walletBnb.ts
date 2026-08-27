import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireTelegramUser, rejectIfBlocked, TelegramRequest } from '../middleware/telegramAuth.js';
import { hashPin, makeSalt, verifyPin, generateId, roundAmount } from '../utils/crypto.js';

const router = Router();

function safeError(e: any, res: any) {
  console.error('[bnb]', e?.message || e);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({ error: isProd ? 'Internal server error' : e?.message || 'Error' });
}

function assertOwn(req: TelegramRequest, paramId: string) {
  return !!req.telegramId && req.telegramId === String(paramId);
}

router.get(
  '/bnb/balance/:telegramId',
  requireTelegramUser,
  async (req: TelegramRequest, res) => {
    try {
      if (!assertOwn(req, req.params.telegramId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const { getBnbBalance, explorerAddressUrl } = await import('../utils/bsc.js');
      const rows: any[] = await query(
        'SELECT address, balances, encrypted_private_key FROM wallets WHERE telegram_id = ? LIMIT 1',
        [req.params.telegramId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Wallet not found' });

      const address = rows[0].address;
      const onChain = await getBnbBalance(address);
      const onChainNum = roundAmount(Number(onChain), 12);

      let balances =
        typeof rows[0].balances === 'string' ? JSON.parse(rows[0].balances) : rows[0].balances || {};
      const prev = Number(balances.BNB || 0);

      if (onChainNum > prev + 1e-12) {
        const deposited = roundAmount(onChainNum - prev, 12);
        balances.BNB = onChainNum;
        await query('UPDATE wallets SET balances = ? WHERE telegram_id = ?', [
          JSON.stringify(balances),
          req.params.telegramId,
        ]);
        const id = generateId('dep_');
        await query(
          `INSERT INTO onchain_transactions (id, telegram_id, direction, to_address, amount, symbol, status, note)
           VALUES (?, ?, 'deposit', ?, ?, 'BNB', 'confirmed', 'Synced from BSC')`,
          [id, req.params.telegramId, address, deposited]
        );
        await query(
          `INSERT INTO activities (id, telegram_id, type, amount, symbol, status, to_address, note, created_at)
           VALUES (?, ?, 'deposit', ?, 'BNB', 'completed', ?, ?, NOW())`,
          [id, req.params.telegramId, deposited, address, 'BNB deposit (BSC)']
        );
      } else {
        balances.BNB = onChainNum;
        await query('UPDATE wallets SET balances = ? WHERE telegram_id = ?', [
          JSON.stringify(balances),
          req.params.telegramId,
        ]);
      }

      res.json({
        address,
        bnb: onChainNum,
        explorer: explorerAddressUrl(address),
        network: 'BSC',
      });
    } catch (e: any) {
      safeError(e, res);
    }
  }
);

router.get('/bnb/estimate-fee', async (req, res) => {
  try {
    const { estimateBnbTransferFee } = await import('../utils/bsc.js');
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    const amount = String(req.query.amount || '0');
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    const fee = await estimateBnbTransferFee(from, to, amount);
    res.json({ ...fee, symbol: 'BNB', network: 'BSC' });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.post(
  '/bnb/withdraw',
  requireTelegramUser,
  rejectIfBlocked,
  async (req: TelegramRequest, res) => {
    try {
      const telegramId = req.telegramId!;
      const { toAddress, amount, pin } = req.body;
      if (!toAddress || amount === undefined) {
        return res.status(400).json({ error: 'toAddress, amount required' });
      }
      const amt = Number(amount);
      if (!(amt > 0)) return res.status(400).json({ error: 'Invalid amount' });

      // H2: PIN mandatory
      const sec: any[] = await query(
        'SELECT pin_hash, salt FROM user_security WHERE telegram_id = ?',
        [telegramId]
      );
      if (!sec.length) {
        return res.status(403).json({ error: 'Set a PIN before making withdrawals' });
      }
      if (!pin) return res.status(400).json({ error: 'PIN required' });
      const pinResult = await verifyPin(String(pin), sec[0].pin_hash, sec[0].salt);
      if (!pinResult.valid) {
        return res.status(401).json({ error: 'Wrong PIN' });
      }
      if (pinResult.needsRehash) {
        const newHash = await hashPin(String(pin));
        await query('UPDATE user_security SET pin_hash = ?, salt = ? WHERE telegram_id = ?', [
          newHash,
          makeSalt(),
          telegramId,
        ]);
      }

      const wallets: any[] = await query(
        'SELECT address, balances, encrypted_private_key, blocked FROM wallets WHERE telegram_id = ?',
        [telegramId]
      );
      if (!wallets.length) return res.status(404).json({ error: 'Wallet not found' });
      const w = wallets[0];
      if (w.blocked) return res.status(403).json({ error: 'Wallet blocked' });
      if (!w.encrypted_private_key) return res.status(400).json({ error: 'No on-chain key' });

      const { sendBnb, explorerTxUrl, getBnbBalance } = await import('../utils/bsc.js');

      const onChain = Number(await getBnbBalance(w.address));
      if (onChain < amt) {
        return res.status(400).json({ error: `Insufficient on-chain BNB (${onChain})` });
      }

      const result = await sendBnb({
        encryptedPrivateKey: w.encrypted_private_key,
        to: toAddress,
        amountBnb: String(amt),
      });

      const newBal = roundAmount(Number(await getBnbBalance(w.address)), 12);
      let balances = typeof w.balances === 'string' ? JSON.parse(w.balances) : w.balances || {};
      balances.BNB = newBal;
      await query('UPDATE wallets SET balances = ? WHERE telegram_id = ?', [
        JSON.stringify(balances),
        telegramId,
      ]);

      const id = generateId('wd_');
      await query(
        `INSERT INTO onchain_transactions (id, telegram_id, direction, tx_hash, from_address, to_address, amount, symbol, status, gas_fee, note)
         VALUES (?, ?, 'withdraw', ?, ?, ?, ?, 'BNB', 'confirmed', ?, 'BSC native withdraw')`,
        [id, telegramId, result.txHash, w.address, toAddress, amt, result.feeBnb]
      );
      await query(
        `INSERT INTO activities (id, telegram_id, type, amount, symbol, status, to_address, from_address, note, created_at)
         VALUES (?, ?, 'withdraw', ?, 'BNB', 'completed', ?, ?, ?, NOW())`,
        [id, telegramId, amt, toAddress, w.address, `tx:${result.txHash}`]
      );

      res.json({
        success: true,
        txHash: result.txHash,
        explorerUrl: explorerTxUrl(result.txHash),
        feeBnb: result.feeBnb,
        amount: amt,
        symbol: 'BNB',
        network: 'BSC',
        newBalance: newBal,
      });
    } catch (e: any) {
      safeError(e, res);
    }
  }
);

router.get(
  '/onchain/history/:telegramId',
  requireTelegramUser,
  async (req: TelegramRequest, res) => {
    try {
      if (!assertOwn(req, req.params.telegramId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const { explorerTxUrl } = await import('../utils/bsc.js');
      const rows: any[] = await query(
        `SELECT id, direction, tx_hash as txHash, from_address as fromAddress, to_address as toAddress,
                amount, symbol, status, gas_fee as gasFee, note, created_at as createdAt
         FROM onchain_transactions WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 100`,
        [req.params.telegramId]
      );
      res.json({
        transactions: rows.map((r) => ({
          ...r,
          explorerUrl: r.txHash ? explorerTxUrl(r.txHash) : null,
        })),
      });
    } catch (e: any) {
      safeError(e, res);
    }
  }
);

export default router;
