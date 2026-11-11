// Per-visitor rate limits for checkout and sign-in (stops scripts flooding sellers
// with fake orders or guessing passwords). Counted per process: a first line of
// defence. The hard limits that must hold everywhere (wrong passwords per phone,
// orders per phone per day) are counted in the database.
import { headers } from 'next/headers';

const g = globalThis as unknown as { __rate?: Map<string, number[]> };
const hits: Map<string, number[]> = (g.__rate ??= new Map());

/** True if this key made fewer than `max` calls in the last `windowMs`, and records the call. */
export function allow(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(key, recent); return false; }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 50_000) for (const [k, ts] of hits) if (!ts.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}

/** The visitor's IP as seen by the proxy in front of the app. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim();
}
