// Customer session: an HMAC-signed cookie holding the phone and an expiry.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'ne_session';
export const SESSION_DAYS = 90;

const g = globalThis as unknown as { __devSecret?: string };
function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required in production');
  return (g.__devSecret ??= randomBytes(32).toString('hex'));
}

const mac = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function signSession(phone: string, now = Date.now()): string {
  const payload = `${phone}.${now + SESSION_DAYS * 864e5}`;
  return `${payload}.${mac(payload)}`;
}

/** Returns the phone for a valid, unexpired token, else null. */
export function readSession(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i), sig = token.slice(i + 1);
  const want = mac(payload);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  const [phone, exp] = payload.split('.');
  return Number(exp) > now && /^01[0125]\d{8}$/.test(phone) ? phone : null;
}
