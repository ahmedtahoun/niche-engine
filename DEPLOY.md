# Deploying niche-engine

One Docker image runs everything: every niche's storefront, the admin panel, and the Telegram and Bosta webhooks.

Supabase is the only source of truth: every request reads and writes it, and money changes are database transactions. The app can restart or run as several instances without losing or mixing data. Any Node/Docker host works (Railway, Render, Fly.io, a VPS, or cPanel: see `DEPLOY-CPANEL.md`).

---

## 1. Supabase (database)

1. Create a project. Pick the region closest to Egypt (Frankfurt, `eu-central-1`).
2. Open **SQL Editor** and run `supabase/migrations/0001_init.sql`, then `0002_database_first.sql`, then `0003_product_photos.sql` (each once, in order).
3. From **Project Settings → API Keys**, copy the **Project URL** and the **secret** key (`sb_secret_…` or legacy `service_role`). The service-role key is a server secret: it goes only into the host's environment, never into the browser or a chat.
4. Before real money flows, turn on daily backups (a paid Supabase plan).

## 2. Environment variables

Set these in the host's dashboard (not in a file in the repo).

| Variable | Required | What it is |
|---|---|---|
| `SESSION_SECRET` | Yes | Random 32+ characters. Signs customer logins. Generate: `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Yes | 12+ characters. Password for `/admin` |
| `SUPABASE_URL` | Yes | From step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | From step 1 |
| `NICHE_DOMAINS` | Yes | Which domain shows which niche, e.g. `sakinaeg.com=umrah,www.sakinaeg.com=umrah` |
| `TELEGRAM_BOT_TOKEN` | For sellers | From BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | With the token | Random string you choose |
| `BOSTA_API_KEY` | For shipping | From the Bosta business dashboard |
| `BOSTA_WEBHOOK_SECRET` | With the key | Random string you choose |
| `ALLOW_DEMO_DATA` | No | `1` only for a demo deployment without Supabase |

The server checks these at start. If a required one is missing it **exits and prints the list** in the deploy log, so a broken config never reaches customers.

## 3. Host (Railway example)

1. Install the Railway CLI and sign in.
2. In this folder: `railway init`, then `railway up`. Railway finds the `Dockerfile`, builds it, and runs it. The build runs every test and checks every niche file first; if one fails, nothing is deployed.
3. Add the variables from step 2 in the service's **Variables** tab, then redeploy.
4. Set the health check path to `/api/health`.
5. One replica is enough to start; more are safe.

Render, Fly.io or a VPS work the same way: build the `Dockerfile`, expose port `3000`, health check `/api/health`.

## 4. Domains

1. In the host, add each domain (e.g. `sakinaeg.com`, `www.sakinaeg.com`). The host gives you the DNS records.
2. Add those records at your domain registrar. HTTPS certificates are issued automatically.
3. Make sure every domain is listed in `NICHE_DOMAINS`.

## 5. Connect Telegram and Bosta

Telegram (once, after the domain works):

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://sakinaeg.com/api/telegram&secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

One bot serves all niches; any of your domains works as the webhook URL.

Bosta:
1. Dashboard → webhooks: URL `https://sakinaeg.com/api/bosta`, Authorization header = your `BOSTA_WEBHOOK_SECRET`.
2. For each seller, create a pickup location under your Bosta account and put its id in `sellers.bosta_location_id` (Supabase table editor).
3. Check every line marked `VERIFY` in `apps/web/src/lib/bosta.ts` against Bosta's API docs before the first real order.

## 6. Check it is live

- `https://sakinaeg.com/api/health` shows `"database":"supabase"`, `"telegram":true`, `"bosta":true`.
- The storefront has no orange "demo" bar (it only shows on demo data).
- `/admin` asks for the password.
- Place one real order to yourself: it appears in `/admin/orders`, the seller's Telegram gets it, accepting creates a Bosta waybill.

## 7. Updating and rolling back

- **Update:** `railway up` again (or push). Nothing is held in memory, so a restart loses nothing.
- **Roll back:** redeploy the previous deployment from the host's dashboard. The database is unaffected.
- **New niche:** add `niches/<id>.json`, pass `npm run check:niches`, add its domain to `NICHE_DOMAINS`, deploy.

## Launch checklist

- [ ] Supabase migrations 0001 and 0002 applied; backups on
- [ ] Free uptime monitor on `/api/health` (also keeps a free Supabase project from pausing)
- [ ] All required variables set; deploy log shows no `[env]` errors
- [ ] Domains live over HTTPS and listed in `NICHE_DOMAINS`
- [ ] Telegram webhook registered; a test seller receives `/start`
- [ ] Bosta `VERIFY` items checked; webhook set; each seller has a pickup location
- [ ] Real sellers approved in `/admin/sellers`, real products approved in `/admin/products`
- [ ] One end-to-end test order delivered and paid out
- [ ] Privacy policy, exchange policy and CR number on the site
