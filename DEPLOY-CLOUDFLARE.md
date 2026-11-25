# Deploying on Cloudflare (live since 2026-11-25)

cairoroast.com runs on **Cloudflare Workers** as the Worker `cairoroast`, built with the OpenNext adapter.
Supabase stays the only place data lives, exactly as before.

```
push to main ──▶ Cloudflare Workers Builds: npm ci → npm run cf:build → wrangler deploy ──▶ cairoroast.com
             └─▶ GitHub Actions: tests + niche check + a test Cloudflare build (no deploy)
```

Other branches get a preview link from Workers Builds; the live site only changes from `main`.

## Files

| File | What it does |
|---|---|
| `apps/web/wrangler.jsonc` | Worker name, domains (cairoroast.com, www), settings that are not secret |
| `apps/web/open-next.config.ts` | OpenNext adapter settings |
| `scripts/gen-niches.mjs` | Bundles `niches/*.json` into the app before each build (Workers have no file system) |

## Settings

- Not secret (in `wrangler.jsonc` → `vars`): `SUPABASE_URL`, `NICHE_IDS`, `NICHE_DOMAINS`, `DEFAULT_NICHE`, `ADMIN_TELEGRAM_CHAT_IDS`, `TEAM_TELEGRAM_CHAT_IDS`.
- Secrets (Cloudflare dashboard → Workers → cairoroast → Settings → Variables and Secrets, or `npx wrangler secret put NAME` in `apps/web`): `ADMIN_PASSWORD`, `SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `BOSTA_API_KEY`, `BOSTA_WEBHOOK_SECRET`, optional `CRON_SECRET`. Never put them in the repo: it is public.

## Workers Builds settings (once)

Cloudflare → Workers & Pages → **cairoroast** → Settings → **Builds** → Connect → repository `niche-engine`, branch `main`:
- Root directory: `/` (the repository root, so npm installs the whole workspace)
- Build command: `npm run cf:build --workspace @niche-engine/web`
- Deploy command: `cd apps/web && npx wrangler deploy`

## By hand from a Mac

```bash
npm ci
npm run cf:build --workspace @niche-engine/web
cd apps/web && npx wrangler deploy
```

Test link: https://cairoroast.wheretospot.workers.dev · Health: https://cairoroast.com/api/health

`DEPLOY-CPANEL.md`, `deploy/cpanel/` and `npm run publish:deploy` describe the old cPanel setup and are kept only for reference.
