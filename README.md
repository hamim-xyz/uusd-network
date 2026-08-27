# UUSD Network

Telegram Mini App + Express API + MySQL — **one Railway URL** serves both UI and API.

**Stack:** React (Vite) · Express/MySQL · BNB Smart Chain (custodial deposit/withdraw)

## Links (after deploy)

| What | URL |
|------|-----|
| **Mini App (main)** | `https://YOUR-APP.up.railway.app/` |
| **Admin panel** | `https://YOUR-APP.up.railway.app/admin` |
| **API health** | `https://YOUR-APP.up.railway.app/api/health` |

Example for this project:

- Mini App: https://uusd-network-production.up.railway.app/
- Admin: https://uusd-network-production.up.railway.app/admin
- Health: https://uusd-network-production.up.railway.app/api/health

In **BotFather**, set the Web App / Menu Button URL to the **Mini App** link (root `/`), not `/api`.

## Structure

```
client/   → Frontend (built into client/dist, served by Express)
server/   → API + static file host
```

## Required env (Railway)

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Admin JWT (strong random) |
| `WALLET_ENCRYPTION_KEY` | Encrypt custodial keys |
| `BOT_TOKEN` | Telegram bot token |
| `ADMIN_PASSWORD` | Seeds admin on boot (min 8 chars) |
| MySQL vars | `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` |

Optional: `CORS_ORIGIN` (same-origin works without it), `BSC_RPC_URL`.

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # WALLET_ENCRYPTION_KEY
```

## Deploy

Railway builds **client + server** automatically (`nixpacks` / `railway.toml`).  
After redeploy, open `/` — you should see the Mini App UI, not JSON.

Admin login: username `admin`, password = `ADMIN_PASSWORD` env value.

## Security notes

- No private keys in any API response
- PIN required for transfer / BNB withdraw
- Telegram initData HMAC verified when `BOT_TOKEN` is set
