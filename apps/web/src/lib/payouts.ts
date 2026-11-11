// Weekly seller payouts: delivered orders since last Thursday, minus commission and reserve.
// A seller can be marked paid once per cycle (the database refuses a second time).
import { platformNet, sellerPayout, type NicheConfig, type OrderMoney, type SellerCycle } from '@niche-engine/core';
import type { Order } from './orders.ts';
import { store } from './store/index.ts';

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

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const cycleDate = (now = new Date()) => ymd(cycleStart(now));

/** This cycle's payout for a seller, from a list of the seller's delivered orders. */
export function cycleFrom(sellerId: string, delivered: Order[], cfg: NicheConfig, now = new Date()): SellerCycle & { reserveHeld: number } {
  const since = cycleStart(now).getTime();
  const mine = delivered.filter((o) => o.niche === cfg.id && o.status === 'delivered' && sellerId in o.sellerState);
  const cycle = sellerPayout(sellerId, mine.filter((o) => Date.parse(o.deliveredAt ?? '') >= since).map(moneyOf), cfg);
  const all = sellerPayout(sellerId, mine.map(moneyOf), cfg);
  return { ...cycle, reserveHeld: all.reserve };
}

export async function sellerCycle(sellerId: string, cfg: NicheConfig, now = new Date()) {
  const delivered = await store().listOrders({ sellerId, niche: cfg.id, statuses: ['delivered'], limit: 100000 });
  return cycleFrom(sellerId, delivered, cfg, now);
}

export const orderNet = (o: Order, cfg: NicheConfig) => platformNet(moneyOf(o), cfg);

/** Sellers already paid this cycle, by seller id. */
export async function paidThisCycle(now = new Date()) {
  return new Map((await store().listPayouts(cycleDate(now))).map((p) => [p.sellerId, p]));
}

/** False if the seller was already marked paid this cycle. */
export const markPaid = (sellerId: string, amount: number, now = new Date()) => store().insertPayout(sellerId, cycleDate(now), amount);
