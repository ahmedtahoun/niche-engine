import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approveProduct, approveSeller, handle, notifyOrder } from '../src/bot/engine.ts';
import { catalog } from '../src/lib/catalog.ts';
import { getNiche } from '../src/lib/niches.ts';
import { applyStatus, mutateOrder, orderById } from '../src/lib/orders.ts';
import { store } from '../src/lib/store/index.ts';
import type { Outgoing } from '../src/bot/types.ts';
import { settleShipments } from '../src/lib/fulfillment.ts';
import { CUSTOMER, freshStore, makeOrder } from './helpers.ts';

const umrah = getNiche('umrah')!;
const say = (chatId: number, text: string) => handle({ chatId, text });
const tap = (chatId: number, data: string) => handle({ chatId, data });
const last = (o: Outgoing[]) => o.at(-1)!;
const sellerByChat = async (chat: number) => (await catalog()).sellerByChat(chat);

freshStore();

test('a new seller applies with owner, contact, logo and pickup address, and is approved', async () => {
  const chat = 7777;
  assert.match(last(await say(chat, '/start')).text, /ابدأ التقديم|5 دقايق/);
  assert.match(last(await tap(chat, 'ap:start')).text, /1\/11 · اسم المتجر/, 'one niche: no niche question');
  assert.match(last(await say(chat, 'نور للخمارات')).text, /اسمك/);
  const phoneQ = last(await say(chat, 'نور'));
  assert.match(phoneQ.text, /رقم موبايل/);
  assert.equal(phoneQ.askContact, '📱 ابعت رقمي', 'one-tap share-number button');
  const logoQ = last(await handle({ chatId: chat, contact: '201011112222' }));
  assert.match(logoQ.text, /لوجو/);
  assert.equal(logoQ.removeKeyboard, true, 'the share button goes away');
  assert.match((await tap(chat, 'ap:v:capacity:10-25'))[0].text, /سؤال قديم/, 'a button from another question is refused');
  assert.match(last(await tap(chat, 'ap:v:logo:skip')).text, /الإنستجرام/);
  assert.match((await say(chat, 'not a handle!!'))[0].text, /اليوزر/, 'bad handle is asked again');
  assert.match(last(await say(chat, 'https://www.instagram.com/nour.khimar/')).text, /محافظتك/);
  assert.match(last(await tap(chat, 'ap:v:governorate:القاهرة')).text, /عنوان الاستلام/);
  assert.match((await say(chat, 'المعادي'))[0].text, /بالتفصيل/, 'a short address is asked again');
  await say(chat, 'المعادي، شارع 9، عمارة 12، الدور 3');
  assert.match(last(await say(chat, 'مفيش صور')).text, /صور/);
  await handle({ chatId: chat, photos: 1, photoIds: ['s1'] });
  assert.deepEqual(await handle({ chatId: chat, photos: 1, photoIds: ['s2'] }), [], 'the rest of an album is kept quietly');
  const instapayQ = last(await tap(chat, 'ap:v:capacity:10-25'));
  assert.ok(instapayQ.buttons?.flat().some((b) => b.data === 'ap:v:instapay:same'), 'offers the same number for InstaPay');
  assert.match(last(await tap(chat, 'ap:v:instapay:same')).text, /الاتفاق/);
  assert.match(last(await tap(chat, 'ap:v:agree:yes')).text, /للمراجعة/);
  const s = (await sellerByChat(chat))!;
  assert.equal(s.status, 'applied');
  assert.equal(s.ownerName, 'نور');
  assert.equal(s.contactPhone, '01011112222');
  assert.equal(s.instapay, '01011112222');
  assert.equal(s.instagram, '@nour.khimar');
  assert.equal(s.governorate, 'القاهرة');
  assert.equal(s.pickupAddress, 'المعادي، شارع 9، عمارة 12، الدور 3');
  assert.equal(await store().getBotSession(chat), null, 'finished flow is cleared from the database');
  assert.match(last(await say(chat, 'أي حاجة')).text, /بيتراجع/);
  const welcome = await approveSeller(s.id);
  assert.equal((await sellerByChat(chat))!.status, 'active');
  assert.ok(welcome[0].keyboard, 'approved seller gets the menu');
});

