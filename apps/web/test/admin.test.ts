import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBlocked, recordRefusal } from '../src/lib/blocklist.ts';
import { quote } from '../src/lib/catalog.ts';
import { getNiche } from '../src/lib/niches.ts';
import { saveOrder } from '../src/lib/orders.ts';
import { cycleStart, sellerCycle } from '../src/lib/payouts.ts';

test('a phone is blocked across niches after 2 refusals', () => {
  assert.equal(recordRefusal('01099990000'), false);
  assert.equal(isBlocked('01099990000'), false);
  assert.equal(recordRefusal('01099990000'), true);
  assert.equal(isBlocked('01099990000'), true);
});

test('payout cycle starts on the last Thursday', () => {
  assert.equal(cycleStart(new Date('2026-11-11T15:00:00')).getDay(), 4);
  assert.equal(cycleStart(new Date('2026-11-12T09:00:00')).getDate(), 12, 'Thursday starts its own cycle');
});

test('only orders delivered this cycle are payable; reserve is held', () => {
  const umrah = getNiche('umrah')!;
  const before = sellerCycle('s3', umrah);
  const cart = [{ kind: 'item' as const, slug: 'chiffon-hijab-sand', variant: 'مقاس واحد', qty: 2 }];
  const o = saveOrder({ niche: 'umrah', status: 'delivered', type: 'repeat', payment: 'cod', cart, quote: quote(umrah, cart, { isFirstOrder: false, walletBalance: 0, useWallet: false }),
    customer: { name: 'x', phone: '01011112233', governorate: 'القاهرة', area: 'x', address: 'x', landmark: '' } });
  o.deliveredAt = new Date().toISOString();
  const after = sellerCycle('s3', umrah);
  // 360 sales at the 6% repeat rate → 21.6 commission, 338.4 net, 12% reserve 40.61, payable 297.79
  assert.equal(after.sales - before.sales, 360);
  assert.equal(Math.round((after.commission - before.commission) * 100) / 100, 21.6);
  assert.equal(Math.round((after.payable - before.payable) * 100) / 100, 297.79);
});
