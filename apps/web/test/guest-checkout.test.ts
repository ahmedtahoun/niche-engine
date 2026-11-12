// Guest checkout: a guest opens only the order their own browser placed; a resend returns the first order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readGuestOrder, signGuestOrder } from '../src/lib/session.ts';
import { DUPLICATE_WINDOW_MS, findDuplicate, type Order } from '../src/lib/orders.ts';

test('a guest order token opens that order only', () => {
  const token = signGuestOrder(41);
  assert.equal(readGuestOrder(41, token), true);
  assert.equal(readGuestOrder(42, token), false, 'not another order');
  assert.equal(readGuestOrder(41, undefined), false);
  assert.equal(readGuestOrder(41, token.slice(0, -2) + 'xx'), false, 'a changed token is refused');
});

const customer = { name: 'منى أحمد', phone: '01012345678', governorate: 'القاهرة', area: 'المعادي', address: 'شارع 9، عمارة 4', landmark: '' };
const cart = [{ kind: 'item' as const, slug: 'bonds-chrome', variant: '250 جم', qty: 1, choice: { grind: 'beans' } }];
const order = (o: Partial<Order>): Order => ({ id: 7, niche: 'coffee', status: 'confirmed', createdAt: new Date(1_000_000).toISOString(), customer, cart, ...o } as Order);

test('the same cart and address from the same phone within two minutes is the same order', () => {
  const now = 1_000_000 + 30_000;
  assert.equal(findDuplicate([order({})], { cart, customer }, now)?.id, 7);
  assert.equal(findDuplicate([order({})], { cart, customer }, 1_000_000 + DUPLICATE_WINDOW_MS + 1), null, 'later: a new order');
  assert.equal(findDuplicate([order({ status: 'cancelled' })], { cart, customer }, now), null, 'a cancelled order does not count');
  assert.equal(findDuplicate([order({})], { cart: [{ ...cart[0], qty: 2 }], customer }, now), null, 'a different cart is a new order');
  assert.equal(findDuplicate([order({})], { cart, customer: { ...customer, address: 'شارع 10' } }, now), null, 'a different address is a new order');
});
