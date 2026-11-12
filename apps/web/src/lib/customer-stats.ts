// Customers, rolled up from orders by phone number (guests and account holders alike). Used by the admin.
import type { Order } from './orders.ts';

/** Orders that count as a purchase (money expected or received). */
const BOUGHT = new Set(['confirmed', 'accepted', 'picked', 'delivered']);

export interface CustomerRow {
  key: string;
  phone: string;
  name: string;
  governorate: string;
  area: string;
  address: string;
  orders: number;
  delivered: number;
  refused: number;
  cancelled: number;
  /** Order totals of purchases (not cancelled or refused). */
  spent: number;
  firstAt: string;
  lastAt: string;
  /** Most bought product by units, and most chosen grind/choice. */
  favorite?: { name: string; units: number };
  topChoice?: { value: string; units: number };
  orderIds: number[];
}

export function customers(orders: Order[], keyOf: (phone: string) => string): CustomerRow[] {
  const by = new Map<string, Order[]>();
  for (const o of orders) by.set(o.customer.phone, [...(by.get(o.customer.phone) ?? []), o]);
  return [...by.entries()].map(([phone, list]) => {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const latest = list[list.length - 1];
    const bought = list.filter((o) => BOUGHT.has(o.status));
    const units = new Map<string, number>(), choices = new Map<string, number>();
    for (const o of bought) {
      for (const i of o.items) { const n = i.name.split(' — ')[0]; units.set(n, (units.get(n) ?? 0) + i.qty); }
      for (const l of o.cart) for (const v of Object.values(l.choice ?? {})) choices.set(v, (choices.get(v) ?? 0) + l.qty);
    }
    const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    const fav = top(units), ch = top(choices);
    return {
      key: keyOf(phone), phone,
      name: latest.customer.name, governorate: latest.customer.governorate, area: latest.customer.area, address: latest.customer.address,
      orders: bought.length,
      delivered: list.filter((o) => o.status === 'delivered').length,
      refused: list.filter((o) => o.status === 'refused').length,
      cancelled: list.filter((o) => o.status === 'cancelled').length,
      spent: bought.reduce((n, o) => n + o.quote.total, 0),
      firstAt: list[0].createdAt, lastAt: latest.createdAt,
      ...(fav ? { favorite: { name: fav[0], units: fav[1] } } : {}),
      ...(ch ? { topChoice: { value: ch[0], units: ch[1] } } : {}),
      orderIds: list.map((o) => o.id).reverse(),
    };
  });
}

export const daysSince = (iso: string, now = Date.now()) => Math.floor((now - Date.parse(iso)) / 864e5);
