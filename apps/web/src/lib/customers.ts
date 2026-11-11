// Customer accounts: phone + password, shared across all niches (one phone = one person).
// Passwords are stored only as scrypt hashes with a per-account salt.
// Wrong-password counts live in the database, so the limit holds across processes.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { store } from './store/index.ts';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export interface Account {
  phone: string;
  name: string;
  passwordHash: string;
  governorate: string;
  area: string;
  address: string;
  landmark: string;
  createdAt: string;
}

export const MIN_PASSWORD = 6;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, s, h] = stored.split('$');
  if (scheme !== 'scrypt' || !s || !h) return false;
  const want = Buffer.from(h, 'base64');
  const got = await scryptAsync(password, Buffer.from(s, 'base64'), want.length);
  return timingSafeEqual(got, want);
}

export const accountByPhone = (phone: string) => store().getAccount(phone);

/** Throws 'exists' if the phone already has an account. */
export async function createAccount(phone: string, name: string, password: string): Promise<Account> {
  const a: Account = { phone, name, passwordHash: await hashPassword(password), governorate: '', area: '', address: '', landmark: '', createdAt: new Date().toISOString() };
  if (!(await store().createAccount(a))) throw new Error('exists');
  return a;
}

export async function saveAddress(phone: string, d: Pick<Account, 'name' | 'governorate' | 'area' | 'address' | 'landmark'>) {
  await store().updateAccount(phone, d);
}

/** 5 wrong passwords per phone in 15 minutes locks sign-in for that phone. */
const WINDOW = 15 * 60 * 1000, MAX = 5;
export async function tooManyAttempts(phone: string): Promise<boolean> {
  return (await store().countAuthFailures(phone, new Date(Date.now() - WINDOW).toISOString())) >= MAX;
}

/** Checks a password with the attempt limit. */
export async function signIn(phone: string, password: string): Promise<'ok' | 'no_account' | 'wrong' | 'locked'> {
  if (await tooManyAttempts(phone)) return 'locked';
  const a = await store().getAccount(phone);
  if (!a) return 'no_account';
  if (!(await verifyPassword(password, a.passwordHash))) { await store().addAuthFailure(phone); return 'wrong'; }
  await store().clearAuthFailures(phone);
  return 'ok';
}
