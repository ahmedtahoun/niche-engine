-- niche-engine: initial schema (Supabase / Postgres)
-- Matches the app model in apps/web/src/lib/types.ts and orders.ts.
-- The app writes with the service-role key from the server only; RLS is on with
-- no policies, so the public anon key can read or write nothing.
-- Money is numeric(12,2) EGP.

-- ---------- niches (settings files are the source of truth; mirrored here for reporting) ----------
create table niches (
  id          text primary key,
  status      text not null default 'draft' check (status in ('draft', 'live', 'paused')),
  config      jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------- sellers ----------
create table sellers (
  id                 text primary key,
  niche_id           text not null references niches(id),
  store_name         text not null,
  telegram_chat_id   bigint unique,
  instagram          text,
  area               text not null,
  instapay           text,
  capacity           text,
  bosta_location_id  text,                       -- pickup location under the platform's Bosta account
  status             text not null default 'applied' check (status in ('applied', 'active', 'warning', 'suspended', 'declined')),
  rating             numeric(2,1) not null default 0,
  created_at         timestamptz not null default now()
);
create index on sellers (niche_id, status);

-- ---------- products (variants inline: label + stock) ----------
create table products (
  id                  text primary key,
  niche_id            text not null references niches(id),
  seller_id           text not null references sellers(id),
  slug                text not null,
  category            text not null,
  art                 text not null default 'abaya',
  color               text not null default '#B9A98F',
  name_ar             text not null,
  lead_ar             text not null default '',
  price               numeric(12,2) not null check (price > 0),
  attributes          jsonb not null default '{}',
  variants            jsonb not null default '[]',   -- [{label, stock}]
  status              text not null default 'review' check (status in ('review', 'live', 'hidden')),
  price_confirmed_at  timestamptz not null default now(),
  views               int not null default 0,
  reviews             jsonb not null default '[]',
  faq                 jsonb not null default '[]',
  created_at          timestamptz not null default now(),
  unique (niche_id, slug)
);
create index on products (niche_id, status, category);

-- ---------- customers: accounts by phone + password (one phone = one person across niches) ----------
create table customers (
  phone          text primary key,                 -- normalized 01XXXXXXXXX
  name           text not null,
  password_hash  text,                             -- scrypt$salt$hash; the password itself is never stored
  governorate    text not null default '',
  area           text not null default '',
  address        text not null default '',
  landmark       text not null default '',
  created_at     timestamptz not null default now()
);

-- ---------- orders ----------
create table orders (
  id               bigint primary key,             -- assigned by the app (sequence kept in memory, restored on boot)
  niche_id         text not null references niches(id),
  customer_phone   text not null references customers(phone),
  status           text not null check (status in ('awaiting_confirm', 'confirmed', 'accepted', 'picked', 'delivered', 'refused', 'cancelled')),
  type             text not null check (type in ('new', 'repeat')),
  payment          text not null check (payment in ('cod', 'instapay')),
  promo_code       text,
  total            numeric(12,2) not null,
  quote            jsonb not null,                 -- priced lines + totals at order time
  cart             jsonb not null,
  seller_state     jsonb not null,                 -- {sellerId: pending|accepted|rejected|handed}
  shipments        jsonb not null default '{}',    -- {sellerId: {deliveryId, tracking, status, cod}}
  needs_attention  text,
  created_at       timestamptz not null default now(),
  delivered_at     timestamptz
);
create index on orders (niche_id, status, created_at desc);
create index on orders (customer_phone);

-- One row per sellable unit, for reporting and seller statements.
create table order_items (
  order_id    bigint not null references orders(id) on delete cascade,
  seller_id   text not null references sellers(id),
  product_id  text not null references products(id),
  name        text not null,
  variant     text not null,
  qty         int not null check (qty > 0),
  unit_price  numeric(12,2) not null,
  primary key (order_id, product_id, variant)
);
create index on order_items (seller_id);

-- ---------- money ----------
create table payouts (
  seller_id   text not null references sellers(id),
  cycle_date  date not null,                       -- the Thursday the cycle started
  amount      numeric(12,2) not null,
  paid_at     timestamptz not null default now(),
  reference   text,                                -- InstaPay transaction reference
  primary key (seller_id, cycle_date)
);

-- Customer wallet: append-only ledger per phone per niche.
-- + cashback / refund / adjust credits (each with its own expiry), − spend at checkout.
create table wallet_ledger (
  id          text primary key,
  phone       text not null references customers(phone),
  niche_id    text not null references niches(id),
  amount      numeric(12,2) not null,
  kind        text not null check (kind in ('cashback', 'spend', 'refund', 'adjust')),
  order_id    bigint references orders(id),
  note        text,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index on wallet_ledger (phone, niche_id);

-- ---------- trust ----------
-- Shared across ALL niches: a number that refuses deliveries is blocked everywhere.
create table blocklist (
  phone       text primary key,
  refusals    int not null default 0,
  reason      text,                                -- set when blocked
  updated_at  timestamptz not null default now()
);

create table leakage_reports (
  id          bigint generated by default as identity primary key,
  order_id    bigint references orders(id),
  seller_id   text not null references sellers(id),
  source      text not null check (source in ('survey', 'insert_card', 'mystery_order', 'admin')),
  note        text,
  status      text not null default 'open' check (status in ('open', 'confirmed', 'dismissed')),
  created_at  timestamptz not null default now()
);

-- ---------- analytics ----------
create table events (
  id          bigint generated by default as identity primary key,
  niche_id    text references niches(id),
  name        text not null,                       -- view_item, add_to_cart, purchase, wa_confirm, search …
  phone       text,
  session_id  text,
  props       jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index on events (niche_id, name, created_at desc);

-- ---------- security: server-only access ----------
alter table niches          enable row level security;
alter table sellers         enable row level security;
alter table products        enable row level security;
alter table customers       enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table payouts         enable row level security;
alter table wallet_ledger   enable row level security;
alter table blocklist       enable row level security;
alter table leakage_reports enable row level security;
alter table events          enable row level security;
