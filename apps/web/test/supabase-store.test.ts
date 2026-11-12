// The production store against real Postgres (PGlite) with both migrations applied.
// Runs in its own process (node --test isolates files).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startFakeSupabase } from './postgrest-fake.ts';

process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
const fake = await startFakeSupabase();
globalThis.fetch = fake.fetch;

const { SupabaseStore } = await import('../src/lib/store/supabase.ts');
const { setStore, store } = await import('../src/lib/store/index.ts');
const { catalog, invalidateCatalog } = await import('../src/lib/catalog.ts');
const { PRODUCTS, SELLERS } = await import('../src/lib/demo-data.ts');
const { allNiches } = await import('../src/lib/niches.ts');
const { handle } = await import('../src/bot/engine.ts');
const { applyTracking, settleShipments } = await import('../src/lib/fulfillment.ts');
const { orderById } = await import('../src/lib/orders.ts');
const { walletOf, adjust } = await import('../src/lib/wallet.ts');
const { recordRefusal, isBlocked, blockedList } = await import('../src/lib/blocklist.ts');
const { createAccount, signIn, saveAddress, accountByPhone } = await import('../src/lib/customers.ts');
const { markPaid } = await import('../src/lib/payouts.ts');
const { makeOrder, CUSTOMER } = await import('./helpers.ts');

setStore(new SupabaseStore());
invalidateCatalog();
const s = store();
await s.syncNiches(Object.values(allNiches()).map((c) => ({ id: c.id, status: c.status, config: c })));
for (const x of SELLERS) await s.saveSeller(x);
for (const p of PRODUCTS) await s.saveProduct(p);
// Orders reference a customer row.
await createAccount(CUSTOMER.phone, CUSTOMER.name, 'secret12');

test('catalog: sellers and products come back from Postgres unchanged', async () => {
  const cat = await catalog();
  assert.equal(cat.sellers.length, SELLERS.length);
  assert.deepEqual(cat.sellerById('s1'), SELLERS.find((x) => x.id === 's1'));
  const p = PRODUCTS[0];
  assert.deepEqual({ ...cat.productById(p.id)!, priceConfirmedAt: undefined }, { ...p, priceConfirmedAt: undefined, status: p.status ?? 'live' });
});

test('catalog: product photos are saved and read back', async () => {
  const p = { ...PRODUCTS[0], id: 'withphotos', slug: 'with-photos', images: ['https://x/1.jpg', 'https://x/2.jpg'] };
  await s.saveProduct(p);
  invalidateCatalog();
  assert.deepEqual((await catalog()).productById('withphotos')?.images, p.images);
  assert.deepEqual(await s.missingMigrations(), [], 'all migrations applied');
});

test('orders: the database numbers them from 1001 and keeps the delivery details', async () => {
  const o = await makeOrder();
  assert.ok(o.id >= 1001);
  assert.equal(o.version, 0);
  const back = (await orderById(o.id))!;
  assert.deepEqual(back, o);
  assert.equal(back.customer.address, CUSTOMER.address);
  const lines = await fake.db.query<{ n: number }>('select count(*)::int as n from order_items where order_id = $1', [o.id]);
  assert.equal(lines.rows[0].n, 3, 'one line per kit part');
});

test('orders: an update based on an old copy is refused', async () => {
  const o = await makeOrder();
  const first = await s.updateOrder({ ...o, needsAttention: 'x' });
  assert.equal(first?.version, 1);
  assert.equal(await s.updateOrder({ ...o, needsAttention: 'y' }), null, 'version 0 is stale now');
});

test('two sellers tapping at once: every accept is kept, one waybill each', async () => {
  const { id } = await makeOrder();
  await Promise.all([1001, 1002, 1003].map((chat) => handle({ chatId: chat, data: `acc:${id}` })));
  await settleShipments();
  const o = (await orderById(id))!;
  assert.deepEqual(Object.values(o.sellerState), ['accepted', 'accepted', 'accepted']);
  assert.equal(o.status, 'accepted');
  assert.deepEqual(Object.keys(o.shipments ?? {}).sort(), ['s1', 's2', 's3']);
});

test('the same seller tapping accept twice at once: one wins', async () => {
  const { id } = await makeOrder();
  const replies = await Promise.all([handle({ chatId: 1001, data: `acc:${id}` }), handle({ chatId: 1001, data: `acc:${id}` })]);
  await settleShipments();
  assert.equal(replies.filter((r) => /البوليصة/.test(r.at(-1)!.text)).length, 1);
  assert.equal(Object.keys((await orderById(id))!.shipments ?? {}).length, 1);
});

test('Bosta: delivered on every shipment completes the order and pays cashback once', async () => {
  const { id } = await makeOrder();
  for (const chat of [1001, 1002, 1003]) await handle({ chatId: chat, data: `acc:${id}` });
  await settleShipments();
  const trackings = Object.values((await orderById(id))!.shipments!).map((x) => x.tracking);
  assert.equal((await s.listOrders({ tracking: trackings[1] }))[0]?.id, id, 'tracking number lookup');
  const before = (await walletOf(CUSTOMER.phone, 'umrah')).balance;
  for (const t of trackings) await applyTracking(t, 'delivered');
  for (const t of trackings) await applyTracking(t, 'delivered');
  assert.equal((await orderById(id))!.status, 'delivered');
  assert.equal((await walletOf(CUSTOMER.phone, 'umrah')).balance - before, 59, 'one cashback despite repeated webhooks');
});

