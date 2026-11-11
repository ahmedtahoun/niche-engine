# Deploying on cPanel with GitHub

```
You push to main ──▶ GitHub Actions: tests → build → `deploy` branch
                                                        │
cPanel "Git Version Control" pulls `deploy` ◀───────────┘
        └─▶ .cpanel.yml puts the build in niche-engine-app/current and restarts the Node app
```

The hosting server never builds anything. If a test fails on GitHub, nothing new reaches cPanel.

Setup used here: cPanel user `viorowzb`, domain `sakinaeg.com`, Node.js 20.

## How the app keeps data

Supabase is the only place data lives. Every request reads and writes it; nothing important is held in the server's memory. So the app can restart at any time, cPanel may stop it when idle or run several copies under load, and nothing is lost or mixed up. Money changes (an order with its wallet spend, cashback, refunds, payouts) are single database transactions with rules the database enforces.

## 1. Supabase (once)

1. Supabase → **SQL Editor** → run `supabase/migrations/0001_init.sql`, then `0002_database_first.sql`, then `0003_product_photos.sql` (in that order; each once). `/api/health` shows `"migrations":"ok"` when none is missing.
2. **Project Settings → API Keys**: copy the project URL and the **secret** key (`sb_secret_…` or the legacy `service_role`). The secret key goes only into cPanel (step 4), never into the code or a chat.

## 2. Connect cPanel to GitHub (once)

The repository is public, so cPanel clones it over HTTPS with no SSH key.

1. cPanel → **Git Version Control → Create**
   - Clone a Repository: **on**
   - Clone URL: `https://github.com/ahmedtahoun/niche-engine.git`
   - Repository path: `/home/viorowzb/repositories/niche-engine`
2. **Manage → Basic Information**: set **Checked-Out Branch** to **`deploy`** (not `main`: only `deploy` has the built site and `.cpanel.yml`).

Never put keys or passwords in the repository: it is public. They live only in the Node app's environment variables.

## 3. Domain (once)

1. At the registrar (Namecheap): `sakinaeg.com` → **Nameservers → Namecheap Web Hosting DNS**.
2. cPanel → **Domains**: `sakinaeg.com` added, **Share document root off**.
3. cPanel → **SSL/TLS Status** → tick `sakinaeg.com` and `www.sakinaeg.com` → **Run AutoSSL**.

## 4. Node.js app (once)

cPanel → **Setup Node.js App → Create Application** (or edit the existing one):

| Field | Value |
|---|---|
| Node.js version | 20 (or 22) |
| Application mode | Production |
| Application root | `niche-engine-app` |
| Application URL | `sakinaeg.com` |
| Application startup file | `current/apps/web/server.js` |

Environment variables (Add Variable for each):

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://ywfblcnpridlucljqtbz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret key from step 1 |
| `SESSION_SECRET` | a random string of 32+ characters |
| `ADMIN_PASSWORD` | 12+ characters, for `/admin` |
| `NICHE_DOMAINS` | `sakinaeg.com=umrah,www.sakinaeg.com=umrah` |

Telegram and Bosta keys come later (step 7). Save. Do **not** press "Run NPM Install": the build already contains everything.

## 5. Deploy

cPanel → **Git Version Control → Manage → Pull or Deploy**:
1. **Update from Remote** (pulls the latest `deploy` build)
2. **Deploy HEAD Commit** (copies it into `niche-engine-app/current` and restarts the app)

Open `https://sakinaeg.com/api/health`. It should answer `"ok":true`, `"database":"supabase"` and a `"revision"` matching the latest commit on GitHub.

- **"It works! NodeJS …"**: cPanel's placeholder. The deploy hasn't run yet, or the startup file isn't `current/apps/web/server.js`.
- **"The system cannot deploy"**: the checked-out branch is still `main`, or files were added inside `repositories/niche-engine`. In cPanel → Terminal run `cd ~/repositories/niche-engine && git branch && git status --short` and send the output.
- **The app doesn't start**: Setup Node.js App → open the log (or `~/niche-engine-app/stderr.log`). A missing setting is listed by name.

## 6. Every update after that

1. Push to `main` (or merge a pull request).
2. Wait for the green check in GitHub → **Actions**.
3. cPanel → Git Version Control → **Update from Remote**, then **Deploy HEAD Commit**.

The previous build stays in `niche-engine-app/release-old`. To roll back quickly, in cPanel → Terminal:

```bash
cd ~/niche-engine-app && mv current release-bad && mv release-old current && touch tmp/restart.txt
```

## 7. Telegram and Bosta (after the site is live)

As in `DEPLOY.md` step 5, using `https://sakinaeg.com/api/telegram` and `https://sakinaeg.com/api/bosta`.

## 8. Keep an eye on it (free)

- **Uptime alert:** a free monitor (e.g. uptimerobot.com) on `https://sakinaeg.com/api/health` every 5 minutes, alerting your phone. It also keeps a free Supabase project active (free projects pause after 7 days without traffic).
- **Backups:** Supabase's free plan has no point-in-time restore. Upgrade to Pro once real orders flow, or export weekly until then.

## More niches later

Add each niche's domain to the same Node app (Domains → Create a New Domain, sharing the main domain's document root) and list it in `NICHE_DOMAINS`, e.g. `…,coffeedomain.com=coffee`.
