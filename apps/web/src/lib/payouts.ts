// Weekly seller payouts: delivered orders since last Thursday, minus commission and reserve.
import { platformNet, sellerPayout, type NicheConfig, type OrderMoney, type SellerCycle } from '@niche-engine/core';
import { markDirty } from './dirty.ts';
import { allOrders, type Order } from './orders.ts';

export function moneyOf(o: Order): OrderMoney {
  return {
    type: o.type,
    lines: o.items.map((i) => ({ sellerId: i.sellerId, unitPrice: i.unitPrice, qty: i.qty })),
    platformDiscount: o.quote.bundleDiscount + o.quote.promoDiscount,
    wallet: o.quote.wallet,
    delivered: o.status === 'delivered',
  };
}

export function cycleStart(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - 4 + 7) % 7));
  return d;
}

export const nextPayday = (now = new Date()) => { const d = cycleStart(now); d.setDate(d.getDate() + 7); return d; };

export function sellerCycle(sellerId: string, cfg: NicheConfig, now = new Date()): SellerCycle & { reserveHeld: number } {
  const since = cycleStart(now).getTime();
  const delivered = allOrders().filter((o) => o.niche === cfg.id && o.status === 'delivered' && sellerId in o.sellerState);
  const cycle = sellerPayout(sellerId, delivered.filter((o) => Date.parse(o.deliveredAt ?? '') >= since).map(moneyOf), cfg);
  const all = sellerPayout(sellerId, delivered.map(moneyOf), cfg);
  return { ...cycle, reserveHeld: all.reserve };
}

export const orderNet = (o: Order, cfg: NicheConfig) => platformNet(moneyOf(o), cfg);

// Paid marks per seller per cycle (Supabase `payouts` later).
const g = globalThis as unknown as { __paid?: Map<string, { amount: number; at: string }> };
const paid = (g.__paid ??= new Map());
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const key = (sellerId: string, now = new Date()) => `${sellerId}:${ymd(cycleStart(now))}`;
export const paidThisCycle = (sellerId: string) => paid.get(key(sellerId)) ?? null;
export function markPaid(sellerId: string, amount: number) {
  const k = key(sellerId);
  paid.set(k, { amount, at: new Date().toISOString() });
  markDirty('payout', k);
}
export const allPaid = () => paid;
export function loadPaid(rows: { key: string; amount: number; at: string }[]) {
  paid.clear();
  for (const r of rows) paid.set(r.key, { amount: r.amount, at: r.at });
}
