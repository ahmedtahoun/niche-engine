// "Coffees like this one" on product pages: same taste first, then same type, never itself or sold out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { similarTo } from '../src/lib/catalog.ts';
import type { Product } from '../src/lib/types.ts';

const P = (id: string, category: string, family?: string, stock = 5) => ({ id, category, profile: family ? { family } : undefined, variants: [{ label: '250', stock }] }) as unknown as Product;

test('similar: same taste family, then same category, best-seller order kept, self and sold out left out', () => {
  const me = P('me', 'single-origin', 'fruity');
  const all = [P('a', 'blends', 'choc'), me, P('b', 'single-origin', 'choc'), P('c', 'blends', 'fruity'), P('d', 'single-origin', 'fruity', 0), P('e', 'single-origin', 'fruity'), P('f', 'blends')];
  assert.deepEqual(similarTo(me, all).map((x) => x.id), ['e', 'c', 'b', 'a']);
  assert.deepEqual(similarTo(me, all, 2).map((x) => x.id), ['e', 'c']);
  assert.deepEqual(similarTo(me, [me]), []);
});
