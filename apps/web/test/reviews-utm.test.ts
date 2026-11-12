// Real reviews and campaign tags: what the admin and the store rely on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanUtm, utmLabel } from '../src/lib/orders.ts';
import { ratingOf } from '../src/lib/types.ts';

test('rating: average of reviews with stars only, none without', () => {
  assert.equal(ratingOf([]), null);
  assert.equal(ratingOf([{ name: 'a', tags: [], text: 'x' }]), null, 'old reviews without stars never make a rating');
  assert.deepEqual(ratingOf([{ name: 'a', tags: [], text: 'x', stars: 5 }, { name: 'b', tags: [], text: 'y', stars: 4 }, { name: 'c', tags: [], text: 'z' }]), { value: 4.5, count: 2 });
  assert.equal(ratingOf([{ name: 'a', tags: [], text: 'x', stars: 9 }]), null, 'out-of-range stars are ignored');
});

test('campaign tags: cleaned, short, lower case; nothing when empty or not an object', () => {
  assert.deepEqual(cleanUtm({ source: 'Instagram', campaign: 'Box_Launch<script>', medium: '', extra: 'x' }), { source: 'instagram', campaign: 'box_launchscript' });
  assert.equal(cleanUtm({ source: '' }), null);
  assert.equal(cleanUtm('instagram'), null);
  assert.equal(cleanUtm(null), null);
  assert.equal(cleanUtm({ source: 'x'.repeat(200) })!.source!.length, 60);
  assert.equal(utmLabel({ source: 'instagram', campaign: 'box' }), 'instagram / box');
});

test('overview channels: website orders from a campaign link count under its source', async () => {
  const { dashboard } = await import('../src/lib/dashboard.ts');
  const base = { niche: 'coffee', status: 'confirmed', type: 'new', payment: 'cod', cart: [], items: [], sellerState: {}, version: 0, createdAt: new Date().toISOString(), customer: { name: 'x', phone: '01000000000', governorate: 'القاهرة', area: '', address: '', landmark: '' }, quote: { total: 300 } };
  const orders = [{ ...base, id: 1 }, { ...base, id: 2, utm: { source: 'instagram' } }, { ...base, id: 3, source: 'whatsapp' }] as never[];
  const d = dashboard(orders, [], 30);
  assert.deepEqual(d.sources.map((s) => s.source).sort(), ['site:instagram', 'web', 'whatsapp']);
});
