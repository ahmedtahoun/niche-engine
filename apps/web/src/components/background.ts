'use client';
// Background calls that must never hold up a page change (see /api/ev).
import type { CartLine } from '@/lib/types';

function send(body: object) {
  try { void fetch('/api/ev', { method: 'POST', body: JSON.stringify(body), keepalive: true }).catch(() => {}); } catch { /* never break the store */ }
}

/** Server copy of a browser pixel event (same event id). */
export const sendMetaEvent = (niche: string, kind: 'AddToCart' | 'InitiateCheckout', id: string, cart: CartLine[], promo = '') => send({ k: 'meta', n: niche, kind, id, cart, promo });

/** Abandoned-checkout draft (phone typed at checkout). */
export const sendDraft = (niche: string, cart: CartLine[], f: { phone: string; name: string; governorate: string; promo: string }) => send({ k: 'draft', n: niche, cart, ...f });
