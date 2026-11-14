// Meta Pixel + Conversions API: pixel id per niche, hashed customer details, shared event ids,
// and that a Meta failure or a missing token never breaks an order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { eventPayload, hashedUser, pixelIdFor, purchaseEventId, sendEvent } from '../src/lib/meta.ts';
import { newEventId, validEventId } from '../src/lib/meta-ids.ts';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');

test('pixel id: niche config, env override, malformed ids ignored', () => {
  assert.equal(pixelIdFor('coffee', '3330084090508688', {}), '3330084090508688');
  assert.equal(pixelIdFor('coffee', '3330084090508688', { META_PIXEL_IDS: 'coffee=123456789012345' }), '123456789012345');
  assert.equal(pixelIdFor('umrah', undefined, { META_PIXEL_IDS: 'coffee=123456789012345' }), null);
  assert.equal(pixelIdFor('coffee', '<script>', {}), null);
});

test('customer details: Meta normalisation, then SHA-256; nothing in plain text', () => {
  const u = hashedUser({ phone: '01001234567', firstName: '  Ahmed Ali ', city: 'Cairo' });
  assert.deepEqual(u.ph, [sha('201001234567')], 'country code, digits only');
  assert.deepEqual(u.fn, [sha('ahmed')], 'first word, lower case');
  assert.deepEqual(u.ct, [sha('cairo')]);
  assert.deepEqual(u.country, [sha('eg')]);
  assert.equal(hashedUser({ city: 'Red Sea' }).ct![0], sha('redsea'), 'no spaces');
  assert.equal(hashedUser({ phone: 'abc' }).ph, undefined, 'bad phone left out');
  assert.deepEqual(Object.keys(hashedUser({})), ['country']);
});

test('event payload: catalog ids, shared event id, hashed user, no plain phone or name', () => {
  const p = eventPayload({ name: 'Purchase', eventId: purchaseEventId(42), orderId: 42, value: 370, productIds: ['p1', 'p2', 'p1'], numItems: 3, url: 'https://cairoroast.com/checkout', ip: '1.2.3.4', userAgent: 'UA', fbp: 'fb.1.1.1', customer: { phone: '01001234567', firstName: 'Ahmed', city: 'Giza' }, at: new Date(1_700_000_000_000) }, 'TEST1');
  const e = p.data[0];
  assert.equal(e.event_id, 'order-42');
  assert.equal(e.event_time, 1_700_000_000);
  assert.deepEqual(e.custom_data.content_ids, ['p1', 'p2']);
  assert.equal(e.custom_data.content_type, 'product_group');
  assert.equal(e.custom_data.order_id, '42');
  assert.equal(e.user_data.client_ip_address, '1.2.3.4');
  assert.equal(e.user_data.fbp, 'fb.1.1.1');
  assert.equal(p.test_event_code, 'TEST1');
  const raw = JSON.stringify(p);
  assert.ok(!raw.includes('01001234567') && !raw.includes('Ahmed') && !raw.includes('Giza'), 'only hashes leave the server');
  assert.ok(!('client_ip_address' in eventPayload({ name: 'AddToCart', eventId: 'atc-x', value: 1, productIds: [], numItems: 1, url: 'x', ip: 'unknown' }).data[0].user_data));
});

test('event ids: browser-made ids accepted, anything else refused', () => {
  const a = newEventId('atc'), i = newEventId('ic');
  assert.ok(validEventId(a) && validEventId(i), `${a} ${i}`);
  assert.notEqual(newEventId('atc'), a);
  for (const bad of ['order-1', 'atc-', 'x'.repeat(40), 7, null]) assert.equal(validEventId(bad), false, String(bad));
});

test('sendEvent: skipped without a token, single or per-niche token, failures swallowed', async () => {
  const calls: string[] = [];
  const ok = (async (url: string) => { calls.push(url); return new Response('{}', { status: 200 }); }) as unknown as typeof fetch;
  const e = { name: 'Purchase' as const, eventId: 'order-7', value: 300, productIds: ['p1'], numItems: 1, url: 'u' };
  assert.equal(await sendEvent('coffee', '3330084090508688', e, {}, ok), false, 'no token: nothing sent');
  assert.equal(calls.length, 0);
  assert.equal(await sendEvent('coffee', '3330084090508688', e, { META_CAPI_TOKEN: 'SECRET' }, ok), true);
  assert.match(calls[0], /graph\.facebook\.com\/v[\d.]+\/3330084090508688\/events\?access_token=SECRET/);
  assert.equal(await sendEvent('coffee', '3330084090508688', e, { META_CAPI_TOKENS: 'coffee=NICHE', META_CAPI_TOKEN: 'SECRET' }, ok), true);
  assert.match(calls[1], /access_token=NICHE/, 'per-niche token wins');
  const orig = console.error; console.error = () => {};
  try {
    assert.equal(await sendEvent('coffee', '3330084090508688', e, { META_CAPI_TOKEN: 'S' }, (async () => { throw new Error('network'); }) as unknown as typeof fetch), false);
    assert.equal(await sendEvent('coffee', '3330084090508688', e, { META_CAPI_TOKEN: 'S' }, (async () => new Response('bad', { status: 400 })) as unknown as typeof fetch), false);
  } finally { console.error = orig; }
});
