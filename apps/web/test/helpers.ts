// Shared test setup: a fresh in-process store seeded with the demo catalog.
import { catalog, invalidateCatalog } from '../src/lib/catalog.ts';
import { PRODUCTS, SELLERS } from '../src/lib/demo-data.ts';
import { getNiche } from '../src/lib/niches.ts';
import { draftOrder, type Order, type OrderStatus } from '../src/lib/orders.ts';
import { MemoryStore } from '../src/lib/store/memory.ts';
import { setStore, store } from '../src/lib/store/index.ts';
import type { CartLine } from '../src/lib/types.ts';

export function freshStore() {
  const s = new MemoryStore({ sellers: SELLERS, products: PRODUCTS });
  setStore(s);
  invalidateCatalog();
  return s;
}

export const KIT: CartLine[] = [{ kind: 'bundle', id: 'umrah_kit_women', variant: '2', qty: 1 }];
export const CUSTOMER = { name: 'منى عبد الرحمن', phone: '01012345678', governorate: 'القاهرة', area: 'مدينة نصر', address: '14 شارع الطيران', landmark: '' };

/** Saves an order straight to the store (no checkout rules), priced from the catalog. */
export async function makeOrder(o: { cart?: CartLine[]; status?: OrderStatus; type?: 'new' | 'repeat'; payment?: 'cod' | 'instapay'; promo?: string; phone?: string; walletBalance?: number; niche?: string } = {}): Promise<Order> {
  const niche = o.niche ?? 'umrah';
  const cfg = getNiche(niche)!;
  const cart = o.cart ?? KIT;
  const q = (await catalog()).quote(cfg, cart, { promoCode: o.promo, isFirstOrder: (o.type ?? 'new') === 'new', walletBalance: o.walletBalance ?? 0, useWallet: (o.walletBalance ?? 0) > 0 });
  const saved = await store().createOrder(draftOrder({ niche, status: o.status ?? 'confirmed', type: o.type ?? 'new', payment: o.payment ?? 'cod', cart, quote: q, customer: { ...CUSTOMER, phone: o.phone ?? CUSTOMER.phone } }), null);
  if (saved === 'wallet_conflict') throw new Error('unexpected wallet conflict');
  return saved;
}
