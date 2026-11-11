// The English store: every text exists in both languages, and orders stay Arabic for sellers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speak, TEXTS } from '../src/lib/i18n.ts';
import { catalog } from '../src/lib/catalog.ts';
import { getNiche } from '../src/lib/niches.ts';
import { freshStore } from './helpers.ts';

freshStore();

test('every store text has Arabic and English, and placeholders match', () => {
  const vars = (x: string) => [...x.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  const all = Object.entries(TEXTS);
  assert.ok(all.length > 150, `found ${all.length} texts`);
  for (const [key, e] of all) {
    assert.ok(e.ar.trim() && e.en.trim(), `${key} needs both languages`);
    // "unit" is Arabic grammar only (أيام / يوم); every other placeholder must appear in both.
    assert.equal(vars(e.en), vars(e.ar.replace('{unit}', '')), `${key}: English and Arabic use different placeholders`);
    if (e.arF) assert.equal(vars(e.arF), vars(e.ar), `${key}: feminine Arabic placeholders differ`);
  }
});

test('voice, money and governorates per language', () => {
  assert.equal(speak('ar', 'f').t('pickFirst'), 'اختاري الأول');
  assert.equal(speak('ar', 'm').t('pickFirst'), 'اختار الأول');
  assert.equal(speak('en').t('pickFirst'), 'Choose first');
  assert.equal(speak('en').egp(1140), 'EGP 1,140');
  assert.equal(speak('ar').egp(1140), '1,140 ج');
  assert.equal(speak('en').gov('الإسكندرية'), 'Alexandria');
  assert.equal(speak('en').t('buyNow', { price: 'EGP 225' }), 'Buy now · EGP 225');
});

test('an English cart shows English titles while the order items stay Arabic for the seller', async () => {
  const cfg = getNiche('coffee')!;
  const cat = await catalog();
  const opts = { isFirstOrder: true, walletBalance: 0, useWallet: false };
  const en = cat.quote(cfg, [{ kind: 'item', slug: 'bonds-ethiopia-limu', variant: '1 كجم', qty: 1 }], { ...opts, lang: 'en' });
  assert.equal(en.lines[0].title, 'Ethiopia Limu · 1 kg');
  assert.equal(en.lines[0].by, 'Bonds Coffee Roasters');
  assert.equal(en.items[0].name, 'إثيوبيا ليمو');
  assert.equal(en.items[0].variant, '1 كجم');
  const ar = cat.quote(cfg, [{ kind: 'item', slug: 'bonds-ethiopia-limu', variant: '1 كجم', qty: 1 }], opts);
  assert.equal(ar.lines[0].title, 'إثيوبيا ليمو · 1 كجم');
  assert.equal(en.total, ar.total);
  // English search finds products by their English names too.
  assert.equal(cat.search(cfg, { q: 'cerrado' })[0]?.slug, 'bonds-brazil-cerrado');
});