test('wallet: two checkouts with the same balance: one is refused and saves nothing', async () => {
  const phone = '01020000001';
  await createAccount(phone, 'x', 'secret12');
  await adjust(phone, 'umrah', 100, 'test');
  const w = await walletOf(phone, 'umrah');
  const cart = [{ kind: 'item' as const, slug: 'two-layer-niqab-black', variant: 'مقاس واحد', qty: 1 }];
  const q = (await catalog()).quote(allNiches().umrah, cart, { isFirstOrder: false, walletBalance: 100, useWallet: true });
  const draft = { niche: 'umrah', status: 'confirmed' as const, type: 'repeat' as const, payment: 'cod' as const, cart, quote: q, items: q.items, sellerState: { s2: 'pending' as const }, customer: { ...CUSTOMER, phone } };
  const r = await Promise.all([s.createOrder(draft, { amount: 100, walletVersion: w.version }), s.createOrder(draft, { amount: 100, walletVersion: w.version })]);
  assert.equal(r.filter((x) => x === 'wallet_conflict').length, 1);
  assert.equal((await walletOf(phone, 'umrah')).balance, 0);
  assert.equal((await s.listOrders({ phone })).length, 1, 'the refused checkout left no order behind');
});

test('accounts: create once, wrong-password limit shared through the database', async () => {
  await assert.rejects(() => createAccount(CUSTOMER.phone, 'x', 'y'), /exists/);
  await saveAddress(CUSTOMER.phone, { name: 'منى', governorate: 'الجيزة', area: 'الدقي', address: '3 ش التحرير', landmark: '' });
  assert.equal((await accountByPhone(CUSTOMER.phone))!.governorate, 'الجيزة');
  for (let i = 0; i < 5; i++) assert.equal(await signIn(CUSTOMER.phone, 'bad'), 'wrong');
  assert.equal(await signIn(CUSTOMER.phone, 'secret12'), 'locked');
});

test('trust: refusals count once per order; two block the phone', async () => {
  const a = await makeOrder();
  const b = await makeOrder();
  await recordRefusal('01030000001', a.id);
  await recordRefusal('01030000001', a.id);
  assert.equal(await isBlocked('01030000001'), false, 'the same order twice is one refusal');
  await recordRefusal('01030000001', b.id);
  assert.equal(await isBlocked('01030000001'), true);
  assert.deepEqual((await blockedList()).map((x) => x.phone), ['01030000001']);
});

test('payouts: one per seller per cycle', async () => {
  const r = await Promise.all([markPaid('s1', 300), markPaid('s1', 300)]);
  assert.deepEqual(r.sort(), [false, true]);
});

test('bot: flow state and Telegram retries live in the database', async () => {
  await handle({ chatId: 9999, text: '/start' });
  await handle({ chatId: 9999, data: 'ap:start' });
  assert.equal((await s.getBotSession<{ flow: string }>(9999))?.flow, 'apply');
  await handle({ chatId: 9999, text: '/cancel' });
  assert.equal(await s.getBotSession(9999), null);
  assert.equal(await s.claimTelegramUpdate(42), true);
  assert.equal(await s.claimTelegramUpdate(42), false, 'a resent update is ignored');
});

test('the public key cannot call the money functions', async () => {
  const r = await fake.db.query<{ ok: boolean }>("select has_function_privilege('anon', 'place_order(jsonb, jsonb, numeric, int)', 'execute') as ok");
  assert.equal(r.rows[0].ok, false);
  const w = await fake.db.query<{ ok: boolean }>("select has_function_privilege('service_role', 'wallet_append(text, text, int, jsonb)', 'execute') as ok");
  assert.equal(w.rows[0].ok, true);
});

test('products: one never ordered can be deleted; the database refuses one that orders refer to', async () => {
  const lone = { ...structuredClone(PRODUCTS[0]), id: 'tmp-delete-me', slug: 'tmp-delete-me' };
  await s.saveProduct(lone);
  await s.deleteProduct('tmp-delete-me');
  assert.equal((await s.listProducts()).some((p) => p.id === 'tmp-delete-me'), false, 'gone');
  const ordered = PRODUCTS[0];
  await makeOrder({ cart: [{ kind: 'item', slug: ordered.slug, variant: ordered.variants.find((v) => v.stock > 0)!.label, qty: 1 }] });
  await assert.rejects(() => s.deleteProduct(ordered.id), 'order history keeps the product');
  assert.ok((await s.listProducts()).some((p) => p.id === ordered.id));
});

test('sellers: one with no products or orders can be deleted; the database refuses one with products', async () => {
  await s.saveSeller({ id: 'tmp-seller', niche: 'umrah', name: 'تجربة', area: 'القاهرة', rating: 0, status: 'active' });
  await s.deleteSeller('tmp-seller');
  assert.equal((await s.listSellers()).some((x) => x.id === 'tmp-seller'), false, 'gone');
  await assert.rejects(() => s.deleteSeller(SELLERS[0].id), 'products and orders keep their seller');
  assert.ok((await s.listSellers()).some((x) => x.id === SELLERS[0].id));
});
