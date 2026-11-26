# Deploying on Cloudflare (live since 2026-11-25)

cairoroast.com runs on **Cloudflare Workers** as the Worker `cairoroast`, built with the OpenNext adapter.
Supabase stays the only place data lives, exactly as before.

```
push to main ──▶ GitHub Actions: tests → niche check → Cloudflare build → wrangler deploy ──▶ cairoroast.com
other branches / pull requests ──▶ the same checks, without the deploy
```

If a test fails, nothing is deployed. Every deploy is listed in the repository's Actions tab.

## Files

| File | What it does |
|---|---|
| `apps/web/wrangler.jsonc` | Worker name, domains (cairoroast.com, www), settings that are not secret |
| `apps/web/open-next.config.ts` | OpenNext adapter settings |
| `scripts/gen-niches.mjs` | Bundles `niches/*.json` into the app before each build (Workers have no file system) |

## Settings

- Not secret (in `wrangler.jsonc` → `vars`): `SUPABASE_URL`, `NICHE_IDS`, `NICHE_DOMAINS`, `DEFAULT_NICHE`, `ADMIN_TELEGRAM_CHAT_IDS`, `TEAM_TELEGRAM_CHAT_IDS`.
- Secrets (Cloudflare dashboard → Workers → cairoroast → Settings → Variables and Secrets, or `npx wrangler secret put NAME` in `apps/web`): `ADMIN_PASSWORD`, `SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `BOSTA_API_KEY`, `BOSTA_WEBHOOK_SECRET`, optional `CRON_SECRET`. Never put them in the repo: it is public.

## GitHub secret (once)

The workflow `.github/workflows/deploy.yml` needs the repository secret **`CLOUDFLARE_API_TOKEN`**
(Cloudflare → My Profile → API Tokens → template "Edit Cloudflare Workers"). The account ID is in the workflow; it is not secret.

## By hand from a Mac

```bash
npm ci
npm run cf:build --workspace @niche-engine/web
cd apps/web && npx wrangler deploy
```

Test link: https://cairoroast.wheretospot.workers.dev · Health: https://cairoroast.com/api/health

`DEPLOY-CPANEL.md`, `deploy/cpanel/` and `npm run publish:deploy` describe the old cPanel setup and are kept only for reference.
