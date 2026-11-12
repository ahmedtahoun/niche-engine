// Admin numbers per product and size: units, revenue, cost, profit, grind split and days of stock left.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverDays, productStats, variantOf } from '../src/lib/product-stats.ts';
import type { Order } from '../src/lib/orders.ts';
import type { Product } from '../src/lib/types.ts';

const p = { id: 'bonds-chrome', slug: 'bonds-chrome', niche: 'coffee', price: 225, variants: [{ label: '250 جم', stock: 12, price: 225 }, { label: '1 كجم', stock: 3, price: 900 }], cost: { '250 جم': 190, '1 كجم': 750 } } as unknown as Product;
const now = Date.parse('2026-11-12T12:00:00Z');
const order = (id: number, status: string, daysAgo: number, variant: string, qty: number, unitPrice: number, unitCost?: number, grind = 'kanaka'): Order => ({
  id, status, createdAt: new Date(now - daysAgo * 864e5).toISOString(),
  items: [{ sellerId: 'bonds', productId: 'bonds-chrome', name: 'x', variant, qty, unitPrice, ...(unitCost === undefined ? {} : { unitCost }) }],
  cart: [{ kind: 'item', slug: 'bonds-chrome', variant: variant.split(' · ')[0], qty, choice: { grind } }],
} as unknown as Order);

test('the order option is matched to the product size, grind included or not', () => {
  assert.equal(variantOf(p, '250 جم · كنكة (تركي)'), '250 جم');
  assert.equal(variantOf(p, '1 كجم'), '1 كجم');
});

test('sold, revenue, profit, recent window and grind split', () => {
  const s = productStats([p], [
    order(1, 'delivered', 2, '250 جم · كنكة (تركي)', 2, 225, 190),
    order(2, 'confirmed', 5, '1 كجم · حبوب كاملة', 1, 900, undefined, 'beans'), // no saved cost: today's cost
    order(3, 'delivered', 45, '250 جم', 1, 225, 180, 'filter'), // older than 30 days
    order(4, 'cancelled', 1, '250 جم', 5, 225, 190), // never counted
    order(5, 'refused', 3, '250 جم', 1, 225, 190),
  ], now)['bonds-chrome'];
  assert.deepEqual(s.all, { units: 4, revenue: 225 * 2 + 900 + 225, cost: 380 + 750 + 180, profit: 70 + 150 + 45, costedRevenue: 225 * 2 + 900 + 225, noCost: 0, orders: 3 });
  assert.equal(s.recent.units, 3);
  assert.equal(s.recent.profit, 70 + 150);
  assert.equal(s.byVariant['250 جم'].all.units, 3);
  assert.equal(s.byVariant['1 كجم'].recent.revenue, 900);
  assert.equal(s.delivered, 3);
  assert.equal(s.refused, 1);
  assert.deepEqual(s.choices, { kanaka: 2, beans: 1, filter: 1 });
  assert.equal(s.daily.reduce((a, b) => a + b, 0), 3);
  assert.equal(s.daily[29 - 2], 2, 'two days ago');
});

test('days of stock left at the 30-day pace', () => {
  assert.equal(coverDays(12, 6), 60);
  assert.equal(coverDays(3, 0), null);
});

test('units without a buying price never count as profit', () => {
  const bare = { ...p, cost: undefined } as unknown as Product;
  const s = productStats([bare], [order(1, 'delivered', 1, '250 جم', 2, 225)], now)['bonds-chrome'];
  assert.equal(s.all.revenue, 450);
  assert.equal(s.all.profit, 0);
  assert.equal(s.all.noCost, 2);
});
