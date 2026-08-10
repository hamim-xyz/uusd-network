import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import { generateId } from '../utils/crypto.js';
import { requireTelegramUser, rejectIfBlocked, TelegramRequest } from '../middleware/telegramAuth.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rows: any[] = await query(
      `SELECT id, title, description, points, reward_amount as rewardAmount,
              reward_symbol as rewardSymbol, type, link, platform, is_active as isActive, sort_order as sortOrder
       FROM tasks WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC`
    );
    res.json({ tasks: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/completed/:telegramId', async (req, res) => {
  try {
    const rows: any[] = await query(
      'SELECT task_id as taskId, completed_at as completedAt, claimed FROM completed_tasks WHERE telegram_id = ?',
      [req.params.telegramId]
    );
    res.json({ completed: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/complete', requireTelegramUser, rejectIfBlocked, async (req: TelegramRequest, res) => {
  try {
    const telegramId = req.telegramId || req.body.telegramId;
    const { taskId } = req.body;
    if (!telegramId || !taskId) return res.status(400).json({ error: 'telegramId and taskId required' });

    const existing: any[] = await query(
      'SELECT id, claimed FROM completed_tasks WHERE telegram_id = ? AND task_id = ?',
      [telegramId, taskId]
    );
    if (existing.length && existing[0].claimed) {
      return res.status(400).json({ error: 'Already claimed' });
    }

    const tasks: any[] = await query('SELECT * FROM tasks WHERE id = ? AND is_active = 1', [taskId]);
    if (!tasks.length) return res.status(404).json({ error: 'Task not found' });

    const task = tasks[0];
    const reward = Number(task.reward_amount || 0);
    const symbol = task.reward_symbol || 'UUSD';

    if (existing.length) {
      await query('UPDATE completed_tasks SET claimed = 1 WHERE id = ?', [existing[0].id]);
    } else {
      await query(
        'INSERT INTO completed_tasks (telegram_id, task_id, claimed) VALUES (?, ?, 1)',
        [telegramId, taskId]
      );
    }

    if (reward > 0) {
      const wallets: any[] = await query('SELECT balances FROM wallets WHERE telegram_id = ?', [telegramId]);
      if (wallets.length) {
        let balances: Record<string, number> = {};
        try {
          balances = typeof wallets[0].balances === 'string' ? JSON.parse(wallets[0].balances) : (wallets[0].balances || {});
        } catch {}
        balances[symbol] = Number(balances[symbol] || 0) + reward;
        await query('UPDATE wallets SET balances = ? WHERE telegram_id = ?', [JSON.stringify(balances), telegramId]);

        const actId = generateId('reward_');
        await query(
          `INSERT INTO activities (id, telegram_id, type, amount, symbol, status, note)
           VALUES (?, ?, 'reward', ?, ?, 'completed', ?)`,
          [actId, telegramId, reward, symbol, `Task reward: ${task.title}`]
        );
      }
    }

    res.json({ success: true, reward, symbol });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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
        id, t.title, t.description || null, t.points || 0,
        t.rewardAmount || t.reward_amount || 0, t.rewardSymbol || t.reward_symbol || 'UUSD',
        t.type || 'social', t.link || null, t.platform || null,
        t.isActive !== false ? 1 : 0, t.sortOrder || 0,
      ]
    );
    res.json({ success: true, id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
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
        id, e.title, e.description || null, e.rewardAmount || 0, e.rewardSymbol || 'UUSD',
        e.startsAt || null, e.endsAt || null, e.isActive !== false ? 1 : 0, e.status || 'active',
      ]
    );
    res.json({ success: true, id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/events/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
