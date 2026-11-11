'use client';
// Cart kept in the browser per niche. Holds only slugs, variants and quantities.
import { useEffect, useState } from 'react';
import type { CartLine } from '@/lib/types';

const key = (niche: string) => `cart:${niche}`;
const EVENT = 'cart-change';

export function readCart(niche: string): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(key(niche)) ?? '[]') as CartLine[];
  } catch {
    return [];
  }
}

export function writeCart(niche: string, lines: CartLine[]) {
  try {
    localStorage.setItem(key(niche), JSON.stringify(lines));
  } catch {
    /* storage blocked: the cart lives for this page only */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function addLine(niche: string, line: CartLine) {
  const lines = readCart(niche);
  const same = lines.find((l) => l.kind === line.kind && (l.kind === 'item' ? l.slug === (line as typeof l).slug : l.id === (line as typeof l).id) && l.variant === line.variant && JSON.stringify(l.choice ?? {}) === JSON.stringify(line.choice ?? {}));
  if (same) same.qty = Math.min(5, same.qty + line.qty);
  else lines.push(line);
  writeCart(niche, lines);
}

export function useCart(niche: string): [CartLine[], (l: CartLine[]) => void, boolean] {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setLines(readCart(niche));
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [niche]);
  return [lines, (l) => writeCart(niche, l), ready];
}
