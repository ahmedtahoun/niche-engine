import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBlocked, recordRefusal } from '../src/lib/blocklist.ts';
import { parseWebhook } from '../src/lib/bosta.ts';
import { quote } from '../src/lib/catalog.ts';
import { PRODUCTS, SELLERS } from '../src/lib/demo-data.ts';
import { setFlusher, take } from '../src/lib/dirty.ts';
import { applyTracking, codSplit, settleShipments, shipSellerPart } from '../src/lib/fulfillment.ts';
import { getNiche } from '../src/lib/niches.ts';
import { saveOrder, setSellerPart, setStatus, type Order } from '../src/lib/orders.ts';
import { orderToRow, productToRow, rowToOrder, rowToProduct, rowToSeller, sellerToRow } from '../src/lib/persist.ts';

const umrah = getNiche('umrah')!;
const customer = { name: 'هبة سامي', phone: '01055556666', governorate: 'الإسكندرية', area: 'سموحة', address: '5 شارع فوزي معاذ', landmark: 'جنب الصيدلية' };

function kitOrder(payment: 'cod' | 'instapay' = 'cod', promo?: string): Order {
  const cart = [{ kind: 'bundle' as const, id: 'umrah_kit_women', variant: '2', qty: 1 }];
  const q = quote(umrah, cart, { promoCode: promo, isFirstOrder: true, walletBalance: 0, useWallet: false });
  const o = saveOrder({ niche: 'umrah', status: 'awaiting_confirm', type: 'new', payment, customer, cart, quote: q });
  return setStatus('umrah', o.id, ['awaiting_confirm'], 'confirmed')!;
}

test('COD split: couriers collect exactly the total minus the paid deposit', () => {
  const o = kitOrder('cod', 'SAKINA10');
  const split = codSplit(o);
  const collected = Object.values(split).reduce((a, b) => a + b, 0);
  // 1,590 − 100 kit − 149 promo + 65 shipping = 1,406; deposit (65) already paid by InstaPay
  assert.equal(o.quote.total, 1406);
  assert.equal(collected, 1406 - 65);
  assert.ok(split.s1 > split.s2 && split.s1 > split.s3, 'shipping sits on the largest shipment');
  assert.ok(Object.values(split).every((v) => Number.isInteger(v)));
});

test('COD split: prepaid orders collect nothing at the door', () => {
  assert.deepEqual(Object.values(codSplit(kitOrder('instapay'))), [0, 0, 0]);
});

test('Bosta webhook: delivered on every shipment completes the order', async () => {
  const o = kitOrder();
  for (const s of ['s1', 's2', 's3']) { setSellerPart(o, s, 'accepted'); await shipSellerPart(o, s); }
  const trackings = Object.values(o.shipments!).map((s) => s.tracking);
  for (const t of trackings) applyTracking(t, 'picked');
  assert.equal(o.status, 'picked', 'courier pickup marks every part handed');
  applyTracking(trackings[0], 'delivered');
  assert.equal(o.status, 'picked', 'one of three delivered is not enough');
  applyTracking(trackings[1], 'delivered');
  const msgs = applyTracking(trackings[2], 'delivered');
  assert.equal(o.status, 'delivered');
  assert.equal(msgs.length, 3, 'each seller hears about delivery');
});

test('Bosta webhook: a returned shipment marks the order refused and counts the refusal', async () => {
  const o = kitOrder();
  o.customer.phone = '01077778888';
  for (const s of ['s1', 's2', 's3']) { setSellerPart(o, s, 'accepted'); await shipSellerPart(o, s); }
  recordRefusal('01077778888');
  applyTracking(o.shipments!.s2.tracking, 'returned');
  assert.equal(o.status, 'refused');
  assert.ok(isBlocked('01077778888'), 'second refusal blocks the number everywhere');
});

test('Bosta webhook payload parsing', () => {
  assert.deepEqual(parseWebhook({ trackingNumber: 123, state: 45 }), { tracking: '123', status: 'delivered' });
  assert.deepEqual(parseWebhook({ trackingNumber: '9', state: { code: 46 } }), { tracking: '9', status: 'returned' });
  assert.equal(parseWebhook({ trackingNumber: '9', state: 999 }), null);
  assert.equal(parseWebhook(null), null);
});

test('database rows round-trip without losing data', async () => {
  for (const s of SELLERS) assert.deepEqual(rowToSeller(sellerToRow(s)), s);
  for (const p of PRODUCTS) {
    const back = rowToProduct(productToRow(p));
    assert.deepEqual({ ...back, priceConfirmedAt: undefined, status: undefined }, { ...p, priceConfirmedAt: undefined, status: undefined });
  }
  const o = kitOrder();
  await settleShipments();
  const back = rowToOrder(orderToRow(o), { ...o.customer });
  assert.deepEqual(back, o);
});

test('changes are tracked for the database only when one is connected', () => {
  take('order');
  kitOrder();
  assert.deepEqual(take('order'), [], 'no database: nothing tracked');
  setFlusher(async () => {});
  const o = kitOrder();
  assert.ok(take('order').includes(String(o.id)));
  setFlusher(null);
});
