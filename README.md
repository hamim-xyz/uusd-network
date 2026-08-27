# UUSD Network

Telegram Mini App + Express API + MySQL (Railway)

**Stack:** React (Vite) client · Express/MySQL server · BNB Smart Chain (custodial BNB deposit/withdraw)

## Structure

```
client/   → Frontend (Telegram Mini App)
server/   → API (Express + MySQL + ethers BSC)
```

## Railway deploy (backend)

### 1) MySQL
New Project → **Add MySQL** (keep Active).

### 2) Backend service
Deploy from GitHub repo `uusd-network` (root is fine — no need to set Root Directory).

**Only required variables** (Reference from MySQL service):

| Variable | From MySQL |
|---|---|
| `MYSQLHOST` | MYSQLHOST |
| `MYSQLPORT` | MYSQLPORT |
| `MYSQLUSER` | MYSQLUSER |
| `MYSQLPASSWORD` | MYSQLPASSWORD |
| `MYSQLDATABASE` | MYSQLDATABASE |

JWT / wallet encryption keys are auto-derived from `MYSQLPASSWORD` if you do not set them.  
Schema auto-creates on boot. Admin defaults: `admin` / `uusdadmin2026` (change later).

Optional later:
- `BOT_TOKEN` — Telegram bot (for real Mini App auth)
- `CORS_ORIGIN` — frontend URL
- `JWT_SECRET` / `WALLET_ENCRYPTION_KEY` — custom secrets
- `BSC_RPC_URL` — default public BSC RPC

Health: `GET /api/health` → `{ ok: true, db: "connected" }`

### 3) Frontend (separate service or Vercel)
Root Directory: `client`  
`VITE_API_URL` = `https://YOUR-BACKEND.up.railway.app/api`

## Security
- Private keys encrypted server-side
- Only admin JWT can reveal private keys

## Admin
- Path: `/admin` on frontend
- Default: `admin` / `uusdadmin2026`
