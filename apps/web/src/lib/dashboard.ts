// Numbers for the admin overview: a period (7, 30, 90 days) compared with the one before it.
// Pure: orders and products in, numbers out (tested).
import type { Order } from './orders.ts';
import type { Product } from './types.ts';
import { variantOf } from './product-stats.ts';

const BOUGHT = new Set(['confirmed', 'accepted', 'picked', 'delivered']);

export interface Period {
  revenue: number;
  orders: number;
  aov: number;
  /** Gross profit on items with a known buying price, and the revenue it is measured on. */
  profit: number;
  costedRevenue: number;
  units: number;
  customers: number;
  newCustomers: number;
}

export interface Dashboard {
  days: number;
  now: Period;
  before: Period;
  /** One entry per day, oldest first. */
  daily: { date: string; revenue: number; orders: number }[];
  funnel: { placed: number; reachedSeller: number; delivered: number; refused: number; cancelled: number };
  sources: { source: string; orders: number; revenue: number }[];
  governorates: { name: string; orders: number; revenue: number }[];
  topProducts: { id: string; name: string; units: number; revenue: number; profit: number | null }[];
}

const DAY = 864e5;

function period(orders: Order[], products: Map<string, Product>, firstSeen: Map<string, number>, from: number, to: number): Period {
  const inRange = orders.filter((o) => { const t = Date.parse(o.createdAt); return t >= from && t < to && BOUGHT.has(o.status); });
  let profit = 0, costedRevenue = 0, units = 0;
  for (const o of inRange) for (const i of o.items) {
    units += i.qty;
    const p = products.get(i.productId);
    const cost = i.unitCost ?? (p ? p.cost?.[variantOf(p, i.variant)] : undefined);
    if (cost !== undefined) { profit += (i.unitPrice - cost) * i.qty; costedRevenue += i.unitPrice * i.qty; }
  }
  const revenue = inRange.reduce((n, o) => n + o.quote.total, 0);
  const phones = new Set(inRange.map((o) => o.customer.phone));
  const newCustomers = [...phones].filter((ph) => { const t = firstSeen.get(ph) ?? 0; return t >= from && t < to; }).length;
  return { revenue, orders: inRange.length, aov: inRange.length ? revenue / inRange.length : 0, profit, costedRevenue, units, customers: phones.size, newCustomers };
}

export function dashboard(orders: Order[], productList: Product[], days: number, now = Date.now()): Dashboard {
  const products = new Map(productList.map((p) => [p.id, p]));
  const firstSeen = new Map<string, number>();
  for (const o of orders) { const t = Date.parse(o.createdAt); const f = firstSeen.get(o.customer.phone); if (f === undefined || t < f) firstSeen.set(o.customer.phone, t); }
  const start = now - days * DAY;
  const current = orders.filter((o) => Date.parse(o.createdAt) >= start);
  const bought = current.filter((o) => BOUGHT.has(o.status));

  const daily = Array.from({ length: days }, (_, i) => {
    const d0 = start + i * DAY, d1 = d0 + DAY;
    const day = bought.filter((o) => { const t = Date.parse(o.createdAt); return t >= d0 && t < d1; });
    return { date: new Date(d0).toISOString().slice(0, 10), revenue: day.reduce((n, o) => n + o.quote.total, 0), orders: day.length };
  });

  const group = <K extends string>(key: (o: Order) => K) => {
    const m = new Map<K, { orders: number; revenue: number }>();
    for (const o of bought) { const k = key(o); const e = m.get(k) ?? { orders: 0, revenue: 0 }; e.orders += 1; e.revenue += o.quote.total; m.set(k, e); }
    return [...m.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
  };

  const prod = new Map<string, { units: number; revenue: number; profit: number; costed: boolean }>();
  for (const o of bought) for (const i of o.items) {
    const p = products.get(i.productId);
    const cost = i.unitCost ?? (p ? p.cost?.[variantOf(p, i.variant)] : undefined);
    const e = prod.get(i.productId) ?? { units: 0, revenue: 0, profit: 0, costed: true };
    e.units += i.qty; e.revenue += i.unitPrice * i.qty;
    if (cost === undefined) e.costed = false; else e.profit += (i.unitPrice - cost) * i.qty;
    prod.set(i.productId, e);
  }

  return {
    days,
    now: period(orders, products, firstSeen, start, now + 1),
    before: period(orders, products, firstSeen, start - days * DAY, start),
    daily,
    funnel: {
      placed: current.length,
      reachedSeller: current.filter((o) => !['awaiting_confirm', 'cancelled'].includes(o.status)).length,
      delivered: current.filter((o) => o.status === 'delivered').length,
      refused: current.filter((o) => o.status === 'refused').length,
      cancelled: current.filter((o) => o.status === 'cancelled').length,
    },
    // Website orders from a campaign link count under that source ("site:instagram").
    sources: group((o) => (o.source && o.source !== 'web' ? o.source : o.utm?.source ? `site:${o.utm.source}` : 'web')).map(([source, e]) => ({ source, ...e })),
    governorates: group((o) => o.customer.governorate).slice(0, 6).map(([name, e]) => ({ name, ...e })),
    topProducts: [...prod.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6)
      .map(([id, e]) => ({ id, name: products.get(id)?.nameAr ?? id, units: e.units, revenue: e.revenue, profit: e.costed ? e.profit : null })),
  };
}

/** Change from the previous period, as a fraction (null when there was nothing before). */
export const delta = (now: number, before: number) => (before > 0 ? (now - before) / before : null);
