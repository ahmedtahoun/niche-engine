// Stock follows orders: taken when an order is placed (website, WhatsApp or phone),
// returned when it is cancelled or refused at the door (the courier brings it back).
import { catalog, saveProduct } from './catalog.ts';
import type { Order } from './orders.ts';
import { variantOf } from './product-stats.ts';
import type { Product } from './types.ts';

/** Applies an order's items to product stock: sign −1 takes, +1 returns. Pure (returns changed copies). */
export function stockChanges(products: Product[], items: Order['items'], sign: 1 | -1): Product[] {
  const changed = new Map<string, Product>();
  for (const i of items) {
    const base = changed.get(i.productId) ?? products.find((p) => p.id === i.productId);
    if (!base) continue;
    const p = changed.has(i.productId) ? base : structuredClone(base);
    const v = p.variants.find((x) => x.label === variantOf(p, i.variant));
    if (!v) continue;
    v.stock = Math.max(0, v.stock + sign * i.qty);
    changed.set(p.id, p);
  }
  return [...changed.values()];
}

export async function takeStock(o: Pick<Order, 'items'>) {
  for (const p of stockChanges((await catalog()).products, o.items, -1)) await saveProduct(p);
}

export async function returnStock(o: Pick<Order, 'items'>) {
  for (const p of stockChanges((await catalog()).products, o.items, 1)) await saveProduct(p);
}
