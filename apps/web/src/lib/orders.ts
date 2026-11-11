// Orders. Stored in the database; every change goes through mutateOrder(), which
// re-reads the order, applies the change and saves it only if nobody else changed
// it in between (otherwise it retries with the fresh copy).
import { store } from './store/index.ts';
import type { CartLine, OrderItem, Quote } from './types.ts';

export type OrderStatus = 'awaiting_confirm' | 'confirmed' | 'accepted' | 'picked' | 'delivered' | 'refused' | 'cancelled';
/** Each seller's part of a (possibly multi-seller) order. */
export type SellerPart = 'pending' | 'accepted' | 'rejected' | 'handed';

/** One Bosta delivery per seller per order. */
export interface Shipment {
  deliveryId: string;
  tracking: string;
  status: 'created' | 'picked' | 'in_transit' | 'delivered' | 'returned' | 'exception' | 'cancelled';
  cod: number;
}

export interface Order {
  id: number;
  niche: string;
  status: OrderStatus;
  createdAt: string;
  deliveredAt?: string;
  type: 'new' | 'repeat';
  payment: 'cod' | 'instapay';
  /** Delivery details as typed at checkout. */
  customer: { name: string; phone: string; governorate: string; area: string; address: string; landmark: string };
  cart: CartLine[];
  quote: Quote;
  items: OrderItem[];
  sellerState: Record<string, SellerPart>;
  shipments?: Record<string, Shipment>;
  promoCode?: string;
  needsAttention?: string;
  /** Changes on every save; an update based on an older version is refused. */
  version: number;
}

export type OrderDraft = Omit<Order, 'id' | 'createdAt' | 'items' | 'sellerState' | 'version'>;

/** Adds the per-seller fields to a new order. */
export function draftOrder(o: OrderDraft): Omit<Order, 'id' | 'createdAt' | 'version'> {
  const items = o.quote.items;
  const sellerState = Object.fromEntries([...new Set(items.map((i) => i.sellerId))].map((s) => [s, 'pending' as SellerPart]));
  return { ...o, items, sellerState };
}

export async function getOrder(niche: string, id: number): Promise<Order | null> {
  const o = await store().getOrder(id);
  return o && o.niche === niche ? o : null;
}

export const orderById = (id: number) => store().getOrder(id);

/** A customer's orders in one niche, newest first (cancelled ones left out). */
export async function ordersFor(phone: string, niche: string): Promise<Order[]> {
  return (await store().listOrders({ phone, niche })).filter((o) => o.status !== 'cancelled');
}

/**
 * Applies `change` to the latest copy of an order and saves it.
 * `change` returns false when the change isn't allowed (nothing is saved).
 * It may run more than once if another request changed the order at the same
 * time, so it must only edit the order: send messages after this returns.
 */
export async function mutateOrder(id: number, change: (o: Order) => boolean): Promise<Order | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const o = await store().getOrder(id);
    if (!o || !change(o)) return null;
    const saved = await store().updateOrder(o);
    if (saved) return saved;
  }
  throw new Error(`order ${id}: too many concurrent changes`);
}

// ---------- pure state changes (used inside mutateOrder) ----------

export function applyStatus(o: Order, from: OrderStatus[], to: OrderStatus): boolean {
  if (!from.includes(o.status)) return false;
  o.status = to;
  if (to === 'delivered') o.deliveredAt = new Date().toISOString();
  return true;
}

/** Updates one seller's part and rolls the order status forward when every seller is done. */
export function applySellerPart(o: Order, sellerId: string, part: SellerPart): boolean {
  if (!(sellerId in o.sellerState) || !['confirmed', 'accepted'].includes(o.status)) return false;
  const current = o.sellerState[sellerId];
  const allowed: Record<SellerPart, SellerPart[]> = { pending: [], accepted: ['pending'], rejected: ['pending'], handed: ['accepted'] };
  if (!allowed[part].includes(current)) return false;
  o.sellerState[sellerId] = part;
  const parts = Object.values(o.sellerState);
  if (part === 'rejected') o.needsAttention = 'seller_rejected';
  if (parts.every((p) => p === 'accepted' || p === 'handed')) o.status = 'accepted';
  if (parts.every((p) => p === 'handed')) o.status = 'picked';
  return true;
}

export const itemsOfSeller = (o: Order, sellerId: string) => o.items.filter((i) => i.sellerId === sellerId);