test('one-size product: no size chart question', async () => {
  const chat = 1002;
  await say(chat, '➕ منتج جديد');
  await tap(chat, 'ad:v:category:niqab');
  await handle({ chatId: chat, photos: 1, photoIds: ['n1'] });
  await say(chat, 'نقاب سادة');
  await tap(chat, 'ad:v:description:skip');
  await say(chat, '300');
  await tap(chat, 'ad:v:variants:preset1');
  await tap(chat, 'ad:v:colors:one');
  await tap(chat, 'ad:v:stock:5');
  const session = await store().getBotSession<{ attrs: string[] }>(chat);
  assert.ok(session && !session.attrs.includes('size_chart_cm'));
  await say(chat, '/cancel');
});

test('the flow survives a restart: its step is stored, not kept in memory', async () => {
  await say(1003, '➕ منتج جديد');
  assert.equal((await store().getBotSession<{ flow: string }>(1003))?.flow, 'add');
  await tap(1003, 'ad:v:category:hijab');
  assert.equal((await store().getBotSession<{ step: number }>(1003))?.step, 1);
  await say(1003, '/cancel');
});

test('every bundle part maps to a real product and size', async () => {
  const cat = await catalog();
  assert.deepEqual(cat.bundleProblems(umrah), []);
});

test('a menu button leaves an unfinished wizard', async () => {
  await say(1003, '➕ منتج جديد');
  assert.match(last(await say(1003, '📊 أرقامي')).text, /آخر 7 أيام/);
  assert.equal(await store().getBotSession(1003), null);
});

test('a confirmed kit order reaches all 3 sellers without the customer phone', async () => {
  const o = await makeOrder();
  const msgs = notifyOrder(o, await catalog());
  assert.deepEqual(msgs.map((m) => m.chatId).sort(), [1001, 1002, 1003]);
  for (const m of msgs) {
    assert.ok(!m.text.includes(CUSTOMER.phone), 'phone never in seller chat');
    assert.match(m.text, /نصيبك/);
  }
  // Sara: 850 at 18% → 697 share
  assert.match(msgs.find((m) => m.chatId === 1001)!.text, /697 ج/);
});

test('order status moves forward only when every seller has handed over', async () => {
  const { id } = await makeOrder();
  for (const chat of [1001, 1002, 1003]) {
    assert.match(last(await tap(chat, `acc:${id}`)).text, /البوليصة/);
  }
  await settleShipments();
  let o = (await orderById(id))!;
  assert.deepEqual(Object.keys(o.shipments ?? {}).sort(), ['s1', 's2', 's3'], 'one Bosta shipment per seller');
  assert.ok(Object.values(o.shipments!).every((sh) => sh.tracking.startsWith('DEMO')));
  assert.equal(o.status, 'accepted');
  assert.match(last(await tap(1001, `acc:${id}`)).text, /قبل كده/, 'double accept is refused');
  await tap(1001, `hand:${id}`);
  await tap(1002, `hand:${id}`);
  assert.equal((await orderById(id))!.status, 'accepted');
  await tap(1003, `hand:${id}`);
  o = (await orderById(id))!;
  assert.equal(o.status, 'picked');
});

test('two taps at the same moment: only one accept wins, one waybill is made', async () => {
  const { id } = await makeOrder();
  const [a, b] = await Promise.all([tap(1001, `acc:${id}`), tap(1001, `acc:${id}`)]);
  const texts = [last(a).text, last(b).text];
  assert.equal(texts.filter((t) => /البوليصة/.test(t)).length, 1);
  assert.equal(texts.filter((t) => /قبل كده/.test(t)).length, 1);
  await settleShipments();
  assert.deepEqual(Object.keys((await orderById(id))!.shipments ?? {}), ['s1']);
});

