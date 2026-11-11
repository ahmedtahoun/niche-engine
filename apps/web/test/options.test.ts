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

test('Cairo Roast: the Bonds seed SQL loads into real Postgres, re-runs keep stock, and checkout prices each weight', async () => {
  const { readFileSync } = await import('node:fs');
  const { startFakeSupabase } = await import('./postgrest-fake.ts');
  const { rowToProduct, rowToSeller } = await import('../src/lib/store/rows.ts');
  const { db } = await startFakeSupabase();
  const seed = readFileSync(new URL('../../../supabase/seed/coffee-bonds.sql', import.meta.url), 'utf8');
  await db.exec(seed);
  await db.exec(`update products set variants = jsonb_set(variants, '{0,stock}', '7') where id = 'bonds-chrome'`);
  await db.exec(seed);
  const products = (await db.query<Record<string, unknown>>('select * from products order by id')).rows.map((r) => rowToProduct(r as never));
  const sellers = (await db.query<Record<string, unknown>>('select * from sellers')).rows.map((r) => rowToSeller(r as never));
  assert.equal(products.length, 7);
  const chrome = products.find((p) => p.id === 'bonds-chrome')!;
  assert.equal(chrome.variants[0].stock, 7);
  assert.deepEqual(chrome.variants.map((v) => v.price), [225, 900]);
  const coffeeCfg = getNiche('coffee')!;
  const live = new Catalog(sellers, products);
  assert.deepEqual(live.bundleProblems(coffeeCfg), []);
  const q = live.quote(coffeeCfg, [{ kind: 'item', slug: 'bonds-ethiopia-limu', variant: '1 كجم', qty: 1 }, { kind: 'bundle', id: 'discovery_box', variant: '', qty: 1 }], opts);
  assert.deepEqual(q.problems, []);
  // Price list (1 kg): Limu 1,200; box = Chrome 225 + Limu 300 + Brazil 325 at 250 g, minus 60.
  assert.equal(q.subtotal, 1200 + 225 + 300 + 325);
  assert.equal(q.bundleDiscount, 60);
  assert.equal(q.shipping, 100);
  assert.deepEqual(live.search(coffeeCfg, { q: 'بن اثيوبي' }).map((p) => p.slug).sort(), ['bonds-ethiopia-guji', 'bonds-ethiopia-limu']);
  assert.deepEqual(products.find((p) => p.id === 'bonds-ethiopia-guji')!.variants.map((v) => v.price), [500, 2000]);
  assert.equal(products.find((p) => p.id === 'bonds-amber')!.images?.[0], '/products/coffee/amber.webp');
});

test('wholesale coffee: Bonds is paid exactly the agreed cost, Cairo Roast keeps the margin, and the cost never reaches the browser', async () => {
  const { sellerPayout, platformNet, commissionBySeller } = await import('@niche-engine/core');
  const { publicQuote } = await import('../src/lib/catalog.ts');
  const { BONDS, BONDS_PRODUCTS, withCosts } = await import('../src/lib/seeds/bonds.ts');
  const coffeeCfg = getNiche('coffee')!;
  const live = new Catalog([BONDS], withCosts(BONDS_PRODUCTS, { 'bonds-chrome': 720, 'bonds-ethiopia-guji': 1650 }));
  const q = live.quote(coffeeCfg, [{ kind: 'item', slug: 'bonds-chrome', variant: '1 كجم', qty: 2 }, { kind: 'item', slug: 'bonds-ethiopia-guji', variant: '250 جم', qty: 1 }], { isFirstOrder: false, walletBalance: 0, useWallet: false });
  // Made-up costs: real supplier prices never go in this public repository.
  assert.deepEqual(q.items.map((i) => i.unitCost), [720, 413]);
  const money = { type: 'repeat' as const, lines: q.items.map((i) => ({ sellerId: i.sellerId, unitPrice: i.unitPrice, qty: i.qty, unitCost: i.unitCost })), platformDiscount: 0, wallet: 0, delivered: true };
  // Chrome: (900 − 720) × 2 = 360; Guji 250 g: 500 − 413 = 87. The 6% repeat rate does not apply.
  assert.equal(commissionBySeller(money, coffeeCfg).bonds, 447);
  const cycle = sellerPayout('bonds', [money], coffeeCfg);
  assert.equal(cycle.net, 720 * 2 + 413, 'Bonds gets the cost');
  // Platform net = margin − 4% cashback on goods.
  assert.equal(platformNet(money, coffeeCfg), 447 - (1800 + 500) * 0.04);
  const pub = publicQuote(q);
  assert.ok(!JSON.stringify(pub).includes('unitCost'), 'no cost in what the browser gets');
  assert.equal(pub.total, q.total);
});
