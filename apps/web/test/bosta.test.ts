// Bosta, end to end against a fake Bosta (test/bosta-fake.ts): areas, shipment payload, webhook
// updates, the sync for missed webhooks, and re-shipping after a cancel.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { startFakeBosta, PDF, type FakeBosta } from './bosta-fake.ts';
import { freshStore, makeOrder } from './helpers.ts';
import { checkDistrict, getWaybillPdf, parseWebhook, resolveDistrict, webhookAuthorized } from '../src/lib/bosta.ts';
import { citiesForGovernorate, exactArea, indexAreas, parseBostaCities, searchAreas } from '../src/lib/bosta-areas.ts';
import { AREAS } from './bosta-fake.ts';
import { applyTracking, queueShipment, settleShipments, shipSellerPart, syncOpenShipments } from '../src/lib/fulfillment.ts';
import { applySellerPart, mutateOrder, orderById } from '../src/lib/orders.ts';
import { saveSeller, catalog } from '../src/lib/catalog.ts';
import { GOVERNORATES } from '../src/lib/eta.ts';

let fake: FakeBosta;
before(async () => {
  fake = await startFakeBosta();
  process.env.BOSTA_API_BASE = fake.base;
  process.env.BOSTA_API_KEY_UMRAH = 'key-sakina'; // Sakina's own Bosta account
  delete process.env.BOSTA_API_KEY;
  process.env.BOSTA_WEBHOOK_SECRET = 'w'.repeat(24);
  freshStore();
});
after(() => fake.close());

async function accepted(o: Awaited<ReturnType<typeof makeOrder>>) {
  for (const s of Object.keys(o.sellerState)) await mutateOrder(o.id, (x) => applySellerPart(x, s, 'accepted'));
  return o.id;
}

test('areas: Bosta list parsed, closed districts dropped, every checkout governorate maps to a Bosta city', () => {
  const cities = parseBostaCities(AREAS);
  assert.equal(cities[0].districts.some((d) => d.id === 'dClosed'), false);
  assert.deepEqual(citiesForGovernorate(cities, 'القاهرة').map((c) => c.en), ['Cairo']);
  assert.deepEqual(citiesForGovernorate(cities, 'الجيزة').map((c) => c.en), ['Giza']);
  assert.ok(GOVERNORATES.length >= 24);
});

test('areas: search and exact match use the shop rules (spelling, articles, whole zones)', () => {
  const idx = indexAreas(citiesForGovernorate(parseBostaCities(AREAS), 'القاهرة').flatMap((c) => c.districts));
  const nasr = searchAreas(idx, 'مدينة نصر');
  assert.equal(nasr[0].title, 'مدينه نصر');
  assert.match(nasr[0].sub, /أي منطقة/, 'the whole zone comes first');
  assert.equal(searchAreas(idx, 'maadi')[0].districtId, 'dMaadi');
  assert.equal(exactArea(idx, 'معادي')?.districtId, 'dMaadi', 'article dropped');
  assert.equal(exactArea(idx, 'zamalek')?.districtId, 'dZam');
  assert.equal(exactArea(idx, 'شارع ما'), null);
});

test('checkout: a picked district must belong to the governorate; a clear typed name resolves; else "pick"', async () => {
  assert.equal(await checkDistrict('القاهرة', 'التوفيق', 'dTawfiq'), 'dTawfiq');
  assert.equal(await checkDistrict('القاهرة', 'مدينة نصر'), 'dNasr');
  assert.equal(await checkDistrict('القاهرة', 'الشيخ زايد', 'dZayed'), 'pick', 'a Giza district is not in Cairo');
  assert.equal(await checkDistrict('القاهرة', 'مكان مش موجود'), 'pick');
  assert.equal((await resolveDistrict({ governorate: 'الجيزة', area: 'zayed' }))?.id, 'dZayed');
});

