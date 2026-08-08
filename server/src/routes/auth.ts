import { Router } from 'express';
import { query } from '../db/pool.js';
import { verifyPassword } from '../utils/crypto.js';
import { signAdminToken } from '../middleware/auth.js';

const router = Router();

/** POST /api/auth/admin/login */
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const rows: any[] = await query(
      'SELECT id, username, password_hash FROM admins WHERE username = ? LIMIT 1',
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const ok = await verifyPassword(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAdminToken(admin.id, admin.username);
    res.json({ token, username: admin.username });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
