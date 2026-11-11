import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBlocked, recordRefusal, unblock } from '../src/lib/blocklist.ts';
import { getNiche } from '../src/lib/niches.ts';
import { mutateOrder } from '../src/lib/orders.ts';
import { cycleStart, markPaid, paidThisCycle, sellerCycle } from '../src/lib/payouts.ts';
import { freshStore, makeOrder } from './helpers.ts';

freshStore();

test('a phone is blocked across niches after 2 refused orders, and can be unblocked', async () => {
  assert.equal(await recordRefusal('01099990000', 1), false);
  assert.equal(await isBlocked('01099990000'), false);
  assert.equal(await recordRefusal('01099990000', 2), true);
  assert.equal(await isBlocked('01099990000'), true);
  await unblock('01099990000');
  assert.equal(await isBlocked('01099990000'), false);
});

test('payout cycle starts on the last Thursday', () => {
  assert.equal(cycleStart(new Date('2026-11-11T15:00:00')).getDay(), 4);
  assert.equal(cycleStart(new Date('2026-11-12T09:00:00')).getDate(), 12, 'Thursday starts its own cycle');
});

test('only orders delivered this cycle are payable; reserve is held', async () => {
  const umrah = getNiche('umrah')!;
  const before = await sellerCycle('s3', umrah);
  const o = await makeOrder({ cart: [{ kind: 'item', slug: 'chiffon-hijab-sand', variant: 'مقاس واحد', qty: 2 }], type: 'repeat', status: 'picked' });
  await mutateOrder(o.id, (x) => { x.status = 'delivered'; x.deliveredAt = new Date().toISOString(); return true; });
  const after = await sellerCycle('s3', umrah);
  // 360 sales at the 6% repeat rate → 21.6 commission, 338.4 net, 12% reserve 40.61, payable 297.79
  assert.equal(after.sales - before.sales, 360);
  assert.equal(Math.round((after.commission - before.commission) * 100) / 100, 21.6);
  assert.equal(Math.round((after.payable - before.payable) * 100) / 100, 297.79);
});

test('a seller can be marked paid once per cycle (a double click pays once)', async () => {
  const [a, b] = await Promise.all([markPaid('s1', 500), markPaid('s1', 500)]);
  assert.deepEqual([a, b].sort(), [false, true]);
  assert.equal((await paidThisCycle()).get('s1')?.amount, 500);
});