test('shipment: Sakina\'s key, exact district, COD, pickup location, per-shipment webhook with secret', async () => {
  const s1 = (await catalog()).sellerById('s1')!;
  await saveSeller({ ...structuredClone(s1), bostaLocationId: 'loc-s1' });
  const o = await makeOrder();
  await accepted(o);
  fake.requests.length = 0;
  const msgs = await shipSellerPart(o.id, 's1');
  const create = fake.requests.find((r) => r.method === 'POST' && r.path === '/deliveries?apiVersion=1')!;
  assert.equal(create.auth, 'key-sakina');
  const b = create.body as Record<string, any>;
  assert.equal(b.type, 10);
  assert.deepEqual({ city: b.dropOffAddress.city, districtId: b.dropOffAddress.districtId, zoneId: b.dropOffAddress.zoneId }, { city: 'Cairo', districtId: 'dNasr', zoneId: 'zNasr' });
  assert.equal(b.dropOffAddress.firstLine, '14 شارع الطيران');
  assert.equal(b.businessLocationId, 'loc-s1');
  assert.equal(b.businessReference, `${o.id}-s1`);
  assert.equal(b.uniqueBusinessReference, `${o.id}-s1`);
  assert.equal(b.webhookUrl, 'https://sakinaeg.com/api/bosta');
  assert.deepEqual(b.webhookCustomHeaders, { Authorization: `Bearer ${'w'.repeat(24)}` });
  assert.equal(b.receiver.firstName, 'منى');
  assert.equal(b.receiver.phone, '01012345678');
  const saved = (await orderById(o.id))!;
  assert.equal(b.cod, saved.shipments!.s1.cod, 'the courier collects this seller\'s share of the cash');
  assert.ok(b.cod > 0 && b.goodsInfo.amount > 0);
  assert.equal(saved.shipments!.s1.state, 10);
  assert.equal(msgs[0].file?.base64, PDF, 'the seller gets the real waybill PDF');
  assert.equal(await getWaybillPdf('umrah', saved.shipments!.s1.tracking), PDF);
});

test('shipment: an area Bosta can\'t place waits for the team instead of guessing', async () => {
  const o = await makeOrder({ phone: '01011112222' });
  await mutateOrder(o.id, (x) => { x.customer.area = 'حتة مش في القايمة'; return true; });
  await accepted(o);
  queueShipment(o.id, 's2');
  await settleShipments();
  const saved = (await orderById(o.id))!;
  assert.equal(saved.shipments?.s2, undefined);
  assert.match(saved.needsAttention ?? '', /^bosta_area/);
  // The team picks the area; shipping now works and clears the flag.
  await mutateOrder(o.id, (x) => { x.customer.districtId = 'dMaadi'; return true; });
  await shipSellerPart(o.id, 's2');
  const fixed = (await orderById(o.id))!;
  assert.ok(fixed.shipments?.s2.tracking);
  assert.equal(fixed.needsAttention, undefined);
});

test('webhook: Bearer secret required; payload with attempts and reason parsed', () => {
  const secret = 'w'.repeat(24);
  assert.ok(webhookAuthorized(`Bearer ${secret}`));
  assert.ok(webhookAuthorized(secret), 'a bare secret (set in Bosta\'s dashboard) works too');
  assert.equal(webhookAuthorized('Bearer nope'), false);
  assert.equal(webhookAuthorized(null), false);
  assert.equal(webhookAuthorized(`Bearer ${secret}`, ''), false, 'no secret configured: nothing is accepted');
  assert.deepEqual(parseWebhook({ trackingNumber: 5, state: 47, exceptionReason: 'Customer not answering', numberOfAttempts: 2 }),
    { tracking: '5', status: 'exception', state: 47, note: 'Customer not answering (attempt 2)' });
  assert.equal(parseWebhook({ trackingNumber: 5, state: 104 }), null, 'archived changes nothing');
  assert.equal(parseWebhook({ trackingNumber: 5, state: 41 })?.status, 'in_transit');
});

