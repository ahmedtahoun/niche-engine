// Admin overview numbers: a period against the one before, daily revenue, funnel, channels, top coffees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboard, delta } from '../src/lib/dashboard.ts';
import type { Order } from '../src/lib/orders.ts';
import type { Product } from '../src/lib/types.ts';

const now = Date.parse('2026-11-30T12:00:00Z');
const p = { id: 'chrome', nameAr: 'كروم', price: 225, variants: [{ label: '250 جم', stock: 9, price: 225 }], cost: { '250 جم': 190 } } as unknown as Product;
const order = (id: number, daysAgo: number, status: string, phone: string, qty: number, source?: string, gov = 'القاهرة'): Order => ({
  id, status, createdAt: new Date(now - daysAgo * 864e5).toISOString(), ...(source ? { source } : {}),
  customer: { name: 'x', phone, governorate: gov, area: '', address: '', landmark: '' },
  items: [{ sellerId: 's', productId: 'chrome', name: 'كروم', variant: '250 جم', qty, unitPrice: 225 }],
  quote: { total: 225 * qty + 100 } as Order['quote'], cart: [],
} as unknown as Order);

test('a 7-day period against the 7 days before it', () => {
  const d = dashboard([
    order(1, 1, 'delivered', '010', 2),
    order(2, 3, 'confirmed', '011', 1, 'whatsapp', 'الجيزة'),
    order(3, 2, 'cancelled', '012', 5),
    order(4, 10, 'delivered', '010', 1), // the week before
    order(5, 5, 'awaiting_confirm', '013', 1),
  ], [p], 7, now);
  assert.equal(d.now.orders, 2);
  assert.equal(d.now.revenue, 550 + 325);
  assert.equal(d.now.profit, 35 * 3);
  assert.equal(d.now.customers, 2);
  assert.equal(d.now.newCustomers, 1, '010 first ordered last week');
  assert.equal(d.before.orders, 1);
  assert.equal(d.before.revenue, 325);
  assert.deepEqual(d.funnel, { placed: 4, reachedSeller: 2, delivered: 1, refused: 0, cancelled: 1 });
  assert.deepEqual(d.sources.map((s) => s.source), ['web', 'whatsapp']);
  assert.equal(d.governorates[0].name, 'القاهرة');
  assert.deepEqual(d.topProducts[0], { id: 'chrome', name: 'كروم', units: 3, revenue: 675, profit: 105 });
  assert.equal(d.daily.length, 7);
  assert.equal(d.daily.reduce((n, x) => n + x.orders, 0), 2);
  assert.equal(Math.round(delta(d.now.revenue, d.before.revenue)! * 100), 169);
  assert.equal(delta(5, 0), null);
});
