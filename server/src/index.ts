import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { pool } from './db/pool.js';
import { ensureSchema } from './db/ensureSchema.js';
import { generalLimiter, authLimiter, walletLimiter, taskLimiter } from './middleware/rateLimit.js';
import { optionalTelegramAuth } from './middleware/telegramAuth.js';

import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import adminRoutes from './routes/admin.js';
import taskRoutes from './routes/tasks.js';
import settingsRoutes from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const isProd = process.env.NODE_ENV === 'production';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Telegram-Init-Data',
      'X-Telegram-Id',
    ],
  })
);
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

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[ERROR]', err?.message || err);
    if (err?.stack && !isProd) console.error(err.stack);
    const status = err.status || err.statusCode || 500;
    const message =
      status === 500 && isProd
        ? 'Internal server error'
        : err.message || 'Internal server error';
    res.status(status).json({
      error: message,
      ...(err.code ? { code: err.code } : {}),
    });
  }
);

process.on('SIGTERM', async () => {
  console.log('SIGTERM — closing pool');
  try {
    await pool.end();
  } catch {}
  process.exit(0);
});

async function boot() {
  for (let i = 0; i < 10; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('[DB] Connected');
      break;
    } catch (e: any) {
      console.warn(`[DB] connect attempt ${i + 1}/10:`, e.message);
      if (i === 9) {
        console.error('[DB] Could not connect after 10 attempts — still starting (health will fail until DB is up)');
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  try {
    await ensureSchema();
  } catch (e: any) {
    console.error('[DB] ensureSchema failed:', e.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UUSD Network API on :${PORT} (${isProd ? 'prod' : 'dev'})`);
    if (!process.env.BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN) {
      console.warn('[INFO] BOT_TOKEN not set — Telegram HMAC verification off (ok for first deploy)');
    }
    if (!process.env.JWT_SECRET) {
      console.warn('[INFO] JWT_SECRET not set — using MySQL password-derived secret');
    }
    if (!process.env.WALLET_ENCRYPTION_KEY) {
      console.warn('[INFO] WALLET_ENCRYPTION_KEY not set — using MySQL password-derived key');
    }
  });
}

boot().catch((e) => {
  console.error('Boot failed:', e);
  process.exit(1);
});
