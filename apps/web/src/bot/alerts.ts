// Team alerts on Telegram (through the seller bot), by role:
//  - ADMIN_TELEGRAM_CHAT_IDS: everything: orders and every step after, abandoned carts, and the
//    seller bot (someone opens it, applies, sends a product).
//  - TEAM_TELEGRAM_CHAT_IDS: order follow-up only: new orders, every step after, abandoned carts.
//    An entry can be limited to one store: "coffee:1982483835" gets Cairo Roast only;
//    a plain number gets every store.
import { getNiche } from '../lib/niches.ts';
import { utmLabel, type Order } from '../lib/orders.ts';
import type { Outgoing } from './types.ts';

/** Team chat numbers. Separated by English or Arabic commas (، from an Arabic keyboard), semicolons or spaces; Arabic digits work too. */
export const parseChatIds = (raw: string | undefined) => (raw ?? '')
  .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
  .split(/[\s,،;]+/)
  .map((x) => Number(x.trim()))
  .filter((x) => Number.isSafeInteger(x) && x !== 0);
export const adminChats = () => parseChatIds(process.env.ADMIN_TELEGRAM_CHAT_IDS);
export const adminAlerts = (texts: string[]): Outgoing[] => texts.flatMap((text) => adminChats().map((chatId) => ({ chatId, text })));

/** Order-team entries: { chatId, niche? } from "coffee:1982483835, 555". */
export function teamEntries(raw = process.env.TEAM_TELEGRAM_CHAT_IDS): { chatId: number; niche?: string }[] {
  return (raw ?? '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).split(/[\s,،;]+/).flatMap((x) => {
    const m = x.trim().match(/^(?:([a-z][a-z0-9_-]*):)?(-?\d+)$/i);
    const id = m ? Number(m[2]) : NaN;
    return m && Number.isSafeInteger(id) && id !== 0 ? [{ chatId: id, ...(m[1] ? { niche: m[1].toLowerCase() } : {}) }] : [];
  });
}

/** Who hears about a store's orders and abandoned carts: the admins, plus the order team for that store. */
export const orderChats = (niche: string) => [...new Set([...adminChats(), ...teamEntries().filter((t) => !t.niche || t.niche === niche).map((t) => t.chatId)])];
export const orderAlerts = (niche: string, texts: string[]): Outgoing[] => texts.flatMap((text) => orderChats(niche).map((chatId) => ({ chatId, text })));

export type OrderEvent = 'new' | 'confirmed' | 'accepted' | 'rejected' | 'picked' | 'delivered' | 'refused' | 'cancelled';

const egp = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج`;
const SOURCE: Record<string, string> = { whatsapp: 'واتساب', phone: 'تليفون', instagram: 'رسايل إنستجرام', facebook: 'رسايل فيسبوك', other: 'يدوي' };
const STEP: Record<Exclude<OrderEvent, 'new'>, string> = {
  confirmed: '☑️ اتأكد واتبعت للبائع',
  accepted: '✅ البائع قبل الطلب',
  rejected: '❌ البائع قال مش متاح: كلم العميل',
  picked: '🚚 مع المندوب',
  delivered: '🎉 اتسلم للعميل',
  refused: '↩️ العميل رفض الاستلام',
  cancelled: '🚫 اتلغى',
};

/** The alert for an order event (nothing when no team chat is set). `by` says who did it (a seller, the admin). */
export function orderAlert(o: Order, event: OrderEvent, by?: string): Outgoing[] {
  if (!orderChats(o.niche).length) return [];
  const cfg = getNiche(o.niche);
  const brand = cfg?.brand.nameAr ?? o.niche;
  const link = cfg?.brand.domain ? `\nhttps://${cfg.brand.domain}/admin/orders/${o.id}` : '';
  if (event !== 'new') return orderAlerts(o.niche, [`${STEP[event]} · طلب #${o.id} · ${brand}${by ? `\n(${by})` : ''}\n${o.customer.name} · ${egp(o.quote.total)}${link}`]);
  const q = o.quote;
  const from = o.source && o.source !== 'web' ? `مصدر: ${SOURCE[o.source] ?? o.source} (اتسجل من الأدمن)` : o.utm ? `📣 جه من: ${utmLabel(o.utm)}` : 'مصدر: الموقع';
  return orderAlerts(o.niche, [[
    `🛒 طلب جديد #${o.id} · ${brand}`,
    ...o.items.map((i) => `• ${i.name} · ${i.variant} × ${i.qty}`),
    `💰 ${egp(q.total)} · ${o.payment === 'cod' ? 'كاش عند الاستلام' : 'إنستاباي'}${q.shipping === 0 && (q.shippingWaived ?? 0) > 0 ? ' · شحن مجاني' : ''}${o.promoCode ? ` · كود ${o.promoCode}` : ''}`,
    `👤 ${o.customer.name} · ${o.customer.phone} · ${o.customer.governorate}${o.type === 'repeat' ? ' · عميل راجع' : ' · عميل جديد'}`,
    from,
  ].join('\n') + link]);
}
