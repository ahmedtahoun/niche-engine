// Admin access. Production requires ADMIN_PASSWORD; local dev without it is open
// (the panel shows a banner). Replace with Supabase Auth when the keys arrive.
import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'ne_admin';
const digest = (s: string) => createHash('sha256').update(`niche-engine:${s}`).digest('hex');

export const devOpen = () => !process.env.ADMIN_PASSWORD && process.env.NODE_ENV !== 'production';

export async function isAdmin(): Promise<boolean> {
  if (devOpen()) return true;
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const got = (await cookies()).get(COOKIE)?.value ?? '';
  const want = digest(pw);
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export function checkPassword(input: string): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  const a = Buffer.from(digest(input)), b = Buffer.from(digest(pw));
  return timingSafeEqual(a, b) ? digest(pw) : null;
}
