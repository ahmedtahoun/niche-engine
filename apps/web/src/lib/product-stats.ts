// Sales numbers per product and per option (size), read from the orders. Used by the admin.
// "Sold" counts orders that reached the sellers (confirmed onwards), not cancelled or refused ones.
// Revenue is the shelf price times quantity (before bundle, promo and wallet discounts, which are
// order-level); cost is the wholesale cost saved on the order item, else today's cost.
import type { Order } from './orders.ts';
import type { Product } from './types.ts';

const COUNTED = new Set(['confirmed', 'accepted', 'picked', 'delivered']);
export const DAYS = 30;

export interface Numbers {
  units: number;
  revenue: number;
  cost: number;
  /** Revenue minus cost, only for units whose buying price is known. */
  profit: number;
  /** Revenue of the units whose buying price is known (the base for margin %). */
  costedRevenue: number;
  /** Units sold without a known buying price (their profit is unknown). */
  noCost: number;
  orders: number;
}
const zero = (): Numbers => ({ units: 0, revenue: 0, cost: 0, profit: 0, costedRevenue: 0, noCost: 0, orders: 0 });

export interface SkuStats {
  all: Numbers;
  recent: Numbers; // last 30 days
}

export interface ProductStats extends SkuStats {
  /** Per option label (e.g. "250 جم"). */
  byVariant: Record<string, SkuStats>;
  /** Units per per-order choice value (e.g. grind "kanaka"), all time. */
  choices: Record<string, number>;
  /** Units sold each day, oldest first, for the last 30 days. */
  daily: number[];
  /** Units delivered (all time), and refused at the door. */
  delivered: number;
  refused: number;
  lastSold?: string;
  recentOrders: { id: number; createdAt: string; status: string; variant: string; qty: number }[];
}

const add = (n: Numbers, units: number, revenue: number, cost: number | null, newOrder: boolean) => {
  n.units += units; n.revenue += revenue;
  if (cost === null) n.noCost += units;
  else { n.cost += cost; n.profit += revenue - cost; n.costedRevenue += revenue; }
  if (newOrder) n.orders += 1;
};

/** Margin of what was sold, over the units with a known buying price. */
export const soldMargin = (n: Numbers) => (n.costedRevenue > 0 ? n.profit / n.costedRevenue : null);

/** The product option an order item belongs to ("250 جم · كنكة (تركي)" → "250 جم"). */
export const variantOf = (p: Product, itemVariant: string) =>
  p.variants.map((v) => v.label).sort((a, b) => b.length - a.length).find((l) => itemVariant === l || itemVariant.startsWith(`${l} `)) ?? itemVariant;

export function productStats(products: Product[], orders: Order[], now = Date.now()): Record<string, ProductStats> {
  const out: Record<string, ProductStats> = {};
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const p of products) {
    out[p.id] = { all: zero(), recent: zero(), byVariant: Object.fromEntries(p.variants.map((v) => [v.label, { all: zero(), recent: zero() }])), choices: {}, daily: Array(DAYS).fill(0), delivered: 0, refused: 0, recentOrders: [] };
  }
  const since = now - DAYS * 864e5;
  for (const o of orders) {
    const t = Date.parse(o.createdAt);
    if (o.status === 'refused') for (const i of o.items) { const s = out[i.productId]; if (s) s.refused += i.qty; }
    if (!COUNTED.has(o.status)) continue;
    const recent = t >= since;
    const seen = new Set<string>();
    for (const i of o.items) {
      const p = byId.get(i.productId);
      const s = out[i.productId];
      if (!p || !s) continue;
      const label = variantOf(p, i.variant);
      const unitCost = i.unitCost ?? p.cost?.[label];
      const revenue = i.unitPrice * i.qty, cost = unitCost === undefined ? null : unitCost * i.qty;
      const first = !seen.has(p.id);
      seen.add(p.id);
      add(s.all, i.qty, revenue, cost, first);
      const v = (s.byVariant[label] ??= { all: zero(), recent: zero() });
      add(v.all, i.qty, revenue, cost, true);
      if (recent) {
        add(s.recent, i.qty, revenue, cost, first);
        add(v.recent, i.qty, revenue, cost, true);
        const day = DAYS - 1 - Math.floor((now - t) / 864e5);
        if (day >= 0 && day < DAYS) s.daily[day] += i.qty;
      }
      if (o.status === 'delivered') s.delivered += i.qty;
      if (!s.lastSold || o.createdAt > s.lastSold) s.lastSold = o.createdAt;
      s.recentOrders.push({ id: o.id, createdAt: o.createdAt, status: o.status, variant: i.variant, qty: i.qty });
    }
    // Choices (grind…) are kept on the cart line, per product slug.
    for (const l of o.cart) {
      if (l.kind !== 'item' || !l.choice) continue;
      const p = products.find((x) => x.slug === l.slug);
      const s = p && out[p.id];
      if (!s) continue;
      for (const value of Object.values(l.choice)) s.choices[value] = (s.choices[value] ?? 0) + l.qty;
    }
  }
  for (const s of Object.values(out)) s.recentOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).splice(20);
  return out;
}

/** Days of stock left at the last 30 days' pace (null when nothing sold). */
export const coverDays = (stock: number, units30: number) => (units30 > 0 ? Math.round(stock / (units30 / DAYS)) : null);

export const marginPct = (price: number, cost?: number) => (cost === undefined || price <= 0 ? null : (price - cost) / price);
