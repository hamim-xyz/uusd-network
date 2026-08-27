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

function assertRequiredSecrets() {
  const missing: string[] = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.WALLET_ENCRYPTION_KEY) missing.push('WALLET_ENCRYPTION_KEY');
  if (isProd && !process.env.BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN) {
    missing.push('BOT_TOKEN');
  }
  if (missing.length) {
    console.warn(
      `[WARN] Missing recommended env: ${missing.join(', ')}. ` +
        `Set them in Railway Variables. Continuing (set ALLOW_WEAK_SECRETS=false to hard-fail).`
    );
    // Only hard-exit if explicitly requested
    if (process.env.ALLOW_WEAK_SECRETS === 'false') {
      console.error('[FATAL] ALLOW_WEAK_SECRETS=false and secrets missing — exiting');
      process.exit(1);
    }
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
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
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
      static: fs.existsSync(path.join(__dirname, '../public/index.html')),
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

// Resolve static Mini App dir (server/public after build copy)
const candidates = [
  path.join(__dirname, '../public'), // server/public (preferred)
  path.resolve(__dirname, '../../client/dist'), // monorepo client/dist
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'client/dist'),
];

let staticDir: string | null = null;
for (const dir of candidates) {
  if (fs.existsSync(path.join(dir, 'index.html'))) {
    staticDir = dir;
    break;
  }
}

if (staticDir) {
  console.log('[STATIC] Mini App from', staticDir);
  app.use(express.static(staticDir, { index: false, maxAge: isProd ? '1h' : 0 }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(staticDir!, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
} else {
  console.warn('[STATIC] No index.html found. Searched:', candidates.join(' | '));
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(503).type('html').send(`<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0c0d12;color:#fff;padding:2rem">
      <h1>Frontend not built</h1>
      <p>API is up. Rebuild on Railway so <code>server/public/index.html</code> exists.</p>
      <p><a href="/api/health" style="color:#8792FF">/api/health</a></p>
    </body></html>`);
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
    res.status(status).json({ error: message });
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
        console.error('[DB] Could not connect after 10 attempts');
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
    console.log(`  Mini App → /`);
    console.log(`  Admin    → /admin`);
    console.log(`  Health   → /api/health`);
    console.log(`  Static   → ${staticDir || 'MISSING'}`);
  });
}

boot().catch((e) => {
  console.error('Boot failed:', e);
  process.exit(1);
});
