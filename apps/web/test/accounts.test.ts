import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountByPhone, createAccount, hashPassword, saveAddress, signIn, verifyPassword } from '../src/lib/customers.ts';
import { accountToRow, rowToAccount } from '../src/lib/store/rows.ts';
import { freshStore } from './helpers.ts';
import { readSession, signSession } from '../src/lib/session.ts';

freshStore();

test('passwords are stored only as salted hashes', async () => {
  const a = await hashPassword('sakina123');
  const b = await hashPassword('sakina123');
  assert.notEqual(a, b, 'same password, different salt');
  assert.ok(!a.includes('sakina123'));
  assert.ok(await verifyPassword('sakina123', a));
  assert.ok(!(await verifyPassword('sakina124', a)));
  assert.ok(!(await verifyPassword('anything', 'garbage')));
});

test('sign in: right password, wrong password, unknown phone', async () => {
  await createAccount('01033334444', 'منى', 'secret12');
  assert.equal(await signIn('01033334444', 'secret12'), 'ok');
  assert.equal(await signIn('01033334444', 'nope'), 'wrong');
  assert.equal(await signIn('01099998888', 'secret12'), 'no_account');
  await assert.rejects(() => createAccount('01033334444', 'x', 'y'), /exists/);
});

test('five wrong passwords lock the phone, even for the right password', async () => {
  await createAccount('01044445555', 'هبة', 'goodpass');
  for (let i = 0; i < 5; i++) assert.equal(await signIn('01044445555', 'bad'), 'wrong');
  assert.equal(await signIn('01044445555', 'goodpass'), 'locked');
});

test('saved address is kept on the account and survives the database round trip', async () => {
  await createAccount('01055556677', 'سلمى', 'pass1234');
  await saveAddress('01055556677', { name: 'سلمى أحمد', governorate: 'الإسكندرية', area: 'سموحة', address: '5 شارع فوزي معاذ', landmark: '' });
  const a = (await accountByPhone('01055556677'))!;
  assert.equal(a.governorate, 'الإسكندرية');
  assert.deepEqual(rowToAccount(accountToRow(a)), a);
  assert.ok(await verifyPassword('pass1234', rowToAccount(accountToRow(a)).passwordHash));
});

test('session cookie: valid, tampered and expired', () => {
  const t = signSession('01012345678');
  assert.equal(readSession(t), '01012345678');
  assert.equal(readSession(t.replace('01012345678', '01087654321')), null, 'changing the phone breaks the signature');
  assert.equal(readSession(signSession('01012345678', Date.now() - 100 * 864e5)), null, 'expired after 90 days');
  assert.equal(readSession(undefined), null);
  assert.equal(readSession('junk'), null);
});