test('rejecting hides the size and flags the order for the team', async () => {
  const { id } = await makeOrder();
  const out = await tap(1002, `rej:${id}`);
  assert.equal((await orderById(id))!.needsAttention, 'seller_rejected');
  const niqab = () => catalog().then((c) => c.products.find((p) => p.slug === 'niqab-with-khimar-black')!);
  assert.equal((await niqab()).variants[0].stock, 0);
  const restore = out.flatMap((m) => m.buttons?.flat() ?? []).find((b) => b.data.startsWith('stk:'))!;
  await tap(1002, restore.data);
  assert.equal((await niqab()).variants[0].stock, 5);
});

test('a seller adds a product that waits for review, then goes live', async () => {
  const chat = 1001;
  assert.match(last(await say(chat, '➕ منتج جديد')).text, /أنهي قسم/);
  await tap(chat, 'ad:v:category:abaya');
  await handle({ chatId: chat, photos: 1, photoIds: ['tg-photo-1'] });
  assert.deepEqual(await handle({ chatId: chat, photos: 1, photoIds: ['tg-photo-2'] }), [], 'album photos are collected quietly');
  assert.deepEqual((await store().getBotSession<{ photoIds: string[] }>(chat))?.photoIds, ['tg-photo-1', 'tg-photo-2']);
  await say(chat, 'عباية كتان — زيتي');
  assert.match(last(await say(chat, 'كتان طبيعي تقيل، قصة واسعة ومريحة للعمرة')).text, /السعر/, 'description, then price');
  assert.ok((await say(chat, 'غالي')).some((m) => /رقم/.test(m.text)), 'non-numeric price is refused');
  await say(chat, '٧٥٠');
  await tap(chat, 'ad:v:variants:preset0');
  assert.match(last(await say(chat, 'اسود ورمادي')).text, /لون ومقاس/, 'colors, then stock per color and size');
  await tap(chat, 'ad:v:stock:5');
  assert.match((await tap(chat, 'ad:v:stock:3'))[0].text, /سؤال قديم/, 'a second tap on an old stock button is not taken as the fabric');
  await say(chat, 'كتان طبيعي');
  await say(chat, '1=135، 2=140، 3=145، 4=150');
  await say(chat, '140');
  const preview = last(await tap(chat, 'ad:v:a-opacity:غير شفاف'));
  assert.match(preview.text, /615 ج/, '٧٥٠ (Arabic digits) at 18% → 615 share shown before publishing');
  await tap(chat, 'ad:publish');
  const find = async () => (await catalog()).products.find((x) => x.nameAr === 'عباية كتان — زيتي')!;
  const p = await find();
  assert.equal(p.status, 'review');
  assert.equal(p.variants.length, 8, '2 colors × 4 sizes');
  assert.deepEqual(p.variants.slice(0, 2), [{ label: 'اسود · 1', stock: 5, color: 'اسود', size: '1' }, { label: 'اسود · 2', stock: 5, color: 'اسود', size: '2' }]);
  assert.equal(p.attributes['اللون'], 'اسود، رمادي');
  assert.equal(p.leadAr, 'كتان طبيعي تقيل، قصة واسعة ومريحة للعمرة', 'the seller\'s description, not a generated one');
  assert.match((await approveProduct(p.id))[0].text, /اتنشر/);
  assert.equal((await find()).status, 'live');
});

test("money shows this cycle's payout after delivery", async () => {
  const { id } = await makeOrder();
  for (const chat of [1001, 1002, 1003]) { await tap(chat, `acc:${id}`); await tap(chat, `hand:${id}`); }
  await settleShipments();
  await mutateOrder(id, (o) => applyStatus(o, ['picked'], 'delivered'));
  const text = last(await say(1001, '💰 فلوسي')).text;
  assert.match(text, /مستحق/);
  assert.match(text, /عمولة/);
});
