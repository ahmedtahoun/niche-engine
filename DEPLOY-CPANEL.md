# Deploying on cPanel with GitHub

```
You push to main ──▶ GitHub Actions: tests → build → `deploy` branch
                                                        │
cPanel "Git Version Control" pulls `deploy` ◀───────────┘
        └─▶ .cpanel.yml copies it to the app folder and restarts the Node app
```

The hosting server never builds anything. If a test fails on GitHub, nothing new reaches cPanel.

---

## 0. Ask your host first (important)

The app keeps its working data in memory and writes every change to Supabase, so it must run as **one process that stays up**. cPanel runs Node apps with Passenger, which may start several processes or stop the app when idle. Send your host support this message:

> For my Node.js application at `/home/CPANEL_USER/niche-engine-app`, please limit Passenger to **one process** (max instances = 1) and **keep it running when idle** (min instances = 1 / no idle shutdown). Also confirm Node.js **20 or 22** is available in "Setup Node.js App" and that my account has about **512 MB of RAM** for it.

If they can't guarantee one process, use a container host instead (see `DEPLOY.md`); the code is the same.

## 1. Supabase

Same as `DEPLOY.md` step 1: create the project (Frankfurt), run `supabase/migrations/0001_init.sql`, copy the URL and service-role key.

## 2. Edit `.cpanel.yml` once

In `deploy/cpanel/.cpanel.yml` on `main`, replace `CPANEL_USER` with your cPanel username. Commit and push. GitHub rebuilds the `deploy` branch with it.

## 3. Connect cPanel to GitHub

The repository is public, so cPanel can clone it over HTTPS with no SSH key.

1. cPanel → **Git Version Control → Create**:
   - Clone a Repository: **on**
   - Clone URL: `https://github.com/ahmedtahoun/niche-engine.git`
   - Repository path: `/home/CPANEL_USER/repositories/niche-engine`
   - Repository name: `niche-engine`
2. After it clones, open **Manage → Basic Information** and set the **Checked-Out Branch** to `deploy`.

Never put keys or passwords in the repository: it is public. They live only in the Node app's environment variables in cPanel.

(If you make the repository private again, cPanel needs an SSH deploy key: cPanel → SSH Access → generate a key, add its public part in GitHub → Settings → Deploy keys with write access off, and clone with `git@github.com:ahmedtahoun/niche-engine.git`.)

## 4. Create the Node.js app

cPanel → **Setup Node.js App → Create Application**:

| Field | Value |
|---|---|
| Node.js version | 22 (or 20) |
| Application mode | Production |
| Application root | `niche-engine-app` |
| Application URL | `sakinaeg.com` (add `www.sakinaeg.com` as an alias) |
| Application startup file | `apps/web/server.js` |

Then add the **Environment variables** from `DEPLOY.md` step 2 (`SESSION_SECRET`, `ADMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NICHE_DOMAINS`, Telegram and Bosta keys). Save.

Do not press "Run NPM Install": the `deploy` branch already contains everything the server needs.

## 5. First deploy

cPanel → **Git Version Control → Manage → Pull or Deploy**:
1. **Update from Remote** (pulls the latest `deploy` build)
2. **Deploy HEAD Commit** (runs `.cpanel.yml`: copies files, restarts the app)

Open `https://sakinaeg.com/api/health`. It should answer `"ok":true` and `"database":"supabase"`.

If the app does not start, open **Setup Node.js App** and read the log: a missing setting is listed there by name.

## 6. More domains for more niches

Every niche must run in **the same Node app** (one process). Add other niche domains as **Aliases** of the main domain (cPanel → **Domains → Create a New Domain**, sharing the main domain's document root), not as separate Node apps. The app reads the domain name and shows the right niche. List every domain in `NICHE_DOMAINS`, e.g. `sakinaeg.com=umrah,www.sakinaeg.com=umrah`.

## 7. Every update after that

1. Push to `main` (or merge a pull request).
2. Wait for the green check in GitHub → **Actions**.
3. cPanel → Git Version Control → **Update from Remote**, then **Deploy HEAD Commit**.

To roll back: in cPanel, deploy an older commit of the `deploy` branch (each one names the `main` commit it was built from).

## 8. Webhooks

Telegram and Bosta as in `DEPLOY.md` step 5, using your main domain.
