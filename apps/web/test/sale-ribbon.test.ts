// "Before" prices, ribbons and the 1 kg → 250 g buying-price rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saleOf } from '../src/lib/catalog.ts';
import { productToRow, rowToProduct } from '../src/lib/store/rows.ts';
import { gramsOf } from '../src/lib/weights.ts';
import { BONDS_PRODUCTS } from '../src/lib/seeds/bonds.ts';
import type { Product } from '../src/lib/types.ts';

const chrome = (): Product => structuredClone(BONDS_PRODUCTS.find((p) => p.id === 'bonds-chrome')!);

test('sale: the cheapest size\'s before price and the biggest discount', () => {
  const p = chrome();
  assert.deepEqual(saleOf(p), { off: 0 });
  p.variants[0].compareAt = 300; // 225 instead of 300: 25% off
  p.variants[1].compareAt = 1000; // 900 instead of 1000: 10% off
  assert.deepEqual(saleOf(p), { compareMin: 300, off: 25 });
  p.variants[0].compareAt = 200; // not above the price: ignored
  assert.deepEqual(saleOf(p), { off: 10 });
});

test('the ribbon is stored inside the profile and read back; the taste profile is untouched', () => {
  const p = { ...chrome(), ribbon: 'new' as const };
  const row = productToRow(p);
  assert.equal((row.profile as Record<string, unknown>).ribbon, 'new');
  const back = rowToProduct(row);
  assert.equal(back.ribbon, 'new');
  assert.deepEqual(back.profile, chrome().profile);
  assert.equal(rowToProduct({ ...row, profile: { ...row.profile!, ribbon: 'bogus' } as never }).ribbon, undefined, 'unknown ribbons are ignored');
});

test('weights in option labels', () => {
  assert.equal(gramsOf('250 جم'), 250);
  assert.equal(gramsOf('1 كجم'), 1000);
  assert.equal(gramsOf('500 g'), 500);
  assert.equal(gramsOf('مقاس 2'), null);
});
