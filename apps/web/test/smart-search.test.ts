// Admin smart search: spelling variants, digits and phone formats.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matches, phoneDigits } from '../src/lib/smart-search.ts';

const mona = { text: 'منى أحمد · المعادي · القاهرة', phone: '01012345678' };

test('names: hamza, taa marbuta and alef maqsura variants, any word order', () => {
  assert.ok(matches('مني احمد', mona));
  assert.ok(matches('احمد', mona));
  assert.ok(matches('المعادى', mona));
  assert.ok(!matches('محمد', mona));
});

test('phones: Arabic digits, +20, without the leading zero, partial', () => {
  assert.ok(matches('٠١٠١٢٣٤٥٦٧٨', mona));
  assert.ok(matches('+20 101 234 5678', mona));
  assert.ok(matches('1012345678', mona));
  assert.ok(matches('5678', mona));
  assert.ok(!matches('9999', mona));
  assert.equal(phoneDigits('+201109200150'), '01109200150');
});
