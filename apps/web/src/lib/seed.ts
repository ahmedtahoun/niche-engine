// DEV ONLY: fills an empty order store so the admin panel has something to show.
import { quote } from './catalog.ts';
import { dbEnabled } from './db/rest.ts';
import { getNiche } from './niches.ts';
import { allOrders, saveOrder, type Order, type OrderStatus } from './orders.ts';
import type { CartLine } from './types.ts';

const g = globalThis as unknown as { __seeded?: boolean };

const PLAN: { niche: string; cart: CartLine[]; status: OrderStatus; name: string; phone: string; gov: string; type: 'new' | 'repeat'; hoursAgo: number }[] = [
  { niche: 'umrah', cart: [{ kind: 'bundle', id: 'umrah_kit_women', variant: '3', qty: 1 }], status: 'delivered', name: 'دينا', phone: '01011110001', gov: 'الجيزة', type: 'new', hoursAgo: 40 },
  { niche: 'umrah', cart: [{ kind: 'item', slug: 'black-nada-abaya', variant: '2', qty: 1 }], status: 'delivered', name: 'رحاب', phone: '01211110002', gov: 'القاهرة', type: 'repeat', hoursAgo: 30 },
  { niche: 'umrah', cart: [{ kind: 'item', slug: 'two-layer-niqab-black', variant: 'مقاس واحد', qty: 2 }], status: 'picked', name: 'آية', phone: '01111110003', gov: 'المنصورة', type: 'new', hoursAgo: 20 },
  { niche: 'umrah', cart: [{ kind: 'item', slug: 'cotton-ihram-2pc', variant: 'L', qty: 1 }], status: 'confirmed', name: 'أم يوسف', phone: '01511110004', gov: 'أسيوط', type: 'new', hoursAgo: 5 },
  { niche: 'umrah', cart: [{ kind: 'item', slug: 'chiffon-hijab-sand', variant: 'مقاس واحد', qty: 2 }], status: 'refused', name: 'شيماء', phone: '01011110005', gov: 'طنطا', type: 'new', hoursAgo: 50 },
  { niche: 'umrah', cart: [{ kind: 'item', slug: 'crepe-umrah-abaya-beige', variant: '1', qty: 1 }], status: 'awaiting_confirm', name: 'ريم', phone: '01011110006', gov: 'القاهرة', type: 'new', hoursAgo: 1 },
  { niche: 'coffee', cart: [{ kind: 'bundle', id: 'discovery_box', variant: 'مطحون فلتر', qty: 1 }], status: 'delivered', name: 'كريم', phone: '01011110007', gov: 'القاهرة', type: 'new', hoursAgo: 26 },
  { niche: 'coffee', cart: [{ kind: 'item', slug: 'brazil-espresso-blend-250g', variant: 'مطحون اسبريسو', qty: 2 }], status: 'accepted', name: 'عمر', phone: '01211110008', gov: 'الإسكندرية', type: 'repeat', hoursAgo: 8 },
];

export function seedDemoOrders() {
  if (process.env.NODE_ENV === 'production' || dbEnabled() || g.__seeded || allOrders().length) return;
  g.__seeded = true;
  for (const p of PLAN) {
    const cfg = getNiche(p.niche);
    if (!cfg) continue;
    const q = quote(cfg, p.cart, { isFirstOrder: p.type === 'new', walletBalance: 0, useWallet: false });
    const o: Order = saveOrder({ niche: p.niche, status: p.status, type: p.type, payment: 'cod', cart: p.cart, quote: q, customer: { name: p.name, phone: p.phone, governorate: p.gov, area: '—', address: 'عنوان تجريبي', landmark: '' } });
    o.createdAt = new Date(Date.now() - p.hoursAgo * 36e5).toISOString();
    const part = { delivered: 'handed', picked: 'handed', accepted: 'accepted', refused: 'handed' }[p.status as string] as Order['sellerState'][string] | undefined;
    if (part) for (const s of Object.keys(o.sellerState)) o.sellerState[s] = part;
    if (p.status === 'delivered') o.deliveredAt = new Date(Date.now() - (p.hoursAgo - 20) * 36e5).toISOString();
  }
}
