import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountByPhone, createAccount, hashPassword, saveAddress, signIn, verifyPassword } from '../src/lib/customers.ts';
import { accountToRow, rowToAccount } from '../src/lib/persist.ts';
import { readSession, signSession } from '../src/lib/session.ts';

test('passwords are stored only as salted hashes', () => {
  const a = hashPassword('sakina123');
  const b = hashPassword('sakina123');
  assert.notEqual(a, b, 'same password, different salt');
  assert.ok(!a.includes('sakina123'));
  assert.ok(verifyPassword('sakina123', a));
  assert.ok(!verifyPassword('sakina124', a));
  assert.ok(!verifyPassword('anything', 'garbage'));
});

test('sign in: right password, wrong password, unknown phone', () => {
  createAccount('01033334444', 'منى', 'secret12');
  assert.equal(signIn('01033334444', 'secret12'), 'ok');
  assert.equal(signIn('01033334444', 'nope'), 'wrong');
  assert.equal(signIn('01099998888', 'secret12'), 'no_account');
  assert.throws(() => createAccount('01033334444', 'x', 'y'), /exists/);
});

test('five wrong passwords lock the phone, even for the right password', () => {
  createAccount('01044445555', 'هبة', 'goodpass');
  for (let i = 0; i < 5; i++) assert.equal(signIn('01044445555', 'bad'), 'wrong');
  assert.equal(signIn('01044445555', 'goodpass'), 'locked');
});

test('saved address is kept on the account and survives the database round trip', () => {
  createAccount('01055556677', 'سلمى', 'pass1234');
  saveAddress('01055556677', { name: 'سلمى أحمد', governorate: 'الإسكندرية', area: 'سموحة', address: '5 شارع فوزي معاذ', landmark: '' });
  const a = accountByPhone('01055556677')!;
  assert.equal(a.governorate, 'الإسكندرية');
  assert.deepEqual(rowToAccount(accountToRow(a)), a);
  assert.ok(verifyPassword('pass1234', rowToAccount(accountToRow(a)).passwordHash));
});

test('session cookie: valid, tampered and expired', () => {
  const t = signSession('01012345678');
  assert.equal(readSession(t), '01012345678');
  assert.equal(readSession(t.replace('01012345678', '01087654321')), null, 'changing the phone breaks the signature');
  assert.equal(readSession(signSession('01012345678', Date.now() - 100 * 864e5)), null, 'expired after 90 days');
  assert.equal(readSession(undefined), null);
  assert.equal(readSession('junk'), null);
});
