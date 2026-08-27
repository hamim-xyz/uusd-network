# UUSD Network

Telegram Mini App + Express API + MySQL (Railway)

**Stack:** React (Vite) client · Express/MySQL server · BNB Smart Chain (custodial BNB deposit/withdraw)

## Structure

```
client/   → Frontend (Telegram Mini App)
server/   → API (Express + MySQL + ethers BSC)
```

## Security (required before deploy)

Set these **REQUIRED** env vars on the backend service. The server will **refuse to start in production** without them:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Admin JWT signing (strong random string) |
| `WALLET_ENCRYPTION_KEY` | Encrypts custodial private keys at rest |
| `BOT_TOKEN` | Telegram bot token — HMAC verification of Mini App initData |
| `CORS_ORIGIN` | Frontend origin(s), comma-separated |
| `ADMIN_PASSWORD` | Seeds admin user on first boot (min 8 chars) |

Generate secrets example:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # WALLET_ENCRYPTION_KEY
```

**Never** use hardcoded defaults. Private keys are never returned by any API.

## Railway deploy (backend)

### 1) MySQL
New Project → **Add MySQL** (keep Active).

### 2) Backend service
Deploy from GitHub repo `uusd-network` (root is fine).

**MySQL reference vars:**

| Variable | From MySQL |
|---|---|
| `MYSQLHOST` | MYSQLHOST |
| `MYSQLPORT` | MYSQLPORT |
| `MYSQLUSER` | MYSQLUSER |
| `MYSQLPASSWORD` | MYSQLPASSWORD |
| `MYSQLDATABASE` | MYSQLDATABASE |

Plus the required secrets above.

Schema auto-creates on boot. Admin is seeded only when `ADMIN_PASSWORD` is set.

Health: `GET /api/health` → `{ ok: true, db: "connected" }`

### 3) Frontend (Vercel or Railway)
Root Directory: `client`  
`VITE_API_URL` = `https://YOUR-BACKEND.up.railway.app/api`

## Local development

```bash
# server
cd server && cp .env.example .env
# fill JWT_SECRET, WALLET_ENCRYPTION_KEY, ADMIN_PASSWORD
# for local without Telegram: ALLOW_INSECURE_DEV_AUTH=true ALLOW_WEAK_SECRETS=true
npm i && npm run dev

# client
cd client && npm i && npm run dev
```

Demo `?tg=` query param works **only** in Vite dev mode (`import.meta.env.DEV`).

## Admin
- Path: `/admin` on frontend
- Username: `admin`
- Password: whatever you set in `ADMIN_PASSWORD`

## Notes
- PIN is required for transfer and BNB withdraw
- PIN hashes use bcrypt (legacy SHA256 auto-migrates on successful verify)
- Telegram channel join tasks are verified via Bot API `getChatMember`
