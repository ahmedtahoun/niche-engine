import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quote } from '../src/lib/catalog.ts';
import { moveOrderTo } from '../src/lib/fulfillment.ts';
import { getNiche } from '../src/lib/niches.ts';
import { saveOrder, type Order } from '../src/lib/orders.ts';
import type { CartLine } from '../src/lib/types.ts';
import { rowToWallet, walletToRow } from '../src/lib/persist.ts';
import { adjust, entriesOf, grantCashback, refundSpend, spend, totalOwed, walletOf } from '../src/lib/wallet.ts';

const umrah = getNiche('umrah')!;
let n = 0;
function order(phone: string, cart: CartLine[] = [{ kind: 'bundle', id: 'umrah_kit_women', variant: '2', qty: 1 }], wallet = 0): Order {
  const q = quote(umrah, cart, { isFirstOrder: false, walletBalance: wallet, useWallet: wallet > 0 });
  return saveOrder({ niche: 'umrah', status: 'picked', type: 'repeat', payment: 'cod', cart, quote: q,
    customer: { name: `c${n++}`, phone, governorate: 'القاهرة', area: 'x', address: 'x', landmark: '' } });
}

test('4% cashback on delivered goods after discounts, once per order', () => {
  const o = order('01010000001');
  moveOrderTo(o, 'delivered');
  // (1,590 − 100 kit discount) × 4% = 59.6 → 59
  assert.equal(walletOf('01010000001', 'umrah').balance, 59);
  assert.equal(grantCashback(o), null, 'no double cashback');
  assert.equal(walletOf('01010000001', 'umrah').balance, 59);
  assert.equal(walletOf('01010000001', 'coffee').balance, 0, 'wallets are per niche');
});

test('credit expires after the niche window (30 days for Umrah)', () => {
  const o = order('01010000002');
  const past = new Date(Date.now() - 31 * 864e5).toISOString();
  grantCashback(o, past);
  assert.equal(walletOf('01010000002', 'umrah').balance, 0);
  assert.equal(walletOf('01010000002', 'umrah', new Date(Date.now() - 2 * 864e5)).balance, 59, 'it was spendable before expiry');
});

test('spending uses the credit that expires soonest first', () => {
  const phone = '01010000003';
  const soon = order(phone);
  grantCashback(soon, new Date(Date.now() - 20 * 864e5).toISOString()); // 59, expires in 10 days
  adjust(phone, 'umrah', 50, 'leakage report reward');                   // 50, expires in 30 days
  assert.equal(walletOf(phone, 'umrah').balance, 109);
  spend(phone, 'umrah', 70, 9999);
  const w = walletOf(phone, 'umrah');
  assert.equal(w.balance, 39);
  assert.equal(w.nextExpiry!.amount, 39, 'the 59 that expires first was used up; 39 of the 50 is left');
  assert.throws(() => spend(phone, 'umrah', 40, 9998), /wallet_insufficient/);
});

test('wallet never pays the shipping fee', () => {
  const q = quote(umrah, [{ kind: 'item', slug: 'two-layer-niqab-black', variant: 'مقاس واحد', qty: 1 }], { isFirstOrder: false, walletBalance: 1000, useWallet: true });
  assert.equal(q.wallet, 220);
  assert.equal(q.total, 65);
});

test('cancelled or refused orders give the used credit back, once', () => {
  const phone = '01010000004';
  adjust(phone, 'umrah', 100, 'test');
  const o = order(phone, [{ kind: 'item', slug: 'two-layer-niqab-black', variant: 'مقاس واحد', qty: 1 }], 100);
  spend(phone, 'umrah', o.quote.wallet, o.id);
  assert.equal(walletOf(phone, 'umrah').balance, 0);
  moveOrderTo(o, 'refused');
  assert.equal(walletOf(phone, 'umrah').balance, 100);
  assert.equal(refundSpend(o), null, 'no double refund');
  assert.ok(totalOwed('umrah') >= 100);
});

test('wallet entries survive the database round trip', () => {
  for (const e of entriesOf('01010000003', 'umrah')) assert.deepEqual(rowToWallet(walletToRow(e)), e);
});
