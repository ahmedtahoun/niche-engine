# niche-engine

One marketplace engine, many niche brands, built for Egypt.
First niche: **Sakina** (Umrah and modest wear). Next: **Bunn** (specialty coffee).

- **Customers** order on the niche website (PWA, Arabic, no account) and confirm on WhatsApp.
- **Sellers** run everything from a Telegram bot: apply, add products, accept orders, get paid.
- **You** control everything from the admin panel.
- **Every shipment** goes through the platform's Bosta account, so cash on delivery reaches the platform before sellers are paid weekly (minus commission and a reserve).

## Layout

| Path | What it is | Status |
|---|---|---|
| `niches/*.json` | One settings file per niche: brand, categories, required attributes, commission, reserve, deposit, wallet, search synonyms, hero bundles, promos | Umrah + Coffee drafted |
| `packages/core` | Shared rules: niche validation, cart totals, promos, commission tiers, payouts and reserve, Arabic search, phone validation | Done, tested |
| `supabase/migrations` | Postgres schema for all niches (matches the app model) | Ready to apply |
| `apps/web/src/lib/persist.ts` | Supabase persistence: loads everything on server start, writes every change back. Demo data when keys are absent | Done, tested against a fake Supabase |
| `apps/web/src/lib/bosta.ts` + `fulfillment.ts` | One Bosta shipment per seller when they accept, cash split across shipments, waybill PDF to the seller's Telegram, `/api/bosta` webhook for delivered / returned | Done in demo mode; verify field names with Bosta |
| `apps/web` | Next.js storefront, multi-domain (one domain per niche): home, search, product, bundle, cart, checkout, order. Demo data until Supabase keys arrive | Storefront done; admin next |
| `apps/web/src/bot` | Telegram seller bot: apply, add product (with required attributes + seller share), receive orders, accept / not available / handed to courier, numbers, payout, price check. Pure engine + `/api/telegram` webhook | Done, tested; needs the bot token |
| Customer accounts | Phone + password created inside checkout; scrypt-hashed passwords, signed session cookie, 5-attempt lock, saved address, order pages visible to their owner only | Done, tested |
| Customer wallet | Per niche: cashback on delivery (Umrah 4% / 30 days, Coffee 4% / 45 days), use at checkout (never pays shipping), soonest-expiring credit spent first, credit returned on cancel/refusal, balance in header + account history, "credit owed" in admin | Done, tested |
| `/admin` | Admin panel (English): overview + alerts per niche, orders with Bosta status updates and a shared refusal blocklist, seller applications / warn / suspend, product review queue and stock, weekly payouts that message sellers on Telegram | Done; password via `ADMIN_PASSWORD` |
| `/dev/bot` | Local bot simulator (dev only): chat as any seller, see orders arrive when a customer confirms | Dev tool |
| `NICHE-UX-STANDARD.md` | Checklist every niche must pass before launch, plus the lessons log | Living |
| `sakina-prototype.html` | Clickable prototype of all three sides | Reference |

## Run

Node 22.18 or newer (TypeScript runs natively, no build step for `core`).

```bash
npm test
```

```bash
npm run check:niches
```

Storefront (open http://localhost:3100/umrah or /coffee):

```bash
npm run dev --workspace @niche-engine/web
```

In production each niche gets its own domain via `NICHE_DOMAINS` (e.g. `sakinaeg.com=umrah,bunneg.com=coffee`).

Seller bot without Telegram: open http://localhost:3100/dev/bot. When the token is ready, set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`, then register the webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://YOUR_DOMAIN/api/telegram&secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

## Adding a niche

1. Copy `niches/umrah.json` to `niches/<id>.json` and change the values.
2. `npm run check:niches` must pass. It refuses a niche without a multi-seller bundle, or with commission that makes poaching profitable.
3. Walk through `NICHE-UX-STANDARD.md` and tick every item.

## Money rules (packages/core/src/money.ts)

- Commission by customer type: new / repeat / seller's own code (Umrah: 18% / 6% / 2%).
- Bundle discounts and platform promos come out of platform commission; seller prices stay equal to their Instagram prices.
- Seller-funded promos lower that seller's commission base.
- Wallet credit never pays the shipping fee.
- Deposit = the shipping fee, only above the niche threshold.
- Weekly payout = delivered sales − commission − reserve (Umrah: 12% held 30 days).

## Deploying

**cPanel + GitHub:** see **[DEPLOY-CPANEL.md](DEPLOY-CPANEL.md)** (GitHub Actions builds, cPanel pulls the `deploy` branch).

**Container host:** see **[DEPLOY.md](DEPLOY.md)**: Supabase, environment variables, Docker host (one instance), domains, webhooks, launch checklist.

## Going live: data and shipping

**Supabase**
1. Create the project, open the SQL editor, and run `supabase/migrations/0001_init.sql`.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server only, never in the browser).
3. Restart. The server loads all data on start; the demo catalog disappears.

**Run as ONE server instance** (a Node host such as Railway, Render or a VPS), not serverless functions: the app reads from memory and writes through to Supabase.

**Bosta**
1. Set `BOSTA_API_KEY`. Each seller needs their pickup location id in `sellers.bosta_location_id`.
2. In the Bosta dashboard, set the webhook URL to `https://YOUR_DOMAIN/api/bosta` with the Authorization header value = `BOSTA_WEBHOOK_SECRET`.
3. Before the first real order, check every line marked `VERIFY` in `apps/web/src/lib/bosta.ts` against Bosta's API docs (endpoint paths, field names, state codes).

## Accounts needed before the next steps

Put the values in `.env.local` (never commit it). See `.env.example` for the names.

- Supabase project (database + storage)
- Telegram bot token from BotFather
- Bosta business API key
- Meta Business verification + WhatsApp Cloud API number
