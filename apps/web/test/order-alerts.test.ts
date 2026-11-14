// The team chat hears about every order and every step after it.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ADMIN_TELEGRAM_CHAT_IDS = '111, 222';
const { orderAlert } = await import('../src/bot/alerts.ts');

const o = {
  id: 1005, niche: 'coffee', status: 'confirmed', type: 'new', payment: 'cod', createdAt: '', version: 0, cart: [], sellerState: { bonds: 'pending' },
  customer: { name: 'منى أحمد', phone: '01012345678', governorate: 'الجيزة', area: 'الدقي', address: 'x', landmark: '' },
  items: [{ sellerId: 'bonds', productId: 'bonds-chrome', name: 'قهوة كروم بلند', variant: '250 جم · حبوب كاملة', qty: 2, unitPrice: 300 }],
  quote: { total: 670, shipping: 70, shippingWaived: 0 }, utm: { source: 'instagram', campaign: 'box' },
} as never;

test('a new order goes to every team chat with items, total, customer and where it came from', () => {
  const out = orderAlert(o, 'new');
  assert.deepEqual(out.map((m) => m.chatId), [111, 222]);
  const t = out[0].text;
  assert.match(t, /🛒 طلب جديد #1005 · محمصة القاهرة/);
  assert.match(t, /قهوة كروم بلند · 250 جم · حبوب كاملة × 2/);
  assert.match(t, /670 ج · كاش عند الاستلام/);
  assert.match(t, /منى أحمد · 01012345678 · الجيزة/);
  assert.match(t, /جه من: instagram \/ box/);
  assert.match(t, /https:\/\/cairoroast\.com\/admin\/orders\/1005/);
});

test('each step after that is one short line, with who did it', () => {
  assert.match(orderAlert(o, 'accepted', 'Bonds')[0].text, /✅ البائع قبل الطلب · طلب #1005[\s\S]*\(Bonds\)/);
  assert.match(orderAlert(o, 'delivered')[0].text, /🎉 اتسلم للعميل/);
  assert.match(orderAlert(o, 'refused')[0].text, /رفض الاستلام/);
});

test('no team chat set: no alerts', () => {
  const saved = process.env.ADMIN_TELEGRAM_CHAT_IDS;
  process.env.ADMIN_TELEGRAM_CHAT_IDS = '';
  assert.deepEqual(orderAlert(o, 'new'), []);
  process.env.ADMIN_TELEGRAM_CHAT_IDS = saved;
});

test('team chat numbers: English or Arabic comma, spaces, Arabic digits; junk ignored', async () => {
  const { parseChatIds } = await import('../src/bot/alerts.ts');
  assert.deepEqual(parseChatIds('5770925631،1982483835'), [5770925631, 1982483835]);
  assert.deepEqual(parseChatIds('5770925631, 1982483835'), [5770925631, 1982483835]);
  assert.deepEqual(parseChatIds(' 5770925631 ; -100123 '), [5770925631, -100123]);
  assert.deepEqual(parseChatIds('٥٧٧٠٩٢٥٦٣١'), [5770925631]);
  assert.deepEqual(parseChatIds('abc,,0'), []);
  assert.deepEqual(parseChatIds(undefined), []);
});
