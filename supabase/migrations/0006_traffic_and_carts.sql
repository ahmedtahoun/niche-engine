-- 0006: visitor statistics (no cookies), abandoned checkouts, and a small key/value table.
-- Run once in the Supabase SQL editor after 0005. Safe to run again.

-- One row per page view or funnel step. `visitor` is a hash of IP + browser with a key that
-- changes every day: it counts unique visitors per day and cannot be turned back into an IP.
create table if not exists site_events (
  id bigserial primary key,
  at timestamptz not null default now(),
  niche text not null,
  visitor text not null,
  kind text not null check (kind in ('view', 'cart', 'checkout', 'order')),
  path text not null default '/',
  source text not null default 'direct',
  device text not null default 'mobile' check (device in ('mobile', 'desktop')),
  lang text not null default 'ar' check (lang in ('ar', 'en'))
);
create index if not exists site_events_niche_at on site_events (niche, at);
alter table site_events enable row level security;

-- Everything the admin traffic page shows, counted in the database (days in Cairo time).
create or replace function site_stats(p_niche text, p_since timestamptz) returns jsonb
language sql stable as $$
  with e as (
    select kind, path, source, device, visitor, (at at time zone 'Africa/Cairo')::date as day
    from site_events where niche = p_niche and at >= p_since
  ),
  v as (select * from e where kind = 'view')
  select jsonb_build_object(
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'visitors', visitors, 'views', views) order by day)
      from (select day, count(distinct visitor) as visitors, count(*) as views from v group by day) d), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'visitors', n) order by n desc, source)
      from (select source, count(distinct (day, visitor)) as n from v group by source order by n desc, source limit 12) s), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'views', n) order by n desc, path)
      from (select path, count(*) as n from v group by path order by n desc, path limit 15) p), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('device', device, 'visitors', n) order by n desc)
      from (select device, count(distinct (day, visitor)) as n from v group by device) x), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'visitors', (select count(distinct (day, visitor)) from v),
      'product', (select count(distinct (day, visitor)) from v where path like '/p/%' or path like '/b/%'),
      'cart', (select count(distinct (day, visitor)) from e where kind = 'cart'),
      'checkout', (select count(distinct (day, visitor)) from e where kind = 'checkout'),
      'order', (select count(distinct (day, visitor)) from e where kind = 'order'))
  );
$$;

-- A checkout someone started (valid phone typed) but may not finish. One live draft per phone per
-- niche; the team is alerted once if no order follows within an hour.
create table if not exists checkout_drafts (
  id bigserial primary key,
  niche text not null,
  phone text not null,
  name text not null default '',
  governorate text not null default '',
  cart jsonb not null,
  total numeric(10, 2) not null default 0,
  lang text not null default 'ar',
  token text not null unique,
  status text not null default 'open' check (status in ('open', 'alerted', 'reminded', 'ordered', 'dismissed')),
  order_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  alerted_at timestamptz,
  reminded_at timestamptz
);
create index if not exists checkout_drafts_phone on checkout_drafts (niche, phone, status);
create index if not exists checkout_drafts_status on checkout_drafts (status, updated_at);
alter table checkout_drafts enable row level security;

-- Small settings the server remembers between restarts (e.g. the last revision sent to IndexNow).
create table if not exists site_kv (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table site_kv enable row level security;
