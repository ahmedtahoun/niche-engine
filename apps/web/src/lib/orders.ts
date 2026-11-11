// In-memory order store for the demo. Swap for Supabase `orders` + `order_items` + `shipments`.
import { markDirty } from './dirty.ts';
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
  customer: { name: string; phone: string; governorate: string; area: string; address: string; landmark: string };
  cart: CartLine[];
  quote: Quote;
  items: OrderItem[];
  sellerState: Record<string, SellerPart>;
  shipments?: Record<string, Shipment>;
  promoCode?: string;
  needsAttention?: string;
}

interface Store { nextId: number; orders: Order[] }
const g = globalThis as unknown as { __nicheStore?: Store };
const store: Store = (g.__nicheStore ??= { nextId: 1001, orders: [] });

export function ordersFor(phone: string, niche: string): Order[] {
  return store.orders.filter((o) => o.customer.phone === phone && o.niche === niche && o.status !== 'cancelled');
}

export function saveOrder(o: Omit<Order, 'id' | 'createdAt' | 'items' | 'sellerState'>): Order {
  const items = o.quote.items;
  const sellerState = Object.fromEntries([...new Set(items.map((i) => i.sellerId))].map((s) => [s, 'pending' as SellerPart]));
  const order: Order = { ...o, items, sellerState, id: store.nextId++, createdAt: new Date().toISOString() };
  store.orders.unshift(order);
  markDirty('order', order.id);
  return order;
}

export function getOrder(niche: string, id: number): Order | null {
  return store.orders.find((o) => o.id === id && o.niche === niche) ?? null;
}

export const orderById = (id: number) => store.orders.find((o) => o.id === id) ?? null;

export function setStatus(niche: string, id: number, from: OrderStatus[], to: OrderStatus): Order | null {
  const o = getOrder(niche, id);
  if (!o || !from.includes(o.status)) return null;
  o.status = to;
  if (to === 'delivered') o.deliveredAt = new Date().toISOString();
  markDirty('order', o.id);
  return o;
}

/** Updates one seller's part and rolls the order status forward when every seller is done. */
export function setSellerPart(o: Order, sellerId: string, part: SellerPart): boolean {
  if (!(sellerId in o.sellerState) || !['confirmed', 'accepted'].includes(o.status)) return false;
  const current = o.sellerState[sellerId];
  const allowed: Record<SellerPart, SellerPart[]> = { pending: [], accepted: ['pending'], rejected: ['pending'], handed: ['accepted'] };
  if (!allowed[part].includes(current)) return false;
  o.sellerState[sellerId] = part;
  const parts = Object.values(o.sellerState);
  if (part === 'rejected') o.needsAttention = 'seller_rejected';
  if (parts.every((p) => p === 'accepted' || p === 'handed')) o.status = 'accepted';
  if (parts.every((p) => p === 'handed')) o.status = 'picked';
  markDirty('order', o.id);
  return true;
}

export const itemsOfSeller = (o: Order, sellerId: string) => o.items.filter((i) => i.sellerId === sellerId);

export const allOrders = () => store.orders;

/** Replaces the store with orders loaded from the database (newest first). */
export function loadOrders(list: Order[]) {
  store.orders = [...list].sort((a, b) => b.id - a.id);
  store.nextId = Math.max(1000, ...list.map((x) => x.id)) + 1;
}
