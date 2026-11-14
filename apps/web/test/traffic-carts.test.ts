// Visitor statistics (no cookies) and abandoned checkouts: what admin → Traffic and → Carts rely on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.ts';
import { cairoDay, cleanPath, cleanSource, isBot, visitorId } from '../src/lib/traffic.ts';
import { abandonedAlert, inReplyHours, markDraftOrdered, reminderText, sentSig, sentSigOk, sweepAbandoned } from '../src/lib/abandoned.ts';
import { getNiche } from '../src/lib/niches.ts';
import { store } from '../src/lib/store/index.ts';
import type { CartLine } from '../src/lib/types.ts';

const coffee = getNiche('coffee')!;
const CHROME: CartLine[] = [{ kind: 'item', slug: 'bonds-chrome', variant: '250 جم', qty: 2, choice: { grind: 'beans' } }];
/** Noon in Cairo tomorrow: inside reply hours, more than an hour after anything saved now, less than 48 h. */
const tomorrowNoon = () => new Date(`${cairoDay(new Date(Date.now() + 864e5))}T12:00:00+02:00`);

test('tracking helpers: public paths only, sources cleaned, bots skipped', () => {
  assert.equal(cleanPath('/coffee/p/bonds-chrome?utm_source=x', 'coffee'), '/p/bonds-chrome');
  assert.equal(cleanPath('/coffee', 'coffee'), '/');
  assert.equal(cleanPath('/order/1042', 'coffee'), '/order', 'order numbers are never stored');
  assert.equal(cleanPath('https://evil.com', 'coffee'), null);
  assert.equal(cleanPath('/p/<script>', 'coffee'), null);
  assert.equal(cleanSource('Facebook Ads'), 'facebook ads');
  assert.equal(cleanSource('<x>'), 'other');
  assert.equal(cleanSource(undefined), 'direct');
  assert.ok(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)') && isBot('facebookexternalhit/1.1') && isBot(''));
  assert.ok(!isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1'));
});

test('visitor id: same person same day matches, changes the next day, never contains the IP', () => {
  const d1 = new Date('2026-11-14T10:00:00Z'), d1b = new Date('2026-11-14T18:00:00Z'), d2 = new Date('2026-11-15T10:00:00Z');
  const a = visitorId('41.33.1.2', 'UA', 's', d1);
  assert.equal(a, visitorId('41.33.1.2', 'UA', 's', d1b));
  assert.notEqual(a, visitorId('41.33.1.2', 'UA', 's', d2));
  assert.notEqual(a, visitorId('41.33.1.3', 'UA', 's', d1));
  assert.ok(!a.includes('41') || !a.includes('33.1'), a);
  assert.match(a, /^[0-9a-f]{20}$/);
});

test('traffic stats: daily visitors, sources, pages, devices and the funnel', async () => {
  freshStore();
  const s = store();
  const ev = (visitor: string, kind: 'view' | 'cart' | 'checkout' | 'order', path: string, source = 'direct', device: 'mobile' | 'desktop' = 'mobile') => s.addSiteEvent({ niche: 'coffee', visitor, kind, path, source, device, lang: 'ar' });
  await ev('a', 'view', '/', 'facebook ads'); await ev('a', 'view', '/p/bonds-chrome', 'facebook ads'); await ev('a', 'cart', '/p/bonds-chrome'); await ev('a', 'checkout', '/checkout'); await ev('a', 'order', '/checkout');
  await ev('b', 'view', '/', 'google', 'desktop'); await ev('b', 'view', '/guide/turkish-coffee-kanaka', 'google', 'desktop');
  await ev('c', 'view', '/p/bonds-amber', 'chatgpt');
  await s.addSiteEvent({ niche: 'umrah', visitor: 'z', kind: 'view', path: '/', source: 'direct', device: 'mobile', lang: 'ar' });
  const st = await s.siteStats('coffee', new Date(Date.now() - 864e5).toISOString());
  assert.equal(st.daily.length, 1);
  assert.deepEqual({ visitors: st.daily[0].visitors, views: st.daily[0].views }, { visitors: 3, views: 5 });
  assert.deepEqual(st.funnel, { visitors: 3, product: 2, cart: 1, checkout: 1, order: 1 });
  assert.deepEqual(st.sources.map((x) => x.source), ['chatgpt', 'facebook ads', 'google']);
  assert.equal(st.pages[0].path, '/');
  assert.equal(st.pages[0].views, 2);
  assert.deepEqual(st.devices, [{ device: 'mobile', visitors: 2 }, { device: 'desktop', visitors: 1 }]);
  assert.equal((await s.siteStats('coffee', new Date(Date.now() + 864e5).toISOString())).funnel.visitors, 0);
});

test('drafts: one live draft per phone, updated as the form changes', async () => {
  freshStore();
  const s = store();
  const a = await s.saveDraft({ niche: 'coffee', phone: '01001234567', name: 'Ahmed', governorate: 'القاهرة', cart: CHROME, total: 520, lang: 'ar' });
  const b = await s.saveDraft({ niche: 'coffee', phone: '01001234567', name: 'Ahmed Ali', governorate: 'الجيزة', cart: CHROME, total: 520, lang: 'ar' });
  assert.equal(a.id, b.id);
  assert.equal(a.token, b.token);
  assert.equal(b.name, 'Ahmed Ali');
  assert.match(a.token, /^[A-Za-z0-9_-]{16}$/);
  assert.equal((await s.draftByToken(a.token))?.governorate, 'الجيزة');
  assert.equal(await s.draftByToken('nope-not-a-token'), null);
  const other = await s.saveDraft({ niche: 'coffee', phone: '01009999999', name: '', governorate: '', cart: CHROME, total: 520, lang: 'en' });
  assert.notEqual(other.id, a.id);
});

test('reminders: due after an hour in reply hours only, once a week per phone, never after an order', async () => {
  freshStore();
  const s = store();
  const noon = tomorrowNoon();
  assert.ok(inReplyHours(noon));
  assert.ok(!inReplyHours(new Date(`${cairoDay(noon)}T02:00:00+02:00`)));
  const d = await s.saveDraft({ niche: 'coffee', phone: '01001234567', name: 'Ahmed', governorate: 'القاهرة', cart: CHROME, total: 520, lang: 'ar' });
  // At night nothing is alerted; the draft waits for the morning.
  assert.equal(await sweepAbandoned(new Date(`${cairoDay(noon)}T02:00:00+02:00`)), 0);
  assert.equal((await s.draftByToken(d.token))?.status, 'open');
  // Too soon: within the hour.
  assert.equal(await sweepAbandoned(new Date(Date.now() + 10 * 60_000)), 0);
  // Next day at noon: alerted once.
  assert.equal(await sweepAbandoned(noon), 1);
  const alerted = (await s.draftByToken(d.token))!;
  assert.equal(alerted.status, 'alerted');
  assert.ok(alerted.alertedAt);
  assert.equal(await sweepAbandoned(noon), 0, 'never twice');
  // The same phone leaves another cart the same week: no second reminder.
  await s.updateDraft(d.id, { status: 'reminded', remindedAt: noon.toISOString() });
  const again = await s.saveDraft({ niche: 'coffee', phone: '01001234567', name: 'Ahmed', governorate: 'القاهرة', cart: CHROME, total: 260, lang: 'ar' });
  assert.notEqual(again.id, d.id, 'a reminded draft is closed; a new visit starts a new one');
  await sweepAbandoned(noon);
  assert.equal((await s.draftByToken(again.token))?.status, 'dismissed');
  // Ordering closes the phone's drafts; the reminded one counts as recovered.
  await markDraftOrdered('coffee', '01001234567', 1042);
  const done = (await s.draftByToken(d.token))!;
  assert.equal(done.status, 'ordered');
  assert.equal(done.orderId, 1042);
  assert.ok(done.remindedAt);
});

test('reminder message and team alert: items, link back to the cart, signed one-tap button', async () => {
  freshStore();
  const d = await store().saveDraft({ niche: 'coffee', phone: '01001234567', name: 'Ahmed Ali', governorate: 'القاهرة', cart: CHROME, total: 520, lang: 'ar' });
  const ar = await reminderText(d, coffee);
  assert.match(ar, /أهلاً Ahmed/);
  assert.match(ar, /قهوة كروم بلند/);
  assert.match(ar, /×2/);
  assert.ok(ar.includes(`https://cairoroast.com/cart?d=${d.token}`), ar);
  const en = await reminderText({ ...d, lang: 'en' }, coffee);
  assert.match(en, /Hi Ahmed 👋 This is Cairo Roast/);
  assert.ok(en.includes(`/cart?d=${d.token}&lang=en`), en);

  assert.ok(sentSigOk(d.token, sentSig(d.token)));
  assert.ok(!sentSigOk(d.token, 'x'.repeat(24)));
  assert.ok(!sentSigOk('other-token', sentSig(d.token)));

  const before = process.env.ADMIN_TELEGRAM_CHAT_IDS;
  process.env.ADMIN_TELEGRAM_CHAT_IDS = '';
  assert.deepEqual(await abandonedAlert(d, coffee), [], 'no team chat: no alert');
  process.env.ADMIN_TELEGRAM_CHAT_IDS = '777';
  try {
    const [msg] = await abandonedAlert(d, coffee, new Date(Date.now() + 90 * 60_000));
    assert.equal(msg.chatId, 777);
    assert.match(msg.text, /سلة متروكة/);
    assert.match(msg.text, /01001234567/);
    assert.match(msg.text, /520 ج/);
    assert.ok(msg.buttons![0][0].url!.startsWith(`https://cairoroast.com/api/carts/sent?t=${d.token}&s=`));
  } finally { process.env.ADMIN_TELEGRAM_CHAT_IDS = before; }
});
