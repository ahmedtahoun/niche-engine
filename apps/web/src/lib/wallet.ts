// Customer wallet, one per phone per niche. An append-only ledger in the database:
//   + cashback after delivery, + refund when an order that used credit is cancelled/refused,
//   − spend at checkout (saved in the same transaction as the order).
// Each credit expires on its own date; spending uses the credit that expires soonest
// first. Credit can never pay the shipping fee (core rule). The database allows one
// cashback, one refund and one spend per order, and never a negative total.
import { getNiche } from './niches.ts';
import type { Order } from './orders.ts';
import { store } from './store/index.ts';

export type WalletKind = 'cashback' | 'spend' | 'refund' | 'adjust';
export interface WalletEntry {
  id: string;
  phone: string;
  niche: string;
  amount: number;          // + credit / − debit, whole EGP
  kind: WalletKind;
  orderId?: number;
  note?: string;
  expiresAt?: string;      // credits only
  createdAt: string;
}

const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 864e5).toISOString();

// ---------- pure balance maths (tested) ----------

/** Remaining amount of each credit after applying debits soonest-expiring first. */
function lots(entries: WalletEntry[]) {
  const es = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const credits: { remaining: number; expiresAt: string }[] = [];
  for (const e of es) {
    if (e.amount > 0) { credits.push({ remaining: e.amount, expiresAt: e.expiresAt ?? '9999-12-31' }); continue; }
    let need = -e.amount;
    for (const c of [...credits].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))) {
      if (need <= 0) break;
      if (c.expiresAt <= e.createdAt || c.remaining <= 0) continue;
      const take = Math.min(c.remaining, need);
      c.remaining -= take;
      need -= take;
    }
  }
  return credits;
}

export function balanceOf(entries: WalletEntry[], now = new Date()) {
  const iso = now.toISOString();
  const live = lots(entries).filter((c) => c.remaining > 0 && c.expiresAt > iso);
  const balance = live.reduce((a, c) => a + c.remaining, 0);
  const next = live.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))[0];
  return { balance, nextExpiry: next ? { amount: next.remaining, at: next.expiresAt } : null };
}

// ---------- reads ----------

/** Balance plus the version to pass when spending (see placeOrder). */
export async function walletOf(phone: string, niche: string, now = new Date()) {
  const { version, entries } = await store().wallet(phone, niche);
  return { ...balanceOf(entries, now), version };
}

export async function entriesOf(phone: string, niche: string) {
  return (await store().wallet(phone, niche)).entries;
}

/** Total credit customers can still spend: a liability on the platform's books. */
export async function totalOwed(niche?: string, now = new Date()) {
  const byWallet = new Map<string, WalletEntry[]>();
  for (const e of await store().listWalletEntries(niche)) {
    const k = `${e.phone}|${e.niche}`;
    byWallet.set(k, [...(byWallet.get(k) ?? []), e]);
  }
  let sum = 0;
  for (const es of byWallet.values()) sum += balanceOf(es, now).balance;
  return sum;
}

// ---------- credits (safe to call twice: the database keeps one per order) ----------

/** Cashback on delivered goods (after bundle and promo discounts). */
export async function grantCashback(o: Order, now = new Date().toISOString()) {
  const cfg = getNiche(o.niche);
  if (!cfg) return null;
  const goods = o.quote.subtotal - o.quote.bundleDiscount - o.quote.promoDiscount;
  const amount = Math.floor(goods * cfg.wallet.cashback);
  if (amount <= 0) return null;
  const r = await store().appendWallet({ phone: o.customer.phone, niche: o.niche, amount, kind: 'cashback', orderId: o.id, expiresAt: addDays(now, cfg.wallet.expiresDays), createdAt: now }, null);
  return r === 'ok' ? amount : null;
}

/** Gives back credit an order used, when it is cancelled or refused. */
export async function refundSpend(o: Order) {
  const entries = await entriesOf(o.customer.phone, o.niche);
  const used = entries.filter((e) => e.orderId === o.id && e.kind === 'spend').reduce((a, e) => a - e.amount, 0);
  if (used <= 0) return null;
  const cfg = getNiche(o.niche);
  const now = new Date().toISOString();
  const r = await store().appendWallet({ phone: o.customer.phone, niche: o.niche, amount: used, kind: 'refund', orderId: o.id, expiresAt: addDays(now, cfg?.wallet.expiresDays ?? 30), createdAt: now }, null);
  return r === 'ok' ? used : null;
}

/** Manual credit from the admin (e.g. the leakage-report reward). */
export async function adjust(phone: string, niche: string, amount: number, note: string) {
  const cfg = getNiche(niche);
  const now = new Date().toISOString();
  return store().appendWallet({ phone, niche, amount: Math.round(amount), kind: 'adjust', note, createdAt: now, ...(amount > 0 ? { expiresAt: addDays(now, cfg?.wallet.expiresDays ?? 30) } : {}) }, null);
}
