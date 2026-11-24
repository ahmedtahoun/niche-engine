// Tasting-notes dictionary and the "what do you taste?" game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BONDS_PRODUCTS } from '../src/lib/seeds/bonds.ts';
import { NOTES, noteInfo, palateLevel, tastingChoices } from '../src/lib/notes.ts';

test('every note on our coffees (Arabic and English) is in the dictionary', () => {
  for (const p of BONDS_PRODUCTS) {
    for (const n of [...(p.profile?.notes ?? []), ...(p.profile?.notesEn ?? [])]) assert.ok(noteInfo(n), `${p.slug}: "${n}" has no dictionary entry`);
  }
  // Live data spells some notes a little differently: they still match.
  for (const n of ['شوكولاتة داكنة', 'مكسرات محمصة', 'سكر بني', 'خشب البلوط', 'Dark chocolate']) assert.ok(noteInfo(n), n);
});

test('the most specific note wins', () => {
  assert.equal(noteInfo('كراميل باللبن')?.id, 'milk-caramel');
  assert.equal(noteInfo('كراميل')?.id, 'caramel');
  assert.equal(noteInfo('زهر البرتقال')?.id, 'orange-blossom');
  assert.equal(noteInfo('برتقال')?.id, 'orange');
  assert.equal(noteInfo('زهور')?.id, 'floral');
  assert.equal(noteInfo('Orange blossom')?.id, 'orange-blossom');
  assert.equal(noteInfo('something new'), null);
});

test('dictionary entries are complete in both languages, ids unique', () => {
  assert.equal(new Set(NOTES.map((n) => n.id)).size, NOTES.length);
  for (const n of NOTES) for (const t of [n.name, n.what, n.when, n.like]) assert.ok(t.ar.trim() && t.en.trim() && /[؀-ۿ]/.test(t.ar), n.id);
});

test('tasting game: the real notes plus decoys from other families, stable order, 8 choices', () => {
  const notes = ['توت', 'زهور', 'مشمش', 'زهر البرتقال'];
  const a = tastingChoices(notes, 'bonds-ethiopia-guji');
  assert.equal(a.length, 8);
  assert.deepEqual(a.filter((c) => c.real).map((c) => c.info.id).sort(), ['apricot', 'berries', 'floral', 'orange-blossom']);
  assert.equal(new Set(a.map((c) => c.info.id)).size, 8, 'no repeats');
  assert.deepEqual(tastingChoices(notes, 'bonds-ethiopia-guji').map((c) => c.info.id), a.map((c) => c.info.id), 'same order every visit');
  // Decoys come from families the coffee doesn't have when possible (no fruit decoy for a fruity coffee).
  const fams = new Set(a.filter((c) => c.real).map((c) => c.info.family));
  assert.ok(a.filter((c) => !c.real).every((c) => !fams.has(c.info.family)));
});

test('palate level grows with notes caught', () => {
  assert.deepEqual([0, 2, 3, 6, 7, 11, 12, 40].map((n) => palateLevel(n).level), [1, 1, 2, 2, 3, 3, 4, 4]);
  assert.equal(palateLevel(0).next, 3);
  assert.equal(palateLevel(12).next, null);
});
