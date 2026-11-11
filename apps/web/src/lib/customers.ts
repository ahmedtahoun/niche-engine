// Customer accounts: phone + password, shared across all niches (one phone = one person).
// Passwords are stored only as scrypt hashes with a per-account salt.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { markDirty } from './dirty.ts';

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

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, s, h] = stored.split('$');
  if (scheme !== 'scrypt' || !s || !h) return false;
  const want = Buffer.from(h, 'base64');
  const got = scryptSync(password, Buffer.from(s, 'base64'), want.length);
  return timingSafeEqual(got, want);
}

const g = globalThis as unknown as { __accounts?: Map<string, Account>; __attempts?: Map<string, number[]> };
const accounts: Map<string, Account> = (g.__accounts ??= new Map());
const attempts: Map<string, number[]> = (g.__attempts ??= new Map());

export const accountByPhone = (phone: string) => accounts.get(phone) ?? null;
export const allAccounts = () => accounts;

export function createAccount(phone: string, name: string, password: string): Account {
  if (accounts.has(phone)) throw new Error('exists');
  const a: Account = { phone, name, passwordHash: hashPassword(password), governorate: '', area: '', address: '', landmark: '', createdAt: new Date().toISOString() };
  accounts.set(phone, a);
  markDirty('customer', phone);
  return a;
}

export function saveAddress(phone: string, d: Pick<Account, 'name' | 'governorate' | 'area' | 'address' | 'landmark'>) {
  const a = accounts.get(phone);
  if (!a) return;
  Object.assign(a, d);
  markDirty('customer', phone);
}

/** 5 wrong passwords per phone in 15 minutes locks sign-in for that phone. */
const WINDOW = 15 * 60 * 1000, MAX = 5;
export function tooManyAttempts(phone: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(phone) ?? []).filter((t) => now - t < WINDOW);
  attempts.set(phone, recent);
  return recent.length >= MAX;
}
export const recordFailure = (phone: string) => attempts.set(phone, [...(attempts.get(phone) ?? []), Date.now()]);
export const clearFailures = (phone: string) => attempts.delete(phone);

/** Checks a password with the attempt limit. */
export function signIn(phone: string, password: string): 'ok' | 'no_account' | 'wrong' | 'locked' {
  if (tooManyAttempts(phone)) return 'locked';
  const a = accounts.get(phone);
  if (!a) return 'no_account';
  if (!verifyPassword(password, a.passwordHash)) { recordFailure(phone); return 'wrong'; }
  clearFailures(phone);
  return 'ok';
}

export function loadAccounts(list: Account[]) {
  accounts.clear();
  for (const a of list) accounts.set(a.phone, a);
}
