// Runs in its own process (node --test isolates files): fakes the Supabase REST API.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

const calls: { method: string; path: string; body: unknown; prefer?: string }[] = [];
const tables: Record<string, unknown[]> = {
  sellers: [{ id: 'x1', niche_id: 'umrah', store_name: 'متجر حقيقي', telegram_chat_id: 555000111, instagram: '@real', area: 'المعادي', instapay: '01012345678', capacity: '10-25', bosta_location_id: 'loc_1', status: 'active', rating: 4.5 }],
  products: [], orders: [], customers: [], blocklist: [], payouts: [],
};
globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const table = url.pathname.split('/').pop()!;
  const headers = init?.headers as Record<string, string>;
  assert.equal(headers.apikey, 'service-key');
  calls.push({ method: init?.method ?? 'GET', path: `${table}${url.search}`, body: init?.body ? JSON.parse(String(init.body)) : null, prefer: headers.Prefer });
  if ((init?.method ?? 'GET') === 'GET') return new Response(JSON.stringify(url.searchParams.get('offset') === '0' ? tables[table] ?? [] : []), { status: 200 });
  return new Response(null, { status: 201 });
}) as typeof fetch;

const { hydrate } = await import('../src/lib/persist.ts');
const { SELLERS, PRODUCTS } = await import('../src/lib/demo-data.ts');
const { flushNow } = await import('../src/lib/dirty.ts');
const { saveOrder } = await import('../src/lib/orders.ts');

test('startup loads real data and replaces the demo catalog', async () => {
  await hydrate();
  assert.ok(calls.some((c) => c.method === 'POST' && c.path.startsWith('niches?on_conflict=id')), 'niche settings mirrored');
  assert.deepEqual(SELLERS.map((s) => s.id), ['x1']);
  assert.equal(SELLERS[0].bostaLocationId, 'loc_1');
  assert.equal(PRODUCTS.length, 0, 'no demo products in a real store');
});

test('a new order is written to customers, orders and order_items in that order', async () => {
  calls.length = 0;
  PRODUCTS.push({ id: 'pp1', niche: 'umrah', slug: 'real-abaya', sellerId: 'x1', category: 'abaya', art: 'abaya', color: '#ccc', nameAr: 'عباية', leadAr: '', price: 900, attributes: {}, variants: [{ label: '2', stock: 3 }], status: 'live', views: 0, reviews: [], faq: [] });
  const quote = { lines: [], items: [{ sellerId: 'x1', productId: 'pp1', name: 'عباية', variant: '2', qty: 1, unitPrice: 900 }], subtotal: 900, bundleDiscount: 0, promoDiscount: 0, wallet: 0, shipping: 65, total: 965, depositRequired: false, deposit: 0, problems: [] };
  const o = saveOrder({ niche: 'umrah', status: 'awaiting_confirm', type: 'new', payment: 'cod', cart: [{ kind: 'item', slug: 'real-abaya', variant: '2', qty: 1 }], quote, customer: { name: 'منى', phone: '01012345678', governorate: 'القاهرة', area: 'مدينة نصر', address: '14 ش الطيران', landmark: '' } });
  await flushNow();
  const writes = calls.filter((c) => c.method === 'POST').map((c) => c.path.split('?')[0]);
  assert.deepEqual(writes, ['customers', 'orders', 'order_items']);
  const orderRow = calls.find((c) => c.path.startsWith('orders'))!;
  assert.equal(orderRow.prefer, 'resolution=merge-duplicates,return=minimal');
  assert.equal((orderRow.body as { id: number }[])[0].id, o.id);
  assert.equal((orderRow.body as { total: number }[])[0].total, 965);
});
