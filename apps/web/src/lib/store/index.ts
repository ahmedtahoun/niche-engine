// Picks the store: Supabase when its keys are set, otherwise the in-process demo
// store (local development, or a demo deployment with ALLOW_DEMO_DATA=1).
import { dbEnabled } from '../db/rest.ts';
import { PRODUCTS, SELLERS } from '../demo-data.ts';
import { MemoryStore } from './memory.ts';
import { SupabaseStore } from './supabase.ts';
import type { Store } from './types.ts';

const g = globalThis as unknown as { __store?: Store };

export function store(): Store {
  return (g.__store ??= dbEnabled() ? new SupabaseStore() : new MemoryStore({ sellers: SELLERS, products: PRODUCTS }));
}

/** Tests: start from a fresh store. */
export function setStore(s: Store) {
  g.__store = s;
}

export type { Store } from './types.ts';
