// Meta Pixel + Conversions API: per-niche settings, the purchase payload, and that a Meta failure never breaks an order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pixelIdFor, purchaseEventId, purchasePayload, sendPurchase } from '../src/lib/meta.ts';

const env = { META_PIXEL_IDS: 'coffee=123456789012345, umrah = 987654321098765', META_CAPI_TOKENS: 'coffee=SECRET' };

test('pixel id per niche; missing or malformed ids mean no pixel', () => {
  assert.equal(pixelIdFor('coffee', env), '123456789012345');
  assert.equal(pixelIdFor('umrah', env), '987654321098765');
  assert.equal(pixelIdFor('other', env), null);
  assert.equal(pixelIdFor('coffee', {}), null);
  assert.equal(pixelIdFor('coffee', { META_PIXEL_IDS: 'coffee=<script>' }), null);
});

test('purchase payload: catalog ids, shared event id, no personal details', () => {
  const p = purchasePayload({ orderId: 42, value: 370, productIds: ['p1', 'p2', 'p1'], numItems: 3, url: 'https://cairoroast.com/checkout', ip: '1.2.3.4', userAgent: 'UA', fbp: 'fb.1.1.1', at: new Date(1_700_000_000_000) }, 'TEST1');
  const e = p.data[0];
  assert.equal(e.event_id, purchaseEventId(42));
  assert.equal(e.event_id, 'order-42');
  assert.equal(e.event_time, 1_700_000_000);
  assert.deepEqual(e.custom_data.content_ids, ['p1', 'p2']);
  assert.equal(e.custom_data.content_type, 'product_group');
  assert.equal(e.custom_data.value, 370);
  assert.deepEqual(e.user_data, { client_ip_address: '1.2.3.4', client_user_agent: 'UA', fbp: 'fb.1.1.1' });
  assert.equal(p.test_event_code, 'TEST1');
  assert.ok(!JSON.stringify(p).match(/"(ph|fn|ln|em|ct|st)"/), 'no phone, name, email or address keys');
  assert.ok(!('client_ip_address' in purchasePayload({ orderId: 1, value: 1, productIds: [], numItems: 1, url: 'x', ip: 'unknown' }).data[0].user_data));
});

test('sendPurchase: skipped without a token, posts to the niche pixel, swallows failures', async () => {
  const calls: string[] = [];
  const ok = (async (url: string) => { calls.push(url); return new Response('{}', { status: 200 }); }) as unknown as typeof fetch;
  const e = { orderId: 7, value: 300, productIds: ['p1'], numItems: 1, url: 'u' };
  assert.equal(await sendPurchase('umrah', e, env, ok), false, 'umrah has a pixel but no token');
  assert.equal(calls.length, 0);
  assert.equal(await sendPurchase('coffee', e, env, ok), true);
  assert.match(calls[0], /graph\.facebook\.com\/v[\d.]+\/123456789012345\/events\?access_token=SECRET/);
  const orig = console.error; console.error = () => {};
  try {
    const down = (async () => { throw new Error('network'); }) as unknown as typeof fetch;
    assert.equal(await sendPurchase('coffee', e, env, down), false);
    const bad = (async () => new Response('bad', { status: 400 })) as unknown as typeof fetch;
    assert.equal(await sendPurchase('coffee', e, env, bad), false);
  } finally { console.error = orig; }
});
