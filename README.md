# UUSD Network

Telegram Mini App + Express API + MySQL (Railway)

**Stack:** React (Vite) client · Express/MySQL server · BNB Smart Chain (custodial BNB deposit/withdraw)

## Structure

```
client/   → Frontend (Telegram Mini App)
server/   → API (Express + MySQL + ethers BSC)
```

## Railway deploy

### 1) MySQL
Already created in Railway project. Keep it Active.

### 2) Backend
- New service from this GitHub repo
- **Root Directory:** `server`
- **Build:** `npm install && npm run build`
- **Start:** `npm start`
- Variables (Reference from MySQL):
  - MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
- Also set:
  - `JWT_SECRET` = long random string
  - `WALLET_ENCRYPTION_KEY` = long random string
  - `BOT_TOKEN` = Telegram bot token (optional for dev)
  - `CORS_ORIGIN` = your frontend URL
  - `BSC_RPC_URL` = `https://bsc-dataseed.binance.org/` (optional)
- After first deploy, run once: `npm run db:init`

### 3) Frontend
- New service, **Root Directory:** `client`
- **Build:** `npm install && npm run build`
- **Output:** `dist` (static)
- Variable: `VITE_API_URL` = `https://YOUR-BACKEND.up.railway.app/api`

## Security
- User private keys encrypted server-side; never sent to client
- Only admin JWT can reveal private keys
- Wallet bound to Telegram ID in MySQL (persistent)

## Admin
- URL: `/admin`
- Default: `admin` / `uusdadmin2026` — change after deploy
