import { Router } from 'express';
import { getConnection, query } from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import { generateId, roundAmount } from '../utils/crypto.js';
import { requireTelegramUser, rejectIfBlocked, TelegramRequest } from '../middleware/telegramAuth.js';

const router = Router();

function safeError(e: any, res: any) {
  console.error('[tasks]', e?.message || e);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({ error: isProd ? 'Internal server error' : e?.message || 'Error' });
}

/** Verify Telegram channel/group membership via Bot API */
async function verifyTelegramMembership(
  chatId: string,
  userId: string
): Promise<boolean> {
  const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  if (!botToken || !chatId) return false;
  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(userId)}`;
    const res = await fetch(url);
    const data: any = await res.json();
    if (!data.ok) return false;
    const status = data.result?.status;
    return ['creator', 'administrator', 'member', 'restricted'].includes(status);
  } catch {
    return false;
  }
}

router.get('/', async (_req, res) => {
  try {
    const rows: any[] = await query(
      `SELECT id, title, description, points, reward_amount as rewardAmount,
              reward_symbol as rewardSymbol, type, link, platform, is_active as isActive, sort_order as sortOrder
       FROM tasks WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC`
    );
    res.json({ tasks: rows });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.get(
  '/completed/:telegramId',
  requireTelegramUser,
  async (req: TelegramRequest, res) => {
    try {
      if (req.telegramId !== String(req.params.telegramId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const rows: any[] = await query(
        'SELECT task_id as taskId, completed_at as completedAt, claimed FROM completed_tasks WHERE telegram_id = ?',
        [req.params.telegramId]
      );
      res.json({ completed: rows });
    } catch (e: any) {
      safeError(e, res);
    }
  }
);

router.post('/complete', requireTelegramUser, rejectIfBlocked, async (req: TelegramRequest, res) => {
  const conn = await getConnection();
  try {
    const telegramId = req.telegramId!;
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: 'taskId required' });

    const tasks: any[] = await query('SELECT * FROM tasks WHERE id = ? AND is_active = 1', [taskId]);
    if (!tasks.length) return res.status(404).json({ error: 'Task not found' });
    const task = tasks[0];

    // H1: Server-side verification by task type
    const taskType = (task.type || 'social').toLowerCase();
    if (taskType === 'telegram' || taskType === 'channel' || taskType === 'join') {
      // link may be @channel or https://t.me/channel or chat id
      let chatId = task.link || '';
      if (chatId.includes('t.me/')) {
        chatId = '@' + chatId.split('t.me/').pop()!.replace(/\/+$/, '').split('?')[0];
      }
      if (chatId) {
        const member = await verifyTelegramMembership(chatId, telegramId);
        if (!member) {
          return res.status(400).json({
            error: 'Please join the channel/group first, then claim again.',
          });
        }
      }
    }
    // For social/external: no cryptographic proof available; anti-bot rate limit via middleware

    // Bot-like heuristic: >5 claims in 5 minutes
    const recent: any[] = await query(
      `SELECT COUNT(*) as c FROM completed_tasks
       WHERE telegram_id = ? AND completed_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
      [telegramId]
    );
    if (Number(recent[0]?.c || 0) >= 5) {
      return res.status(429).json({ error: 'Too many claims. Please wait a few minutes.' });
    }

    await conn.beginTransaction();

    const [existing]: any = await conn.execute(
      'SELECT id, claimed FROM completed_tasks WHERE telegram_id = ? AND task_id = ? FOR UPDATE',
      [telegramId, taskId]
    );
    if (existing.length && existing[0].claimed) {
      await conn.rollback();
      return res.status(400).json({ error: 'Already claimed' });
    }

    const reward = roundAmount(Number(task.reward_amount || 0));
    const symbol = task.reward_symbol || 'UUSD';

    try {
      if (existing.length) {
        await conn.execute('UPDATE completed_tasks SET claimed = 1 WHERE id = ?', [existing[0].id]);
      } else {
        await conn.execute(
          'INSERT INTO completed_tasks (telegram_id, task_id, claimed) VALUES (?, ?, 1)',
          [telegramId, taskId]
        );
      }
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY') {
        await conn.rollback();
        return res.status(400).json({ error: 'Already claimed' });
      }
      throw err;
    }

    if (reward > 0) {
      const [wallets]: any = await conn.execute(
        'SELECT balances FROM wallets WHERE telegram_id = ? FOR UPDATE',
        [telegramId]
      );
      if (wallets.length) {
        let balances: Record<string, number> = {};
        try {
          balances =
            typeof wallets[0].balances === 'string'
              ? JSON.parse(wallets[0].balances)
              : wallets[0].balances || {};
        } catch {}
        balances[symbol] = roundAmount(Number(balances[symbol] || 0) + reward);
        await conn.execute('UPDATE wallets SET balances = ? WHERE telegram_id = ?', [
          JSON.stringify(balances),
          telegramId,
        ]);

        const actId = generateId('reward_');
        await conn.execute(
          `INSERT INTO activities (id, telegram_id, type, amount, symbol, status, note)
           VALUES (?, ?, 'reward', ?, ?, 'completed', ?)`,
          [actId, telegramId, reward, symbol, `Task reward: ${task.title}`]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, reward, symbol });
  } catch (e: any) {
    await conn.rollback();
    safeError(e, res);
  } finally {
    conn.release();
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const t = req.body;
    const id = t.id || generateId('task_');
    await query(
      `INSERT INTO tasks (id, title, description, points, reward_amount, reward_symbol, type, link, platform, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title=VALUES(title), description=VALUES(description), points=VALUES(points),
         reward_amount=VALUES(reward_amount), reward_symbol=VALUES(reward_symbol),
         type=VALUES(type), link=VALUES(link), platform=VALUES(platform),
         is_active=VALUES(is_active), sort_order=VALUES(sort_order)`,
      [
        id,
        t.title,
        t.description || null,
        t.points || 0,
        t.rewardAmount || t.reward_amount || 0,
        t.rewardSymbol || t.reward_symbol || 'UUSD',
        t.type || 'social',
        t.link || null,
        t.platform || null,
        t.isActive !== false ? 1 : 0,
        t.sortOrder || 0,
      ]
    );
    res.json({ success: true, id });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.get('/events/list', async (_req, res) => {
  try {
    const rows: any[] = await query(
      `SELECT id, title, description, reward_amount as rewardAmount, reward_symbol as rewardSymbol,
              starts_at as startsAt, ends_at as endsAt, is_active as isActive, status
       FROM events ORDER BY created_at DESC`
    );
    res.json({ events: rows });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.post('/events', requireAdmin, async (req, res) => {
  try {
    const e = req.body;
    const id = e.id || generateId('event_');
    await query(
      `INSERT INTO events (id, title, description, reward_amount, reward_symbol, starts_at, ends_at, is_active, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title=VALUES(title), description=VALUES(description), reward_amount=VALUES(reward_amount),
         reward_symbol=VALUES(reward_symbol), starts_at=VALUES(starts_at), ends_at=VALUES(ends_at),
         is_active=VALUES(is_active), status=VALUES(status)`,
      [
        id,
        e.title,
        e.description || null,
        e.rewardAmount || 0,
        e.rewardSymbol || 'UUSD',
        e.startsAt || null,
        e.endsAt || null,
        e.isActive !== false ? 1 : 0,
        e.status || 'active',
      ]
    );
    res.json({ success: true, id });
  } catch (e: any) {
    safeError(e, res);
  }
});

router.delete('/events/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    safeError(e, res);
  }
});

export default router;
