// Search engine setup and answer pages: verification tags, IndexNow, and that every guide is complete.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.ts';
import { guidesFor } from '../src/lib/guides.ts';
import { getNiche } from '../src/lib/niches.ts';
import { indexNowKey, publicUrls, submitIndexNow, verificationFor } from '../src/lib/seo.ts';

const coffee = getNiche('coffee')!;

test('verification tags: one token for all sites or per niche; none when unset', () => {
  assert.equal(verificationFor('coffee', {}), undefined);
  assert.deepEqual(verificationFor('coffee', { GOOGLE_SITE_VERIFICATION: 'g-token' }), { google: 'g-token' });
  assert.deepEqual(verificationFor('coffee', { GOOGLE_SITE_VERIFICATION: 'coffee=gc,umrah=gu', BING_SITE_VERIFICATION: 'B1' }), { google: 'gc', other: { 'msvalidate.01': 'B1' } });
  assert.equal(verificationFor('umrah', { BING_SITE_VERIFICATION: 'coffee=B1' }), undefined);
});

test('IndexNow: stable key from the secret, own key allowed, only this domain, production only', async () => {
  const k = indexNowKey({ SESSION_SECRET: 'x'.repeat(40) });
  assert.match(k, /^[0-9a-f]{32}$/);
  assert.equal(k, indexNowKey({ SESSION_SECRET: 'x'.repeat(40) }));
  assert.notEqual(k, indexNowKey({ SESSION_SECRET: 'y'.repeat(40) }));
  assert.equal(indexNowKey({ INDEXNOW_KEY: 'my-own-key-123' }), 'my-own-key-123');

  const sent: { url: string; body: { host: string; key: string; keyLocation: string; urlList: string[] } }[] = [];
  const f = (async (url: string, init: RequestInit) => { sent.push({ url, body: JSON.parse(String(init.body)) }); return new Response('', { status: 202 }); }) as unknown as typeof fetch;
  assert.equal(await submitIndexNow(coffee, ['https://cairoroast.com/p/x'], f, { NODE_ENV: 'development' }), false, 'not from a laptop');
  assert.equal(await submitIndexNow(coffee, ['https://cairoroast.com/p/x', 'https://other.com/y'], f, { NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(40) }), true);
  assert.equal(sent[0].url, 'https://api.indexnow.org/indexnow');
  assert.equal(sent[0].body.host, 'cairoroast.com');
  assert.equal(sent[0].body.key, k);
  assert.equal(sent[0].body.keyLocation, 'https://cairoroast.com/indexnow-key.txt');
  assert.deepEqual(sent[0].body.urlList, ['https://cairoroast.com/p/x'], 'other hosts are never sent');
  const orig = console.error; console.error = () => {};
  try { assert.equal(await submitIndexNow(coffee, ['https://cairoroast.com/'], (async () => { throw new Error('down'); }) as unknown as typeof fetch, { NODE_ENV: 'production' }), false); } finally { console.error = orig; }
});

test('public URLs for IndexNow: home, products, box, guides, in Arabic and English', async () => {
  freshStore();
  const urls = await publicUrls(coffee);
  for (const u of ['https://cairoroast.com/', 'https://cairoroast.com/?lang=en', 'https://cairoroast.com/p/bonds-chrome', 'https://cairoroast.com/guide/ethiopian-coffee?lang=en', 'https://cairoroast.com/guide/specialty-coffee-prices-egypt']) assert.ok(urls.includes(u), u);
  assert.ok(urls.some((u) => u.includes('/b/')));
  assert.ok(!urls.some((u) => /\/(cart|checkout|admin|order)/.test(u)));
});

test('guides: 12 complete answer pages, both languages, unique slugs, FAQ on each', () => {
  const g = guidesFor('coffee');
  assert.equal(g.length, 12);
  assert.equal(new Set(g.map((x) => x.slug)).size, g.length);
  for (const x of g) {
    for (const t of [x.title, x.description, x.short, ...x.sections.flatMap((s) => [s.h, s.p]), ...x.faq.flatMap((f) => [f.q, f.a])]) {
      assert.ok(t.ar.trim() && t.en.trim(), `${x.slug}: missing text`);
      assert.ok(/[؀-ۿ]/.test(t.ar), `${x.slug}: Arabic text expected`);
    }
    assert.ok(x.faq.length >= 1, `${x.slug}: at least one FAQ`);
    assert.match(x.slug, /^[a-z0-9-]+$/);
    assert.ok(!/best (coffee )?in egypt|أحسن (بن|قهوة)[^.،"]{0,25} في مصر/i.test(JSON.stringify(x)), `${x.slug}: no "best in Egypt" claims`);
  }
  assert.ok(g.find((x) => x.slug === 'specialty-coffee-prices-egypt')?.priceTable);
});
