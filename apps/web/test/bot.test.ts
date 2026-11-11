import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approveProduct, approveSeller, handle, notifyOrder, sellerByChat } from '../src/bot/engine.ts';
import { bundleProblems, quote } from '../src/lib/catalog.ts';
import { PRODUCTS } from '../src/lib/demo-data.ts';
import { getNiche } from '../src/lib/niches.ts';
import { saveOrder, setStatus } from '../src/lib/orders.ts';
import type { Outgoing } from '../src/bot/types.ts';
import { settleShipments } from '../src/lib/fulfillment.ts';

const umrah = getNiche('umrah')!;
const say = (chatId: number, text: string) => handle({ chatId, text });
const tap = (chatId: number, data: string) => handle({ chatId, data });
const last = (o: Outgoing[]) => o.at(-1)!;
const customer = { name: 'منى عبد الرحمن', phone: '01012345678', governorate: 'القاهرة', area: 'مدينة نصر', address: '14 شارع الطيران', landmark: '' };

function placeKitOrder() {
  const cart = [{ kind: 'bundle' as const, id: 'umrah_kit_women', variant: '2', qty: 1 }];
  const o = saveOrder({ niche: 'umrah', status: 'awaiting_confirm', type: 'new', payment: 'cod', customer, cart, quote: quote(umrah, cart, { isFirstOrder: true, walletBalance: 0, useWallet: false }) });
  return setStatus('umrah', o.id, ['awaiting_confirm'], 'confirmed')!;
}

test('a new seller applies in 9 steps and is approved', () => {
  const chat = 7777;
  assert.match(last(say(chat, '/start')).text, /ابدأ التقديم|5 دقايق/);
  assert.match(last(tap(chat, 'ap:start')).text, /بتبيع إيه/);
  tap(chat, 'ap:v:umrah');
  say(chat, 'نور للخمارات');
  assert.match(last(say(chat, 'not a handle!!')).text, /instagram|الإنستجرام/i, 'bad handle is asked again');
  say(chat, '@nour.khimar');
  tap(chat, 'ap:v:القاهرة');
  say(chat, 'المعادي');
  assert.match(last(say(chat, 'مفيش صور')).text, /صور/);
  handle({ chatId: chat, photos: 3 });
  tap(chat, 'ap:v:10-25');
  assert.match(last(say(chat, '0123')).text, /11 رقم|إنستاباي/);
  assert.match(last(say(chat, '01011112222')).text, /الاتفاق/);
  assert.match(last(tap(chat, 'ap:v:agree')).text, /للمراجعة/);
  const s = sellerByChat(chat)!;
  assert.equal(s.status, 'applied');
  assert.equal(s.instapay, '01011112222');
  assert.match(last(say(chat, 'أي حاجة')).text, /بيتراجع/);
  const welcome = approveSeller(s.id);
  assert.equal(sellerByChat(chat)!.status, 'active');
  assert.ok(welcome[0].keyboard, 'approved seller gets the menu');
});

test('every bundle part maps to a real product and size', () => {
  assert.deepEqual(bundleProblems(umrah), []);
  assert.deepEqual(bundleProblems(getNiche('coffee')!), []);
});

test('a menu button leaves an unfinished wizard', () => {
  say(1003, '➕ منتج جديد');
  assert.match(last(say(1003, '📊 أرقامي')).text, /آخر 7 أيام/);
});

test('a confirmed kit order reaches all 3 sellers without the customer phone', () => {
  const o = placeKitOrder();
  const msgs = notifyOrder(o);
  assert.deepEqual(msgs.map((m) => m.chatId).sort(), [1001, 1002, 1003]);
  for (const m of msgs) {
    assert.ok(!m.text.includes(customer.phone), 'phone never in seller chat');
    assert.match(m.text, /نصيبك/);
  }
  // Sara: 850 at 18% → 697 share
  assert.match(msgs.find((m) => m.chatId === 1001)!.text, /697 ج/);
});

test('order status moves forward only when every seller has handed over', async () => {
  const o = placeKitOrder();
  for (const chat of [1001, 1002, 1003]) {
    assert.match(last(tap(chat, `acc:${o.id}`)).text, /البوليصة/);
  }
  await settleShipments();
  assert.deepEqual(Object.keys(o.shipments ?? {}).sort(), ['s1', 's2', 's3'], 'one Bosta shipment per seller');
  assert.ok(Object.values(o.shipments!).every((sh) => sh.tracking.startsWith('DEMO')));
  assert.equal(o.status, 'accepted');
  assert.match(last(tap(1001, `acc:${o.id}`)).text, /قبل كده/, 'double accept is refused');
  tap(1001, `hand:${o.id}`);
  tap(1002, `hand:${o.id}`);
  assert.equal(o.status, 'accepted');
  tap(1003, `hand:${o.id}`);
  assert.equal(o.status, 'picked');
});

test('rejecting hides the size and flags the order for the team', () => {
  const o = placeKitOrder();
  const out = tap(1002, `rej:${o.id}`);
  assert.equal(o.needsAttention, 'seller_rejected');
  const niqab = PRODUCTS.find((p) => p.slug === 'niqab-with-khimar-black')!;
  assert.equal(niqab.variants[0].stock, 0);
  const restore = out.flatMap((m) => m.buttons?.flat() ?? []).find((b) => b.data.startsWith('stk:'))!;
  tap(1002, restore.data);
  assert.equal(niqab.variants[0].stock, 5);
});

test('a seller adds a product that waits for review, then goes live', () => {
  const chat = 1001;
  assert.match(last(say(chat, '➕ منتج جديد')).text, /أنهي قسم/);
  tap(chat, 'ad:v:abaya');
  handle({ chatId: chat, photos: 3 });
  say(chat, 'عباية كتان — زيتي');
  assert.ok(say(chat, 'غالي').some((m) => /رقم/.test(m.text)), 'non-numeric price is refused');
  say(chat, '750');
  tap(chat, 'ad:v:preset0');
  tap(chat, 'ad:v:5');
  say(chat, 'كتان طبيعي');
  say(chat, 'زيتي');
  say(chat, '1=135، 2=140، 3=145، 4=150');
  say(chat, '140');
  const preview = last(tap(chat, 'ad:v:غير شفاف'));
  assert.match(preview.text, /615 ج/, '750 at 18% → 615 share shown before publishing');
  tap(chat, 'ad:publish');
  const p = PRODUCTS.find((x) => x.nameAr === 'عباية كتان — زيتي')!;
  assert.equal(p.status, 'review');
  assert.deepEqual(p.variants.map((v) => v.label), ['1', '2', '3', '4']);
  assert.match(approveProduct(p.id)[0].text, /اتنشر/);
  assert.equal(p.status, 'live');
});

test('money shows this cycle\'s payout after delivery', () => {
  const o = placeKitOrder();
  for (const chat of [1001, 1002, 1003]) { tap(chat, `acc:${o.id}`); tap(chat, `hand:${o.id}`); }
  setStatus('umrah', o.id, ['picked'], 'delivered');
  const text = last(say(1001, '💰 فلوسي')).text;
  assert.match(text, /مستحق/);
  assert.match(text, /عمولة/);
});
