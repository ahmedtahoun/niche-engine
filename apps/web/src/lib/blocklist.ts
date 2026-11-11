// Shared across ALL niches: a phone that refuses deliveries is blocked everywhere.
import { markDirty } from './dirty.ts';

const REFUSALS_TO_BLOCK = 2;

interface Entry { refusals: number; reason: string | null }
const g = globalThis as unknown as { __blocklist?: Map<string, Entry> };
const s: Map<string, Entry> = (g.__blocklist ??= new Map());

export function recordRefusal(phone: string): boolean {
  const e = s.get(phone) ?? { refusals: 0, reason: null };
  e.refusals += 1;
  if (e.refusals >= REFUSALS_TO_BLOCK) e.reason = `refused_x${e.refusals}`;
  s.set(phone, e);
  markDirty('block', phone);
  return e.reason !== null;
}

export const isBlocked = (phone: string) => Boolean(s.get(phone)?.reason);
export const blockedList = () => [...s.entries()].filter(([, e]) => e.reason).map(([phone, e]) => ({ phone, reason: e.reason! }));
export const unblock = (phone: string) => { s.delete(phone); markDirty('block', phone); };
export const allBlocks = () => s;
export function loadBlocks(rows: { phone: string; refusals: number; reason: string | null }[]) {
  s.clear();
  for (const r of rows) s.set(r.phone, { refusals: r.refusals, reason: r.reason });
}
