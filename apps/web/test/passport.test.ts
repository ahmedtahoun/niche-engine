// Coffee Passport: stamps from orders, the Explorer reward once per phone, and the private share link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore, makeOrder } from './helpers.ts';
import { catalog } from '../src/lib/catalog.ts';
import { getNiche } from '../src/lib/niches.ts';
import { countriesOf, originOf, passportOf, passportToken, readPassportToken, REWARD_NOTE, rewardPassport } from '../src/lib/passport.ts';
import { entriesOf } from '../src/lib/wallet.ts';
import type { CartLine } from '../src/lib/types.ts';

const coffee = getNiche('coffee')!;
const PHONE = '01001234567';
const bag = (slug: string): CartLine => ({ kind: 'item', slug, variant: '250 جم', qty: 1, choice: { grind: 'beans' } });
const order = (slugs: string[], status: 'confirmed' | 'delivered' | 'cancelled' = 'delivered') => makeOrder({ niche: 'coffee', cart: slugs.map(bag), status, phone: PHONE });

test('origins: single origins have a country, blends do not; four countries on sale', async () => {
  freshStore();
  const cat = await catalog();
  const p = (slug: string) => cat.productBySlug('coffee', slug)!;
  assert.deepEqual(originOf(p('bonds-ethiopia-limu'), coffee), { ar: 'إثيوبيا', en: 'Ethiopia' });
  assert.deepEqual(originOf(p('bonds-ethiopia-guji'), coffee), { ar: 'إثيوبيا', en: 'Ethiopia' });
  assert.equal(originOf(p('bonds-chrome'), coffee), null);
  const countries = countriesOf(coffee, cat);
  assert.deepEqual(countries.map((c) => c.en).sort(), ['Brazil', 'Colombia', 'El Salvador', 'Ethiopia']);
  assert.equal(countries.find((c) => c.en === 'Ethiopia')?.flag, '🇪🇹');
  assert.equal(countries.find((c) => c.en === 'Ethiopia')?.products.length, 2);
});

test('stamps: welcome for everyone, "on its way" until delivered, cancelled never stamps', async () => {
  freshStore();
  const empty = (await passportOf(PHONE, 'coffee'))!;
  assert.equal(empty.stamped, 0);
  assert.equal(empty.goal, 4);
  assert.deepEqual(empty.welcome.ar, 'القاهرة');
  assert.ok(empty.stamps.every((x) => x.state === 'empty'));

  await order(['bonds-ethiopia-limu', 'bonds-ethiopia-guji', 'bonds-chrome'], 'delivered');
  await order(['bonds-brazil-red-catuai'], 'confirmed');
  await order(['bonds-colombia-castillo'], 'cancelled');
  const pp = (await passportOf(PHONE, 'coffee'))!;
  const state = Object.fromEntries(pp.stamps.map((x) => [x.country.en, x.state]));
  assert.deepEqual(state, { Ethiopia: 'stamped', Brazil: 'coming', Colombia: 'empty', 'El Salvador': 'empty' });
  assert.equal(pp.stamped, 1, 'two Ethiopian coffees are one country');
  assert.equal(pp.coming, 1);
  assert.equal(pp.stamps[0].country.en, 'Ethiopia', 'stamped first');
  assert.equal(pp.explorer, false);
  assert.equal(pp.firstName, 'منى');
});

test('Explorer: every country, from at least two delivered orders; credit once, team told', async () => {
  freshStore();
  const before = process.env.ADMIN_TELEGRAM_CHAT_IDS;
  process.env.ADMIN_TELEGRAM_CHAT_IDS = '777';
  try {
    // One big order with all four countries is not enough on its own.
    const big = await order(['bonds-ethiopia-limu', 'bonds-brazil-red-catuai', 'bonds-colombia-castillo', 'bonds-el-salvador']);
    let pp = (await passportOf(PHONE, 'coffee'))!;
    assert.equal(pp.stamped, 4);
    assert.equal(pp.explorer, false);
    assert.equal(pp.ordersShort, 1);
    assert.deepEqual(await rewardPassport(big), []);

    const second = await order(['bonds-chrome', 'bonds-ethiopia-guji']);
    pp = (await passportOf(PHONE, 'coffee'))!;
    assert.equal(pp.explorer, true);
    assert.equal(pp.rewarded, false);
    const msgs = await rewardPassport(second);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].chatId, 777);
    assert.match(msgs[0].text, /كمّل جواز سفر القهوة/);
    assert.match(msgs[0].text, /300 ج/);
    const credit = (await entriesOf(PHONE, 'coffee')).filter((e) => e.note === REWARD_NOTE);
    assert.equal(credit.length, 1);
    assert.equal(credit[0].amount, 300);
    assert.ok((await passportOf(PHONE, 'coffee'))!.rewarded);
    // A later delivery never pays again.
    const third = await order(['bonds-amber']);
    assert.deepEqual(await rewardPassport(third), []);
    assert.equal((await entriesOf(PHONE, 'coffee')).filter((e) => e.note === REWARD_NOTE).length, 1);
  } finally { process.env.ADMIN_TELEGRAM_CHAT_IDS = before; }
});

test('share link: opaque token, phone not readable, tampering rejected', () => {
  const t = passportToken('coffee', PHONE);
  assert.match(t, /^[A-Za-z0-9_-]+$/);
  assert.ok(!t.includes('0100') && !Buffer.from(t, 'base64url').toString('latin1').includes(PHONE));
  assert.deepEqual(readPassportToken(t), { niche: 'coffee', phone: PHONE });
  assert.notEqual(passportToken('coffee', PHONE), t, 'a fresh token each time');
  const bad = t.slice(0, -2) + (t.endsWith('A') ? 'BB' : 'AA');
  assert.equal(readPassportToken(bad), null);
  assert.equal(readPassportToken('nonsense'), null);
  assert.equal(readPassportToken(''), null);
});
