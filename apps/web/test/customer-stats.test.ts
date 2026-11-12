// Admin customers: rolled up from orders by phone, with spend, favourites and refusals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customers } from '../src/lib/customer-stats.ts';
import type { Order } from '../src/lib/orders.ts';

const order = (id: number, phone: string, status: string, total: number, day: number, item = 'قهوة كروم بلند', grind = 'kanaka'): Order => ({
  id, status, createdAt: `2026-11-${String(day).padStart(2, '0')}T10:00:00Z`, quote: { total } as Order['quote'],
  customer: { name: `عميل ${phone.slice(-2)} ${day}`, phone, governorate: 'القاهرة', area: 'المعادي', address: 'شارع 9', landmark: '' },
  items: [{ sellerId: 'bonds', productId: 'x', name: item, variant: '250 جم', qty: 1, unitPrice: total }],
  cart: [{ kind: 'item', slug: 'x', variant: '250 جم', qty: 1, choice: { grind } }],
} as unknown as Order);

test('one row per phone: purchases, spend, refusals, latest name, favourites', () => {
  const rows = customers([
    order(1, '01011111111', 'delivered', 325, 1),
    order(2, '01011111111', 'confirmed', 600, 5, 'إثيوبيا جوجي', 'filter'),
    order(3, '01011111111', 'cancelled', 999, 6),
    order(4, '01011111111', 'delivered', 325, 8),
    order(5, '01022222222', 'refused', 450, 3),
  ], (p) => `k${p.slice(-2)}`);
  const a = rows.find((r) => r.phone === '01011111111')!;
  assert.equal(a.key, 'k11');
  assert.equal(a.orders, 3, 'cancelled is not a purchase');
  assert.equal(a.spent, 325 + 600 + 325);
  assert.equal(a.delivered, 2);
  assert.equal(a.cancelled, 1);
  assert.equal(a.name, 'عميل 11 8', 'the latest name and address');
  assert.deepEqual(a.favorite, { name: 'قهوة كروم بلند', units: 2 });
  assert.deepEqual(a.topChoice, { value: 'kanaka', units: 2 });
  assert.deepEqual(a.orderIds, [4, 3, 2, 1], 'newest first');
  const b = rows.find((r) => r.phone === '01022222222')!;
  assert.equal(b.orders, 0);
  assert.equal(b.refused, 1);
  assert.equal(b.spent, 0);
});
