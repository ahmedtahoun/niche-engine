import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/lib/catalog.ts';
import { moveOrderTo } from '../src/lib/fulfillment.ts';
import { getNiche } from '../src/lib/niches.ts';
import { draftOrder } from '../src/lib/orders.ts';
import { store } from '../src/lib/store/index.ts';
import type { CartLine } from '../src/lib/types.ts';
import { adjust, grantCashback, refundSpend, totalOwed, walletOf } from '../src/lib/wallet.ts';
import { CUSTOMER, freshStore, makeOrder } from './helpers.ts';

const umrah = getNiche('umrah')!;
const NIQAB: CartLine[] = [{ kind: 'item', slug: 'two-layer-niqab-black', variant: 'مقاس واحد', qty: 1 }];
freshStore();

/** Places an order paying `credit` from the wallet, the way checkout does. */
async function orderWithCredit(phone: string, credit: number, version: number) {
  const q = (await catalog()).quote(umrah, NIQAB, { isFirstOrder: false, walletBalance: credit, useWallet: true });
  return store().createOrder(draftOrder({ niche: 'umrah', status: 'confirmed', type: 'repeat', payment: 'cod', cart: NIQAB, quote: q, customer: { ...CUSTOMER, phone } }), { amount: q.wallet, walletVersion: version });
}

test('4% cashback on delivered goods after discounts, once per order', async () => {
  const o = await makeOrder({ phone: '01010000001', status: 'picked', type: 'repeat' });
  await moveOrderTo(o.id, 'delivered', ['picked']);
  // (1,590 − 100 kit discount) × 4% = 59.6 → 59
  assert.equal((await walletOf('01010000001', 'umrah')).balance, 59);
  assert.equal(await grantCashback(o), null, 'no double cashback');
  assert.equal((await walletOf('01010000001', 'umrah')).balance, 59);
  assert.equal((await walletOf('01010000001', 'coffee')).balance, 0, 'wallets are per niche');
});

test('credit expires after the niche window (30 days for Umrah)', async () => {
  const o = await makeOrder({ phone: '01010000002', type: 'repeat' });
  await grantCashback(o, new Date(Date.now() - 31 * 864e5).toISOString());
  assert.equal((await walletOf('01010000002', 'umrah')).balance, 0);
  assert.equal((await walletOf('01010000002', 'umrah', new Date(Date.now() - 2 * 864e5))).balance, 59, 'it was spendable before expiry');
});

test('spending uses the credit that expires soonest first', async () => {
  const phone = '01010000003';
  const soon = await makeOrder({ phone, type: 'repeat' });
  await grantCashback(soon, new Date(Date.now() - 20 * 864e5).toISOString()); // 59, expires in 10 days
  await adjust(phone, 'umrah', 50, 'leakage report reward');                   // 50, expires in 30 days
  const w0 = await walletOf(phone, 'umrah');
  assert.equal(w0.balance, 109);
  const o = await orderWithCredit(phone, 109, w0.version);
  assert.notEqual(o, 'wallet_conflict');
  const w = await walletOf(phone, 'umrah');
  // The niqab costs 220, so all 109 is used: nothing left.
  assert.equal(w.balance, 0);
});

test('a stale balance can never be spent twice (two checkouts at once)', async () => {
  const phone = '01010000005';
  await adjust(phone, 'umrah', 100, 'test');
  const w = await walletOf(phone, 'umrah');
  const results = await Promise.all([orderWithCredit(phone, 100, w.version), orderWithCredit(phone, 100, w.version)]);
  assert.equal(results.filter((r) => r === 'wallet_conflict').length, 1, 'the second checkout must re-read the balance');
  assert.equal((await walletOf(phone, 'umrah')).balance, 0);
  assert.equal((await store().listOrders({ phone })).length, 1, 'the refused checkout saved no order');
});

test('wallet never pays the shipping fee', async () => {
  const q = (await catalog()).quote(umrah, NIQAB, { isFirstOrder: false, walletBalance: 1000, useWallet: true });
  assert.equal(q.wallet, 220);
  assert.equal(q.total, 65);
});

test('cancelled or refused orders give the used credit back, once', async () => {
  const phone = '01010000004';
  await adjust(phone, 'umrah', 100, 'test');
  const w = await walletOf(phone, 'umrah');
  const o = await orderWithCredit(phone, 100, w.version);
  assert.ok(o !== 'wallet_conflict');
  assert.equal((await walletOf(phone, 'umrah')).balance, 0);
  await moveOrderTo(o.id, 'refused', ['confirmed']);
  assert.equal((await walletOf(phone, 'umrah')).balance, 100);
  assert.equal(await refundSpend(o), null, 'no double refund');
  assert.ok((await totalOwed('umrah')) >= 100);
});
