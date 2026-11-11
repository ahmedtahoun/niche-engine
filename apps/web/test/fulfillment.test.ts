import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBlocked, recordRefusal } from '../src/lib/blocklist.ts';
import { parseWebhook } from '../src/lib/bosta.ts';
import { applyTracking, codSplit, shipSellerPart } from '../src/lib/fulfillment.ts';
import { applySellerPart, mutateOrder, orderById } from '../src/lib/orders.ts';
import { freshStore, makeOrder } from './helpers.ts';

freshStore();

async function shipped(phone?: string) {
  const o = await makeOrder({ phone });
  for (const s of ['s1', 's2', 's3']) {
    await mutateOrder(o.id, (x) => applySellerPart(x, s, 'accepted'));
    await shipSellerPart(o.id, s);
  }
  return (await orderById(o.id))!;
}

test('COD split: couriers collect exactly the total minus the paid deposit', async () => {
  const o = await makeOrder({ promo: 'SAKINA10' });
  const split = codSplit(o);
  const collected = Object.values(split).reduce((a, b) => a + b, 0);
  // 1,590 − 100 kit − 149 promo + 65 shipping = 1,406; deposit (65) already paid by InstaPay
  assert.equal(o.quote.total, 1406);
  assert.equal(collected, 1406 - 65);
  assert.ok(split.s1 > split.s2 && split.s1 > split.s3, 'shipping sits on the largest shipment');
  assert.ok(Object.values(split).every((v) => Number.isInteger(v)));
});

test('COD split: prepaid orders collect nothing at the door', async () => {
  assert.deepEqual(Object.values(codSplit(await makeOrder({ payment: 'instapay' }))), [0, 0, 0]);
});

test('Bosta webhook: delivered on every shipment completes the order', async () => {
  const o = await shipped();
  const trackings = Object.values(o.shipments!).map((s) => s.tracking);
  for (const t of trackings) await applyTracking(t, 'picked');
  assert.equal((await orderById(o.id))!.status, 'picked', 'courier pickup marks every part handed');
  await applyTracking(trackings[0], 'delivered');
  assert.equal((await orderById(o.id))!.status, 'picked', 'one of three delivered is not enough');
  await applyTracking(trackings[1], 'delivered');
  const msgs = await applyTracking(trackings[2], 'delivered');
  assert.equal((await orderById(o.id))!.status, 'delivered');
  assert.equal(msgs.length, 3, 'each seller hears about delivery');
  assert.deepEqual(await applyTracking(trackings[2], 'delivered'), [], 'a repeated webhook changes nothing');
});

test('Bosta webhook: a returned shipment marks the order refused and counts the refusal once', async () => {
  const first = await makeOrder({ phone: '01077778888' });
  await recordRefusal('01077778888', first.id);
  const o = await shipped('01077778888');
  await applyTracking(o.shipments!.s2.tracking, 'returned');
  assert.equal((await orderById(o.id))!.status, 'refused');
  assert.ok(await isBlocked('01077778888'), 'second refusal blocks the number everywhere');
  assert.equal(await recordRefusal('01099990001', 5), false);
  assert.equal(await recordRefusal('01099990001', 5), false, 'the same order never counts twice');
});

test('Bosta webhook payload parsing', () => {
  assert.deepEqual(parseWebhook({ trackingNumber: 123, state: 45 }), { tracking: '123', status: 'delivered' });
  assert.deepEqual(parseWebhook({ trackingNumber: '9', state: { code: 46 } }), { tracking: '9', status: 'returned' });
  assert.equal(parseWebhook({ trackingNumber: '9', state: 999 }), null);
  assert.equal(parseWebhook(null), null);
});
