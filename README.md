# UUSD Network

Telegram Mini App + Express API + MySQL (Railway)

**Stack:** React (Vite) client · Express/MySQL server · BNB Smart Chain (custodial BNB deposit/withdraw)

## Structure

```
client/   → Frontend (Telegram Mini App)
server/   → API (Express + MySQL + ethers BSC)
```

## Railway deploy (step-by-step)

### 1) Create project + MySQL
1. [Railway](https://railway.app) → New Project
2. **Add MySQL** plugin (keep it Active)
3. MySQL service automatically exposes these variables (you will Reference them):
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`

### 2) Backend (API)
1. New Service → **Deploy from GitHub** → select `uusd-network`
2. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Variables (Variables tab):

   **From MySQL (Variable Reference — click “Add Variable” → Reference):**
   | Variable | Source |
   |---|---|
   | `MYSQLHOST` | MySQL → `MYSQLHOST` |
   | `MYSQLPORT` | MySQL → `MYSQLPORT` |
   | `MYSQLUSER` | MySQL → `MYSQLUSER` |
   | `MYSQLPASSWORD` | MySQL → `MYSQLPASSWORD` |
   | `MYSQLDATABASE` | MySQL → `MYSQLDATABASE` |

   **Manual (required):**
   | Variable | Example |
   |---|---|
   | `JWT_SECRET` | long random string (32+ chars) |
   | `WALLET_ENCRYPTION_KEY` | another long random string |
   | `CORS_ORIGIN` | `https://YOUR-FRONTEND.up.railway.app` (set after frontend deploy) |

   **Optional:**
   | Variable | Example |
   |---|---|
   | `BOT_TOKEN` | Telegram bot token (needed for real Mini App auth) |
   | `BSC_RPC_URL` | `https://bsc-dataseed.binance.org/` |
   | `ADMIN_PASSWORD` | custom admin password (default: `uusdadmin2026`) |
   | `NODE_ENV` | `production` |

4. Deploy. Schema auto-runs on boot (`ensureSchema`). Health check: `GET /api/health`

### 3) Frontend (Telegram Mini App)
1. New Service → same repo
2. Settings:
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Start / Output:** static `dist` (or use Railway static / Vercel)
3. Variable:
   - `VITE_API_URL` = `https://YOUR-BACKEND.up.railway.app/api`
4. Deploy, then set Backend `CORS_ORIGIN` to the frontend public URL and redeploy backend once.

### 4) Telegram BotFather
1. Create bot → copy token → set `BOT_TOKEN` on backend
2. Menu Button / Web App URL = frontend public URL

## Security
- User private keys encrypted server-side; never sent to client
- Only admin JWT can reveal private keys
- Wallet bound to Telegram ID in MySQL (persistent)

## Admin
- Frontend path: `/admin`
- Default: `admin` / `uusdadmin2026` — **change after deploy** (set `ADMIN_PASSWORD` or change in DB)
