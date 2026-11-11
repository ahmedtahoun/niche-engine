// DEV ONLY: fills the in-process demo store with sample orders so the admin panel
// has something to show. Never runs with a real database or in production.
import { catalog } from './catalog.ts';
import { getNiche } from './niches.ts';
import { draftOrder, type Order, type OrderStatus } from './orders.ts';
import { store } from './store/index.ts';
import type { CartLine } from './types.ts';

const g = globalThis as unknown as { __seeded?: unknown };

const PLAN: { niche: string; cart: CartLine[]; status: OrderStatus; name: string; phone: string; gov: string; type: 'new' | 'repeat'; hoursAgo: number }[] = [
  { niche: 'umrah', cart: [{ kind: 'bundle', id: 'umrah_kit_women', variant: '3', qty: 1 }], status: 'delivered', name: 'دينا', phone: '01011110001', gov: 'الجيزة', type: 'new', hoursAgo: 40 },
  { niche: 'umrah', cart: [{ kind: 'item', slug: 'black-nada-abaya', variant: '2', qty: 1 }], status: 'delivered', name: 'رحاب', phone: '01211110002', gov: 'القاهرة', type: 'repeat', hoursAgo: 30 },
  { niche: 'umrah', cart: [{ kind: 'item', slug: 'two-layer-niqab-black', variant: 'مقاس واحد', qty: 2 }], status: 'picked', name: 'آية', phone: '01111110003', gov: 'المنصورة', type: 'new', hoursAgo: 20 },
  { niche: 'umrah', cart: [{ kind: 'item', slug: 'cotton-ihram-2pc', variant: 'L', qty: 1 }], status: 'confirmed', name: 'أم يوسف', phone: '01511110004', gov: 'أسيوط', type: 'new', hoursAgo: 5 },
  { niche: 'umrah', cart: [{ kind: 'item', slug: 'chiffon-hijab-sand', variant: 'مقاس واحد', qty: 2 }], status: 'refused', name: 'شيماء', phone: '01011110005', gov: 'طنطا', type: 'new', hoursAgo: 50 },
  { niche: 'umrah', cart: [{ kind: 'item', slug: 'crepe-umrah-abaya-beige', variant: '1', qty: 1 }], status: 'awaiting_confirm', name: 'ريم', phone: '01011110006', gov: 'القاهرة', type: 'new', hoursAgo: 1 },
];

export async function seedDemoOrders() {
  const s = store();
  if (process.env.NODE_ENV === 'production' || s.kind !== 'memory' || g.__seeded === s) return;
  g.__seeded = s;
  if ((await s.listOrders({ limit: 1 })).length) return;
  const cat = await catalog();
  for (const p of PLAN) {
    const cfg = getNiche(p.niche);
    if (!cfg) continue;
    const q = cat.quote(cfg, p.cart, { isFirstOrder: p.type === 'new', walletBalance: 0, useWallet: false });
    const created = await s.createOrder(draftOrder({ niche: p.niche, status: p.status, type: p.type, payment: 'cod', cart: p.cart, quote: q, customer: { name: p.name, phone: p.phone, governorate: p.gov, area: '—', address: 'عنوان تجريبي', landmark: '' } }), null);
    if (created === 'wallet_conflict') continue;
    const o: Order = created;
    o.createdAt = new Date(Date.now() - p.hoursAgo * 36e5).toISOString();
    const part = { delivered: 'handed', picked: 'handed', accepted: 'accepted', refused: 'handed' }[p.status as string] as Order['sellerState'][string] | undefined;
    if (part) for (const sid of Object.keys(o.sellerState)) o.sellerState[sid] = part;
    if (p.status === 'delivered') o.deliveredAt = new Date(Date.now() - (p.hoursAgo - 20) * 36e5).toISOString();
    await s.updateOrder(o);
  }
}
