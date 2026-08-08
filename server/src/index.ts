import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { pool } from './db/pool.js';
import { generalLimiter, authLimiter, walletLimiter, taskLimiter } from './middleware/rateLimit.js';
import { optionalTelegramAuth } from './middleware/telegramAuth.js';

import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import adminRoutes from './routes/admin.js';
import taskRoutes from './routes/tasks.js';
import settingsRoutes from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'X-Telegram-Id'],
}));
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

app.use('/api', generalLimiter);
app.use('/api', optionalTelegramAuth);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      ok: true,
      db: 'connected',
      time: new Date().toISOString(),
      env: isProd ? 'production' : 'development',
    });
  } catch (e: any) {
    res.status(503).json({ ok: false, db: 'disconnected', error: e.message });
  }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/wallet', walletLimiter, walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tasks', taskLimiter, taskRoutes);
app.use('/api/settings', settingsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err?.message || err);
  if (err?.stack && !isProd) console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  const message = status === 500 && isProd ? 'Internal server error' : err.message || 'Internal server error';
  res.status(status).json({ error: message, ...(err.code ? { code: err.code } : {}) });
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing pool...');
  await pool.end();
  process.exit(0);
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`UUSD Network API on :${PORT} (${isProd ? 'prod' : 'dev'})`);
  if (!process.env.BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('WARN: BOT_TOKEN not set — Telegram initData HMAC validation is OFF (dev mode)');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change-me')) {
    console.warn('WARN: Set a strong JWT_SECRET in production');
  }
});
