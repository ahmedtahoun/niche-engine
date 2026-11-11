// Change tracker. Code that mutates data calls markDirty(); when a database is
// connected, persist.ts registers a flusher that writes the changes shortly after.
// With no database, markDirty() does nothing.

export type Kind = 'seller' | 'product' | 'order' | 'block' | 'payout' | 'customer' | 'wallet';

const g = globalThis as unknown as { __dirty?: { sets: Record<Kind, Set<string>>; flusher: (() => Promise<void>) | null; timer: ReturnType<typeof setTimeout> | null; running: Promise<void> | null } };
const state = (g.__dirty ??= { sets: { seller: new Set(), product: new Set(), order: new Set(), block: new Set(), payout: new Set(), customer: new Set(), wallet: new Set() }, flusher: null, timer: null, running: null });

export function markDirty(kind: Kind, id: string | number) {
  if (!state.flusher) return;
  state.sets[kind].add(String(id));
  if (!state.timer) state.timer = setTimeout(() => { state.timer = null; void flushNow(); }, 50);
}

/** Takes the pending ids for one kind (clears them). */
export function take(kind: Kind): string[] {
  const ids = [...state.sets[kind]];
  state.sets[kind].clear();
  return ids;
}

export function setFlusher(f: (() => Promise<void>) | null) {
  state.flusher = f;
}

export async function flushNow() {
  if (!state.flusher) return;
  if (state.running) await state.running;
  state.running = state.flusher().catch((e) => console.error('[persist] flush failed, will retry on next change:', e)).finally(() => { state.running = null; });
  await state.running;
}
