// Stock follows orders, and the order source is stored and read back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stockChanges } from '../src/lib/stock.ts';
import { orderToRow, rowToOrder } from '../src/lib/store/rows.ts';
import { BONDS_PRODUCTS } from '../src/lib/seeds/bonds.ts';
import type { Order } from '../src/lib/orders.ts';

const item = (productId: string, variant: string, qty: number) => ({ sellerId: 'bonds', productId, name: 'x', variant, qty, unitPrice: 1 });

test('an order takes stock per size (grind in the label or not), and returning puts it back', () => {
  const products = structuredClone(BONDS_PRODUCTS);
  const taken = stockChanges(products, [item('bonds-chrome', '250 جم · كنكة (تركي)', 2), item('bonds-chrome', '1 كجم', 1), item('bonds-amber', '250 جم', 25)], -1);
  const chrome = taken.find((p) => p.id === 'bonds-chrome')!;
  assert.deepEqual(chrome.variants.map((v) => v.stock), [18, 19]);
  assert.equal(taken.find((p) => p.id === 'bonds-amber')!.variants[0].stock, 0, 'never below zero');
  assert.equal(products.find((p) => p.id === 'bonds-chrome')!.variants[0].stock, 20, 'the originals are untouched');
  const back = stockChanges(taken, [item('bonds-chrome', '250 جم · كنكة (تركي)', 2)], 1);
  assert.equal(back[0].variants[0].stock, 20);
});

test('the order source is kept inside the customer column and read back', () => {
  const o = { id: 1, niche: 'coffee', status: 'confirmed', type: 'new', payment: 'cod', createdAt: '2026-11-12T10:00:00Z', version: 0, source: 'whatsapp',
    customer: { name: 'منى', phone: '01012345678', governorate: 'القاهرة', area: 'المعادي', address: 'شارع 9', landmark: '' },
    cart: [], quote: { items: [], total: 0 } as unknown as Order['quote'], items: [], sellerState: {} } as unknown as Order;
  const row = { ...orderToRow(o), id: 1, created_at: o.createdAt };
  assert.equal((row.customer as Record<string, unknown>).source, 'whatsapp');
  const back = rowToOrder(row as never);
  assert.equal(back.source, 'whatsapp');
  assert.deepEqual(back.customer, o.customer, 'the delivery details are unchanged');
  assert.equal(rowToOrder({ ...orderToRow({ ...o, source: undefined }), id: 1, created_at: o.createdAt } as never).source, undefined, 'website orders have no source');
});
