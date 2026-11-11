// Option prices, per-order choices (e.g. the grind) and freshness.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateNiche, type NicheConfig } from '@niche-engine/core';
import { Catalog, choiceLabels, freshnessOf, priceRange } from '../src/lib/catalog.ts';
import { getNiche } from '../src/lib/niches.ts';
import type { Product, Seller } from '../src/lib/types.ts';

const base = getNiche('umrah')!;
const cfg: NicheConfig = {
  ...base,
  categories: [...base.categories, { id: 'specialty', labelAr: 'قهوة مختصة' }, { id: 'turkish', labelAr: 'قهوة تركي' }],
  optionAxes: [{ id: 'roast', labelAr: 'التحميص' }, { id: 'weight', labelAr: 'الوزن' }],
  choices: [{ id: 'grind', labelAr: 'بتعمل قهوتك ازاي؟', categories: ['specialty'], values: [{ id: 'v60', labelAr: 'فلتر / V60' }, { id: 'espresso', labelAr: 'اسبريسو' }, { id: 'beans', labelAr: 'حبوب كاملة' }] }],
  freshness: { attribute: 'roast_date', maxAgeDays: 30, madeToOrderAr: 'بيتحمص ويتطحن بعد طلبك' },
  bundles: [{ id: 'box', nameAr: 'صندوق الاكتشاف', parts: [{ product: 'ethiopia', qty: 1, variant: 'وسط · 250 جم' }, { product: 'turkish-medium', qty: 1, variant: 'وسط · 250 جم' }], discountEgp: 50 }],
};

const seller: Seller = { id: 'me', niche: 'umrah', name: 'Cairo Roast', area: 'القاهرة', rating: 0, status: 'active' };
const product = (o: Partial<Product>): Product => ({
  id: o.slug!, niche: 'umrah', slug: o.slug!, sellerId: 'me', category: 'specialty', art: 'bag', color: '#5a3b28', nameAr: 'قهوة', leadAr: '', price: 300,
  attributes: {}, views: 0, reviews: [], faq: [], status: 'live',
  variants: [
    { label: 'وسط · 250 جم', stock: 10, opts: { roast: 'وسط', weight: '250 جم' } },
    { label: 'وسط · 1 كجم', stock: 4, price: 1050, opts: { roast: 'وسط', weight: '1 كجم' } },
  ],
  ...o,
});
const eth = product({ slug: 'ethiopia', nameAr: 'إثيوبيا' });
const tur = product({ slug: 'turkish-medium', nameAr: 'تركي وسط', category: 'turkish', price: 250, variants: [{ label: 'وسط · 250 جم', stock: 9, opts: { roast: 'وسط', weight: '250 جم' } }] });
const cat = new Catalog([seller], [eth, tur]);
const opts = { isFirstOrder: false, walletBalance: 0, useWallet: false };

test('niche config with option axes, choices and freshness is valid; bad ones are caught', () => {
  assert.deepEqual(validateNiche(cfg), []);
  const bad = validateNiche({ ...cfg, choices: [{ id: 'grind', labelAr: 'x', categories: ['nope'], values: [] }] });
  assert.ok(bad.some((p) => p.includes('unknown category nope')));
  assert.ok(bad.some((p) => p.includes('at least one value')));
});

test('each option is priced from the catalog; cards show the lowest', () => {
  assert.deepEqual(priceRange(eth), { min: 300, max: 1050 });
  const q = cat.quote(cfg, [{ kind: 'item', slug: 'ethiopia', variant: 'وسط · 1 كجم', qty: 2, choice: { grind: 'espresso' } }], opts);
  assert.deepEqual(q.problems, []);
  assert.equal(q.subtotal, 2100);
  assert.equal(q.items[0].unitPrice, 1050);
});

test('the grind is required where it applies and printed on the order for the seller', () => {
  const missing = cat.quote(cfg, [{ kind: 'item', slug: 'ethiopia', variant: 'وسط · 250 جم', qty: 1 }], opts);
  assert.deepEqual(missing.problems, ['choice_missing:ethiopia']);
  assert.equal(missing.items.length, 0);
  const unknown = cat.quote(cfg, [{ kind: 'item', slug: 'ethiopia', variant: 'وسط · 250 جم', qty: 1, choice: { grind: 'hammer' } }], opts);
  assert.deepEqual(unknown.problems, ['choice_missing:ethiopia']);
  const ok = cat.quote(cfg, [{ kind: 'item', slug: 'ethiopia', variant: 'وسط · 250 جم', qty: 1, choice: { grind: 'v60' } }], opts);
  assert.equal(ok.items[0].variant, 'وسط · 250 جم · فلتر / V60');
  // Turkish coffee takes no grind choice: it is always ground for the kanaka.
  const t = cat.quote(cfg, [{ kind: 'item', slug: 'turkish-medium', variant: 'وسط · 250 جم', qty: 1 }], opts);
  assert.deepEqual(t.problems, []);
  assert.equal(t.items[0].variant, 'وسط · 250 جم');
  assert.deepEqual(choiceLabels(cfg, tur, undefined), []);
});

test('a bundle asks the grind once and applies it only to the parts that take it', () => {
  const q = cat.quote(cfg, [{ kind: 'bundle', id: 'box', variant: '', qty: 1, choice: { grind: 'beans' } }], opts);
  assert.deepEqual(q.problems, []);
  assert.deepEqual(q.items.map((i) => i.variant), ['وسط · 250 جم · حبوب كاملة', 'وسط · 250 جم']);
  assert.equal(q.subtotal, 550);
  assert.equal(q.bundleDiscount, 50);
  assert.deepEqual(cat.quote(cfg, [{ kind: 'bundle', id: 'box', variant: '', qty: 1 }], opts).problems, ['choice_missing:box']);
});

test('freshness: no date means made to order; a dated product goes stale after the limit', () => {
  const now = Date.parse('2026-11-11');
  assert.deepEqual(freshnessOf(cfg, eth, now), { kind: 'to_order', text: 'بيتحمص ويتطحن بعد طلبك' });
  assert.deepEqual(freshnessOf(cfg, product({ slug: 'a', attributes: { roast_date: '2026-11-08' } }), now), { kind: 'dated', days: 3, stale: false });
  assert.equal((freshnessOf(cfg, product({ slug: 'b', attributes: { roast_date: '2026-10-01' } }), now) as { stale: boolean }).stale, true);
  assert.equal(freshnessOf(base, eth, now), null);
});
