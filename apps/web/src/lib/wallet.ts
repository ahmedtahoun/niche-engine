// Customer wallet, one per phone per niche. An append-only ledger:
//   + cashback after delivery, + refund when an order that used credit is cancelled/refused,
//   − spend at checkout. Each credit expires on its own date; spending uses the
//   credit that expires soonest first. Credit can never pay the shipping fee (core rule).
import { markDirty } from './dirty.ts';
import { getNiche } from './niches.ts';
import type { Order } from './orders.ts';

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

const g = globalThis as unknown as { __wallet?: WalletEntry[] };
const ledger: WalletEntry[] = (g.__wallet ??= []);

const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 864e5).toISOString();
const newId = () => `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function add(e: Omit<WalletEntry, 'id' | 'createdAt'>, now = new Date().toISOString()): WalletEntry {
  const entry: WalletEntry = { ...e, id: newId(), createdAt: now };
  ledger.push(entry);
  markDirty('wallet', entry.id);
  return entry;
}

export const entriesOf = (phone: string, niche: string) => ledger.filter((e) => e.phone === phone && e.niche === niche);

/** Remaining amount of each credit after applying debits soonest-expiring first. */
function lots(phone: string, niche: string) {
  const es = entriesOf(phone, niche).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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

export function walletOf(phone: string, niche: string, now = new Date()) {
  const iso = now.toISOString();
  const live = lots(phone, niche).filter((c) => c.remaining > 0 && c.expiresAt > iso);
  const balance = live.reduce((a, c) => a + c.remaining, 0);
  const next = live.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))[0];
  return { balance, nextExpiry: next ? { amount: next.remaining, at: next.expiresAt } : null };
}

/** Cashback on delivered goods (after bundle and promo discounts). Once per order. */
export function grantCashback(o: Order, now = new Date().toISOString()): WalletEntry | null {
  if (ledger.some((e) => e.kind === 'cashback' && e.orderId === o.id)) return null;
  const cfg = getNiche(o.niche);
  if (!cfg) return null;
  const goods = o.quote.subtotal - o.quote.bundleDiscount - o.quote.promoDiscount;
  const amount = Math.floor(goods * cfg.wallet.cashback);
  if (amount <= 0) return null;
  return add({ phone: o.customer.phone, niche: o.niche, amount, kind: 'cashback', orderId: o.id, expiresAt: addDays(now, cfg.wallet.expiresDays) }, now);
}

/** Records credit used at checkout. Throws if the balance no longer covers it. */
export function spend(phone: string, niche: string, amount: number, orderId: number): WalletEntry | null {
  if (amount <= 0) return null;
  if (walletOf(phone, niche).balance < amount) throw new Error('wallet_insufficient');
  return add({ phone, niche, amount: -amount, kind: 'spend', orderId });
}

/** Gives back credit an order used, when it is cancelled or refused. Once per order. */
export function refundSpend(o: Order): WalletEntry | null {
  const used = ledger.filter((e) => e.orderId === o.id && e.kind === 'spend').reduce((a, e) => a - e.amount, 0);
  if (used <= 0 || ledger.some((e) => e.kind === 'refund' && e.orderId === o.id)) return null;
  const cfg = getNiche(o.niche);
  const now = new Date().toISOString();
  return add({ phone: o.customer.phone, niche: o.niche, amount: used, kind: 'refund', orderId: o.id, expiresAt: addDays(now, cfg?.wallet.expiresDays ?? 30) }, now);
}

/** Manual credit from the admin (e.g. the leakage-report reward). */
export function adjust(phone: string, niche: string, amount: number, note: string) {
  const cfg = getNiche(niche);
  const now = new Date().toISOString();
  return add({ phone, niche, amount: Math.round(amount), kind: 'adjust', note, ...(amount > 0 ? { expiresAt: addDays(now, cfg?.wallet.expiresDays ?? 30) } : {}) }, now);
}

/** Total credit customers can still spend: a liability on the platform's books. */
export function totalOwed(niche?: string, now = new Date()) {
  const keys = new Set(ledger.filter((e) => !niche || e.niche === niche).map((e) => `${e.phone}|${e.niche}`));
  let sum = 0;
  for (const k of keys) { const [p, n] = k.split('|'); sum += walletOf(p, n, now).balance; }
  return sum;
}

export const allWalletEntries = () => ledger;
export const walletEntryById = (id: string) => ledger.find((e) => e.id === id) ?? null;
export function loadWallet(list: WalletEntry[]) { ledger.splice(0, ledger.length, ...list); }