test('webhook flow: out for delivery → failed attempt flagged → delivered confirms the order automatically', async () => {
  const o = await makeOrder({ phone: '01033334444' });
  await accepted(o);
  for (const s of Object.keys(o.sellerState)) await shipSellerPart(o.id, s);
  const tracks = Object.values((await orderById(o.id))!.shipments!).map((s) => s.tracking);
  // No pickup (21) update arrived: "out for delivery" still marks the sellers as handed over.
  for (const t of tracks) await applyTracking(t, 'in_transit', { state: 41, note: '' });
  assert.equal((await orderById(o.id))!.status, 'picked');
  await applyTracking(tracks[0], 'exception', { state: 47, note: 'Customer not answering (attempt 1)' });
  assert.match((await orderById(o.id))!.needsAttention ?? '', /delivery_exception: Customer not answering/);
  for (const t of tracks) await applyTracking(t, 'delivered', { state: 45, note: '' });
  const done = (await orderById(o.id))!;
  assert.equal(done.status, 'delivered');
  assert.ok(done.deliveredAt);
  assert.equal(done.needsAttention, undefined, 'the failed-attempt warning clears once Bosta delivers');
  assert.deepEqual(await applyTracking(tracks[0], 'delivered', { state: 45 }), [], 'Bosta repeating itself changes nothing');
});

test('sync: a missed webhook is caught up from Bosta; a shipment deleted on Bosta is flagged and can be shipped again', async () => {
  const o = await makeOrder({ phone: '01055556666' });
  await accepted(o);
  for (const s of Object.keys(o.sellerState)) await shipSellerPart(o.id, s);
  const sh = (await orderById(o.id))!.shipments!;
  const [a, b, c] = Object.keys(sh);
  fake.states.set(sh[a].tracking, 45);
  fake.states.set(sh[b].tracking, 45);
  fake.states.delete(sh[c].tracking); // deleted in Bosta's dashboard
  const r = await syncOpenShipments();
  assert.ok(r.checked >= 3 && r.changed >= 3);
  let now = (await orderById(o.id))!;
  assert.equal(now.shipments![a].status, 'delivered');
  assert.equal(now.shipments![c].status, 'cancelled');
  assert.equal(now.shipments![c].note, 'Deleted on Bosta');
  assert.match(now.needsAttention ?? '', /^shipment_cancelled/);
  assert.notEqual(now.status, 'delivered');
  // Ship the cancelled part again; once Bosta delivers it, the order completes.
  await shipSellerPart(o.id, c);
  now = (await orderById(o.id))!;
  assert.notEqual(now.shipments![c].tracking, sh[c].tracking);
  assert.equal(now.needsAttention, undefined);
  fake.states.set(now.shipments![c].tracking, 45);
  await syncOpenShipments();
  assert.equal((await orderById(o.id))!.status, 'delivered');
});

test('sync: returned to business marks the order refused (stock back, refusal counted)', async () => {
  const o = await makeOrder({ phone: '01077770000' });
  await accepted(o);
  for (const s of Object.keys(o.sellerState)) await shipSellerPart(o.id, s);
  const first = Object.values((await orderById(o.id))!.shipments!)[0];
  fake.states.set(first.tracking, 46);
  await syncOpenShipments();
  assert.equal((await orderById(o.id))!.status, 'refused');
});

test('a store without its own key (and no shared key) stays in demo mode', async () => {
  const o = await makeOrder({ niche: 'coffee', cart: [{ kind: 'item', slug: 'bonds-amber', variant: '1 كجم', qty: 1, choice: { grind: 'beans' } }] });
  await accepted(o);
  const sid = Object.keys(o.sellerState)[0];
  fake.requests.length = 0;
  await shipSellerPart(o.id, sid);
  assert.match((await orderById(o.id))!.shipments![sid].tracking, /^DEMO/);
  assert.equal(fake.requests.filter((r) => r.path.startsWith('/deliveries')).length, 0);
});
