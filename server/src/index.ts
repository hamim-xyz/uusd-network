import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pool } from './db/pool.js';
import { ensureSchema } from './db/ensureSchema.js';
import { generalLimiter, authLimiter, walletLimiter, taskLimiter } from './middleware/rateLimit.js';
import { optionalTelegramAuth } from './middleware/telegramAuth.js';

import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import adminRoutes from './routes/admin.js';
import taskRoutes from './routes/tasks.js';
import settingsRoutes from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3001);
const isProd = process.env.NODE_ENV === 'production';

/** Fail fast on missing required secrets in production */
function assertRequiredSecrets() {
  const missing: string[] = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.WALLET_ENCRYPTION_KEY) missing.push('WALLET_ENCRYPTION_KEY');
  if (isProd && !process.env.BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN) {
    missing.push('BOT_TOKEN');
  }
  if (missing.length) {
    console.error(
      `[FATAL] Missing required env vars: ${missing.join(', ')}. Set them before deploying.`
    );
    if (isProd || process.env.ALLOW_WEAK_SECRETS !== 'true') {
      process.exit(1);
    }
    console.warn('[WARN] Continuing with missing secrets (ALLOW_WEAK_SECRETS or non-prod)');
  }
}

assertRequiredSecrets();

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: false,
    // Telegram Mini App may embed in iframe
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      // Same-origin frontend is always fine; allow configured list
      if (!isProd && corsOrigins.length === 0) return cb(null, true);
      if (corsOrigins.length === 0) return cb(null, true);
      if (corsOrigins.includes(origin) || corsOrigins.includes('*')) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: false,
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
  } catch {
    res.status(503).json({ ok: false, db: 'disconnected', error: 'DB unavailable' });
  }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/wallet', walletLimiter, walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tasks', taskLimiter, taskRoutes);
app.use('/api/settings', settingsRoutes);

// --- Serve React Mini App (client/dist) from same domain ---
const clientDist = path.resolve(__dirname, '../../client/dist');
const indexHtml = path.join(clientDist, 'index.html');
const hasClient = fs.existsSync(indexHtml);

if (hasClient) {
  console.log('[STATIC] Serving Mini App from', clientDist);
  app.use(express.static(clientDist, { index: false, maxAge: isProd ? '1d' : 0 }));
  // SPA fallback — all non-API routes → index.html (React Router)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  });
} else {
  console.warn('[STATIC] client/dist not found — API only. Run: npm run build --prefix client');
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not found',
      hint: 'Frontend not built. Redeploy so client/dist is produced.',
    });
  });
}

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
      ...(err.code && !isProd ? { code: err.code } : {}),
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
        console.error(
          '[DB] Could not connect after 10 attempts — still starting (health will fail until DB is up)'
        );
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
    console.log(`UUSD Network on :${PORT} (${isProd ? 'prod' : 'dev'})`);
    console.log(`  Mini App:  http://0.0.0.0:${PORT}/`);
    console.log(`  Admin:     http://0.0.0.0:${PORT}/admin`);
    console.log(`  API:       http://0.0.0.0:${PORT}/api/health`);
  });
}

boot().catch((e) => {
  console.error('Boot failed:', e);
  process.exit(1);
});
