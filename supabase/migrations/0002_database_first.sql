-- niche-engine 0002: the database becomes the only source of truth.
--
-- Before: the app kept data in memory and copied changes here, so it had to run
-- as exactly one process. After: every request reads and writes here, so the app
-- can restart or run as several processes without losing or mixing data.
--
-- Safe to run on the 0001 schema (tables may be empty or not). Run it once in
-- Supabase → SQL Editor.

-- ---------- orders ----------
-- The database assigns order numbers (starting at 1001), so two processes can never
-- pick the same one.
create sequence if not exists orders_id_seq start 1001 owned by orders.id;
select setval('orders_id_seq', greatest(1000, coalesce((select max(id) from orders), 1000)));
alter table orders alter column id set default nextval('orders_id_seq');

-- Optimistic locking: an update only applies if nobody changed the order since it was read.
alter table orders add column if not exists version int not null default 0;
-- The delivery details as typed at checkout (a later address change doesn't rewrite old orders).
alter table orders add column if not exists customer jsonb not null default '{}';
-- Lookups: a seller's orders, and the order behind a Bosta tracking number.
alter table orders add column if not exists seller_ids text[] not null default '{}';
alter table orders add column if not exists tracking_numbers text[] not null default '{}';
create index if not exists orders_seller_ids_idx on orders using gin (seller_ids);
create index if not exists orders_tracking_idx on orders using gin (tracking_numbers);
create index if not exists orders_phone_niche_idx on orders (customer_phone, niche_id, created_at desc);

-- A bundle and a single item can hold the same product and size: give each line its own id.
alter table order_items drop constraint if exists order_items_pkey;
alter table order_items add column if not exists id bigint generated always as identity primary key;

-- ---------- wallet ----------
-- One row per customer wallet, used as a lock: spending checks the version it read.
create table if not exists wallets (
  phone     text not null references customers(phone),
  niche_id  text not null references niches(id),
  version   int not null default 0,
  primary key (phone, niche_id)
);
alter table wallet_ledger alter column id set default gen_random_uuid()::text;
-- At most one cashback, one refund and one spend per order, enforced by the database.
create unique index if not exists wallet_one_cashback_per_order on wallet_ledger (order_id) where kind = 'cashback';
create unique index if not exists wallet_one_refund_per_order   on wallet_ledger (order_id) where kind = 'refund';
create unique index if not exists wallet_one_spend_per_order    on wallet_ledger (order_id) where kind = 'spend';
alter table wallet_ledger drop constraint if exists wallet_amount_sign;
alter table wallet_ledger add constraint wallet_amount_sign check (
  (kind = 'spend' and amount < 0) or (kind in ('cashback', 'refund') and amount > 0) or kind = 'adjust'
);

-- Appends one wallet entry atomically.
--   p_expected: the wallet version the app read (spends), or null (credits: no balance to check).
-- Returns 'ok', 'conflict' (someone changed the wallet: re-read and retry) or
-- 'duplicate' (this order already has that kind of entry: nothing to do).
create or replace function wallet_append(p_phone text, p_niche text, p_expected int, p_entry jsonb)
returns text language plpgsql as $$
declare v int;
begin
  insert into wallets (phone, niche_id) values (p_phone, p_niche) on conflict do nothing;
  select version into v from wallets where phone = p_phone and niche_id = p_niche for update;
  if p_expected is not null and v <> p_expected then return 'conflict'; end if;
  begin
    insert into wallet_ledger (id, phone, niche_id, amount, kind, order_id, note, expires_at, created_at)
    values (
      coalesce(p_entry->>'id', gen_random_uuid()::text), p_phone, p_niche,
      (p_entry->>'amount')::numeric, p_entry->>'kind', (p_entry->>'order_id')::bigint, p_entry->>'note',
      (p_entry->>'expires_at')::timestamptz, coalesce((p_entry->>'created_at')::timestamptz, now())
    );
  exception when unique_violation then return 'duplicate';
  end;
  -- Last line of defence: a wallet can never go below zero in total.
  if (select coalesce(sum(amount), 0) from wallet_ledger where phone = p_phone and niche_id = p_niche) < 0 then
    raise exception 'wallet_negative';
  end if;
  update wallets set version = version + 1 where phone = p_phone and niche_id = p_niche;
  return 'ok';
end $$;

-- Places an order, its lines and (optionally) its wallet spend in ONE transaction.
-- If the wallet changed since the app read it, nothing is saved and the call fails
-- with 'wallet_conflict' (the app re-reads the balance and tries again).
create or replace function place_order(p_order jsonb, p_items jsonb, p_spend numeric, p_wallet_version int)
returns jsonb language plpgsql as $$
declare new_id bigint; res text;
begin
  insert into orders (niche_id, customer_phone, customer, status, type, payment, promo_code, total, quote, cart,
                      seller_state, seller_ids, shipments, tracking_numbers, needs_attention)
  values (
    p_order->>'niche_id', p_order->>'customer_phone', p_order->'customer', p_order->>'status', p_order->>'type',
    p_order->>'payment', p_order->>'promo_code', (p_order->>'total')::numeric, p_order->'quote', p_order->'cart',
    p_order->'seller_state', array(select jsonb_array_elements_text(p_order->'seller_ids')), '{}', '{}',
    p_order->>'needs_attention'
  )
  returning id into new_id;

  insert into order_items (order_id, seller_id, product_id, name, variant, qty, unit_price)
  select new_id, i->>'seller_id', i->>'product_id', i->>'name', i->>'variant', (i->>'qty')::int, (i->>'unit_price')::numeric
  from jsonb_array_elements(p_items) as i;

  if coalesce(p_spend, 0) > 0 then
    res := wallet_append(p_order->>'customer_phone', p_order->>'niche_id', p_wallet_version,
                         jsonb_build_object('amount', -p_spend, 'kind', 'spend', 'order_id', new_id));
    if res <> 'ok' then raise exception 'wallet_conflict'; end if;
  end if;

  return (select to_jsonb(o) from orders o where o.id = new_id);
end $$;

-- ---------- trust ----------
-- One row per refused order. Two refusals block a phone in every niche.
-- (Replaces the old counter table: counting rows can't double-count a retried webhook.)
create table if not exists refusals (
  phone       text not null,
  order_id    bigint not null references orders(id),
  created_at  timestamptz not null default now(),
  primary key (phone, order_id)
);
create or replace view blocked_phones as
  select phone, count(*)::int as refusals from refusals group by phone having count(*) >= 2;
drop table if exists blocklist;

-- Wrong passwords, shared by every process (5 in 15 minutes locks sign-in for that phone).
create table if not exists auth_failures (
  id     bigint generated always as identity primary key,
  phone  text not null,
  at     timestamptz not null default now()
);
create index if not exists auth_failures_phone_at_idx on auth_failures (phone, at desc);

-- ---------- seller bot ----------
-- Where each seller is in a multi-step flow (apply, add product).
create table if not exists bot_sessions (
  chat_id     bigint primary key,
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);
-- Telegram resends an update if we answer slowly; each update is handled once.
create table if not exists telegram_updates (
  update_id    bigint primary key,
  received_at  timestamptz not null default now()
);

-- ---------- security: server-only access ----------
alter table wallets          enable row level security;
alter table refusals         enable row level security;
alter table auth_failures    enable row level security;
alter table bot_sessions     enable row level security;
alter table telegram_updates enable row level security;
-- The view runs with the caller's rights, so the public key sees nothing through it.
alter view blocked_phones set (security_invoker = true);
revoke execute on function wallet_append(text, text, int, jsonb) from public, anon, authenticated;
revoke execute on function place_order(jsonb, jsonb, numeric, int) from public, anon, authenticated;
grant execute on function wallet_append(text, text, int, jsonb) to service_role;
grant execute on function place_order(jsonb, jsonb, numeric, int) to service_role;

-- Tell the Supabase API about the new tables and functions.
notify pgrst, 'reload schema';
